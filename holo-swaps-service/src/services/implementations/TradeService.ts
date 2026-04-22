import { Trade, TradeStatus, CardStatus, NotificationType, DisputeStatus } from "@prisma/client";
import { prisma } from "@/config/prisma";
import { TradeRepository } from "@/repositories/implementations/TradeRepository";
import { PricingService } from "./PricingService";
import { StripeService } from "./StripeService";
import { NotificationService } from "./NotificationService";
import { TrackingService } from "./TrackingService";
import { EmailService } from "./EmailService";
import { config } from "@/config";
import {
  ITradeService,
  ProposeTradeData,
  CounterOfferData,
  TrackingData,
  VerifyCardsData,
} from "@/services/interfaces/ITradeService";
import { PaginatedResult, PaginationParams, TradeMatch } from "@/types";
import { ApiError } from "@/utils/ApiError";
import { logger } from "@/utils/logger";
import { recalculateTier } from "@/utils/tierUtils";

export class TradeService implements ITradeService {
  private tradeRepository: TradeRepository;
  private pricingService: PricingService;
  private stripeService: StripeService;
  private notificationService: NotificationService;
  private trackingService: TrackingService;
  private emailService: EmailService;

  constructor() {
    this.tradeRepository = new TradeRepository();
    this.pricingService = new PricingService();
    this.stripeService = new StripeService();
    this.emailService = new EmailService();
    this.notificationService = new NotificationService();
    this.trackingService = new TrackingService();
  }

  // ─── Helper: unlock a set of collection items ────────────────────────────
  private async unlockCards(collectionItemIds: string[]): Promise<void> {
    await prisma.userCollection.updateMany({
      where: { id: { in: collectionItemIds } },
      data: { status: CardStatus.AVAILABLE, lockedByTradeId: null },
    });
  }

  // ─── Helper: get all collection item IDs on a trade ──────────────────────
  private async getTradeItemIds(tradeId: string): Promise<string[]> {
    const items = await prisma.tradeItem.findMany({
      where: { tradeId },
      select: { collectionItemId: true },
    });
    return items.map((i) => i.collectionItemId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  async proposeTrade(data: ProposeTradeData): Promise<Trade> {
    if (data.proposerId === data.receiverId) {
      throw ApiError.badRequest("You cannot trade with yourself");
    }

    // Verify proposer owns those items and they are AVAILABLE
    const proposerItems = await prisma.userCollection.findMany({
      where: {
        id: { in: data.proposerCollectionItemIds },
        userId: data.proposerId,
        status: CardStatus.AVAILABLE,
      },
    });
    if (proposerItems.length !== data.proposerCollectionItemIds.length) {
      throw ApiError.badRequest("One or more of your cards are not available for trade");
    }

    // Verify receiver owns those items and they are AVAILABLE
    const receiverItems = await prisma.userCollection.findMany({
      where: {
        id: { in: data.receiverCollectionItemIds },
        userId: data.receiverId,
        status: CardStatus.AVAILABLE,
      },
    });
    if (receiverItems.length !== data.receiverCollectionItemIds.length) {
      throw ApiError.badRequest("One or more requested cards are not available for trade");
    }

    // Fetch market values for display — they do NOT force a cash requirement
    const priceBreakdown = await this.pricingService.calculateTradeDifference(
      data.proposerCollectionItemIds,
      data.receiverCollectionItemIds
    );

    // Either side can add cash — net determines who pays whom
    const proposerCashAdd = data.proposerCashAdd ?? 0;
    const receiverCashAdd = data.receiverCashAdd ?? 0;
    const netCash = proposerCashAdd - receiverCashAdd; // positive = proposer pays, negative = receiver pays
    const cashPayerId =
      netCash > 0 ? data.proposerId : netCash < 0 ? data.receiverId : undefined;

    // Create trade + lock all cards in one transaction
    const allItemIds = [
      ...data.proposerCollectionItemIds,
      ...data.receiverCollectionItemIds,
    ];

    const trade = await prisma.$transaction(async (tx) => {
      const tradeCode = await this.tradeRepository.generateTradeCode();

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const created = await tx.trade.create({
        data: {
          tradeCode,
          proposerId: data.proposerId,
          receiverId: data.receiverId,
          proposerMarketValue: priceBreakdown.proposerTotalValue,
          receiverMarketValue: priceBreakdown.receiverTotalValue,
          cashDifference: Math.abs(netCash),
          cashPayerId,
          expiresAt,
          items: {
            create: [
              ...data.proposerCollectionItemIds.map((id) => ({
                collectionItemId: id,
                ownedByProposer: true,
                valueAtTimeOfTrade: proposerItems.find((i) => i.id === id)?.currentMarketValue,
              })),
              ...data.receiverCollectionItemIds.map((id) => ({
                collectionItemId: id,
                ownedByProposer: false,
                valueAtTimeOfTrade: receiverItems.find((i) => i.id === id)?.currentMarketValue,
              })),
            ],
          },
        },
      });

      // Lock all cards
      await tx.userCollection.updateMany({
        where: { id: { in: allItemIds } },
        data: { status: CardStatus.IN_TRADE, lockedByTradeId: created.id },
      });

      return created;
    });

    logger.info("Trade proposed", {
      tradeId: trade.id,
      tradeCode: trade.tradeCode,
      proposerId: data.proposerId,
      receiverId: data.receiverId,
    });

    // Notify receiver
    const proposer = await prisma.user.findUnique({ where: { id: data.proposerId } });
    const receiver = await prisma.user.findUnique({ where: { id: data.receiverId } });
    await this.notificationService.notify({
      userId: data.receiverId,
      type: NotificationType.TRADE_PROPOSED,
      title: "New trade offer",
      body: `${proposer?.username ?? "Someone"} wants to trade with you`,
      data: { tradeId: trade.id, tradeCode: trade.tradeCode },
    });

    if (receiver?.email && receiver.emailOnTradeProposed) {
      const tradeUrl = `${config.frontend.url}/trades/${trade.id}`;
      this.emailService.sendTradeProposedEmail(receiver.email, receiver.username, proposer?.username ?? "Someone", trade.tradeCode, tradeUrl);
    }

    return this.tradeRepository.findById(trade.id) as Promise<Trade>;
  }

  // ─────────────────────────────────────────────────────────────────────────
  async counterOffer(tradeId: string, userId: string, data: CounterOfferData): Promise<Trade> {
    const trade = await this.tradeRepository.findById(tradeId);
    if (!trade) throw ApiError.notFound("Trade not found");

    if (trade.proposerId !== userId && trade.receiverId !== userId) {
      throw ApiError.forbidden("You are not part of this trade");
    }

    if (trade.status !== TradeStatus.PROPOSED && trade.status !== TradeStatus.COUNTERED) {
      throw ApiError.badRequest("This trade cannot be countered at this stage");
    }

    const isProposer = userId === trade.proposerId;

    // The countering user sets their own side's card list and cash
    const newMyItemIds = isProposer ? data.proposerCollectionItemIds : data.receiverCollectionItemIds;
    const myCashAdd = isProposer ? (data.proposerCashAdd ?? 0) : (data.receiverCashAdd ?? 0);

    // Current items for my side
    const tradeItems = trade.items as any[];
    const currentMyItems = tradeItems.filter((i) => i.ownedByProposer === isProposer);
    const currentMyItemIds = currentMyItems.map((i: any) => i.collectionItemId as string);

    let toRemoveIds: string[] = [];
    let toAddIds: string[] = [];
    let newMarketValue = isProposer ? trade.proposerMarketValue : trade.receiverMarketValue;

    if (newMyItemIds && newMyItemIds.length > 0) {
      if (newMyItemIds.length === 0) {
        throw ApiError.badRequest("You must include at least one card on your side");
      }

      toRemoveIds = currentMyItemIds.filter((id) => !newMyItemIds.includes(id));
      toAddIds = newMyItemIds.filter((id) => !currentMyItemIds.includes(id));

      // Validate new cards belong to user and are available
      if (toAddIds.length > 0) {
        const validNewItems = await prisma.userCollection.findMany({
          where: { id: { in: toAddIds }, userId, status: CardStatus.AVAILABLE },
        });
        if (validNewItems.length !== toAddIds.length) {
          throw ApiError.badRequest("One or more of your cards are not available for trade");
        }
      }

      // Recalculate market value from the full new item set
      const allMyNewItems = await prisma.userCollection.findMany({
        where: { id: { in: newMyItemIds } },
        select: { currentMarketValue: true },
      });
      newMarketValue = allMyNewItems.reduce((sum, i) => sum + (i.currentMarketValue ?? 0), 0);
    }

    // The counter offer replaces cash terms: countering user sets their own cash,
    // other side's cash is cleared to 0 (they can counter again if they want to add cash)
    const proposerCashAdd = isProposer ? myCashAdd : 0;
    const receiverCashAdd = isProposer ? 0 : myCashAdd;
    const netCash = proposerCashAdd - receiverCashAdd;
    const cashPayerId = netCash > 0 ? trade.proposerId : netCash < 0 ? trade.receiverId : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.tradeOffer.create({
        data: {
          tradeId,
          offeredById: userId,
          cashAdjustment: netCash,
          message: data.message,
        },
      });

      await tx.trade.update({
        where: { id: tradeId },
        data: {
          cashDifference: Math.abs(netCash),
          cashPayerId: cashPayerId ?? null,
          status: TradeStatus.COUNTERED,
          proposerMarketValue: isProposer ? newMarketValue : trade.proposerMarketValue,
          receiverMarketValue: isProposer ? trade.receiverMarketValue : newMarketValue,
        },
      });

      if (newMyItemIds && newMyItemIds.length > 0) {
        // Unlock and delete removed items
        if (toRemoveIds.length > 0) {
          await tx.userCollection.updateMany({
            where: { id: { in: toRemoveIds } },
            data: { status: CardStatus.AVAILABLE, lockedByTradeId: null },
          });
          await tx.tradeItem.deleteMany({
            where: { tradeId, collectionItemId: { in: toRemoveIds } },
          });
        }

        // Lock and create new items
        if (toAddIds.length > 0) {
          const newItemValues = await tx.userCollection.findMany({
            where: { id: { in: toAddIds } },
            select: { id: true, currentMarketValue: true },
          });
          await tx.userCollection.updateMany({
            where: { id: { in: toAddIds } },
            data: { status: CardStatus.IN_TRADE, lockedByTradeId: tradeId },
          });
          await tx.tradeItem.createMany({
            data: toAddIds.map((id) => ({
              tradeId,
              collectionItemId: id,
              ownedByProposer: isProposer,
              valueAtTimeOfTrade: newItemValues.find((i) => i.id === id)?.currentMarketValue,
            })),
          });
        }
      }
    });

    const updated = await this.tradeRepository.findById(tradeId) as Trade;

    // Notify the other party
    const otherId = userId === trade.proposerId ? trade.receiverId : trade.proposerId;
    const actor = await prisma.user.findUnique({ where: { id: userId } });
    const other = await prisma.user.findUnique({ where: { id: otherId } });
    await this.notificationService.notify({
      userId: otherId,
      type: NotificationType.TRADE_COUNTERED,
      title: "Trade countered",
      body: `${actor?.username ?? "Your trade partner"} sent a counter offer`,
      data: { tradeId, tradeCode: trade.tradeCode },
    });

    if (other?.email && other.emailOnTradeCountered) {
      const tradeUrl = `${config.frontend.url}/trades/${tradeId}`;
      this.emailService.sendTradeCounterOfferEmail(other.email, other.username, actor?.username ?? "Your trade partner", trade.tradeCode, tradeUrl);
    }

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  async acceptTrade(tradeId: string, userId: string): Promise<Trade> {
    const trade = await this.tradeRepository.findById(tradeId);
    if (!trade) throw ApiError.notFound("Trade not found");

    if (trade.receiverId !== userId) {
      throw ApiError.forbidden("Only the receiver can accept a trade");
    }

    if (trade.status !== TradeStatus.PROPOSED && trade.status !== TradeStatus.COUNTERED) {
      throw ApiError.badRequest("This trade cannot be accepted at this stage");
    }

    // High-value trades (combined card value > $500) require both parties to be identity verified
    const HIGH_VALUE_THRESHOLD_USD = 500;
    const combinedValue = trade.proposerMarketValue + trade.receiverMarketValue;
    if (combinedValue > HIGH_VALUE_THRESHOLD_USD) {
      const [proposer, receiver] = await Promise.all([
        prisma.user.findUnique({ where: { id: trade.proposerId }, select: { isIdentityVerified: true } }),
        prisma.user.findUnique({ where: { id: trade.receiverId }, select: { isIdentityVerified: true } }),
      ]);
      if (!proposer?.isIdentityVerified || !receiver?.isIdentityVerified) {
        throw ApiError.badRequest(
          `This trade exceeds $${HIGH_VALUE_THRESHOLD_USD} in card value. Both parties must complete identity verification before accepting.`
        );
      }
    }

    // Platform fee: 2.5% of the average card value across both sides
    const PLATFORM_FEE_PERCENT = 0.025;
    const avgTradeValue = (trade.proposerMarketValue + trade.receiverMarketValue) / 2;
    const platformFeeAmount = Math.round(avgTradeValue * PLATFORM_FEE_PERCENT * 100); // cents

    // Create Stripe PaymentIntent if there is a cash difference OR a platform fee to collect
    if (trade.cashDifference > 0 && trade.cashPayerId) {
      const payerId = trade.cashPayerId;
      const payeeId = payerId === trade.proposerId ? trade.receiverId : trade.proposerId;

      const [payer, payee] = await Promise.all([
        prisma.user.findUnique({ where: { id: payerId } }),
        prisma.user.findUnique({ where: { id: payeeId } }),
      ]);

      if (!payer?.stripeCustomerId || !payee?.stripeAccountId) {
        throw ApiError.badRequest(
          "Both parties must have payment accounts set up to complete this trade"
        );
      }

      const cashAmountCents = Math.round(trade.cashDifference * 100);

      const paymentIntent = await this.stripeService.createPaymentIntent({
        // Total amount = cash difference + platform fee (payer covers both)
        amount: cashAmountCents + platformFeeAmount,
        platformFeeAmount,
        currency: "usd",
        customerId: payer.stripeCustomerId,
        destinationAccountId: payee.stripeAccountId,
        tradeId: trade.id,
        description: `Trade ${trade.tradeCode} — $${trade.cashDifference.toFixed(2)} cash + $${(platformFeeAmount / 100).toFixed(2)} platform fee`,
      });

      await this.tradeRepository.updatePaymentIntent(trade.id, paymentIntent.id);
    }

    const updated = await this.tradeRepository.updateStatus(tradeId, TradeStatus.ACCEPTED);

    // Notify proposer
    const receiver = await prisma.user.findUnique({ where: { id: userId } });
    const proposer = await prisma.user.findUnique({ where: { id: trade.proposerId } });
    await this.notificationService.notify({
      userId: trade.proposerId,
      type: NotificationType.TRADE_ACCEPTED,
      title: "Trade accepted!",
      body: `${receiver?.username ?? "Your trade partner"} accepted your trade`,
      data: { tradeId, tradeCode: trade.tradeCode },
    });

    if (proposer?.email && proposer.emailOnTradeAccepted) {
      const tradeUrl = `${config.frontend.url}/trades/${tradeId}`;
      this.emailService.sendTradeAcceptedEmail(proposer.email, proposer.username, receiver?.username ?? "Your trade partner", trade.tradeCode, tradeUrl);
    }

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  async declineTrade(tradeId: string, userId: string): Promise<Trade> {
    const trade = await this.tradeRepository.findById(tradeId);
    if (!trade) throw ApiError.notFound("Trade not found");

    if (trade.receiverId !== userId) {
      throw ApiError.forbidden("Only the receiver can decline a trade");
    }

    const itemIds = await this.getTradeItemIds(tradeId);
    const updated = await this.tradeRepository.updateStatus(tradeId, TradeStatus.CANCELLED);
    await this.unlockCards(itemIds);

    // Notify proposer
    const receiver = await prisma.user.findUnique({ where: { id: userId } });
    const proposer = await prisma.user.findUnique({ where: { id: trade.proposerId } });
    await this.notificationService.notify({
      userId: trade.proposerId,
      type: NotificationType.TRADE_CANCELLED,
      title: "Trade declined",
      body: `${receiver?.username ?? "Your trade partner"} declined your trade offer`,
      data: { tradeId, tradeCode: trade.tradeCode },
    });

    if (proposer?.email && proposer.emailOnTradeDeclined) {
      this.emailService.sendTradeDeclinedEmail(proposer.email, proposer.username, receiver?.username ?? "Your trade partner", trade.tradeCode);
    }

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  async cancelTrade(tradeId: string, userId: string): Promise<Trade> {
    const trade = await this.tradeRepository.findById(tradeId);
    if (!trade) throw ApiError.notFound("Trade not found");

    if (trade.proposerId !== userId && trade.receiverId !== userId) {
      throw ApiError.forbidden("You are not part of this trade");
    }

    const cancellableStatuses: TradeStatus[] = [
      TradeStatus.PROPOSED,
      TradeStatus.COUNTERED,
      TradeStatus.ACCEPTED,
    ];

    if (!cancellableStatuses.includes(trade.status)) {
      throw ApiError.badRequest(
        "This trade cannot be cancelled — cards are already in transit"
      );
    }

    if (trade.stripePaymentIntentId) {
      await this.stripeService.cancelPaymentIntent(trade.stripePaymentIntentId);
    }

    const itemIds = await this.getTradeItemIds(tradeId);
    const updated = await this.tradeRepository.updateStatus(tradeId, TradeStatus.CANCELLED);
    await this.unlockCards(itemIds);

    // Notify the other party
    const otherId = userId === trade.proposerId ? trade.receiverId : trade.proposerId;
    const actor = await prisma.user.findUnique({ where: { id: userId } });
    const other = await prisma.user.findUnique({ where: { id: otherId } });
    await this.notificationService.notify({
      userId: otherId,
      type: NotificationType.TRADE_CANCELLED,
      title: "Trade cancelled",
      body: `${actor?.username ?? "Your trade partner"} cancelled the trade`,
      data: { tradeId, tradeCode: trade.tradeCode },
    });

    if (other?.email && other.emailOnTradeCancelled) {
      const tradeUrl = `${config.frontend.url}/trades/${tradeId}`;
      this.emailService.sendTradeCancelledEmail(other.email, other.username, actor?.username ?? "Your trade partner", trade.tradeCode, tradeUrl);
    }

    return updated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  async submitTrackingNumber(
    tradeId: string,
    userId: string,
    data: TrackingData
  ): Promise<Trade> {
    const trade = await this.tradeRepository.findById(tradeId);
    if (!trade) throw ApiError.notFound("Trade not found");

    if (trade.proposerId !== userId && trade.receiverId !== userId) {
      throw ApiError.forbidden("You are not part of this trade");
    }

    if (trade.status !== TradeStatus.ACCEPTED) {
      throw ApiError.badRequest("Trade must be accepted before submitting tracking");
    }

    // The receiver of the shipment is the admin warehouse (represented by the other user here)
    const receiverId = userId === trade.proposerId ? trade.receiverId : trade.proposerId;

    // Prevent duplicate tracking submissions
    const existing = await prisma.shipment.findFirst({
      where: { tradeId, senderId: userId, direction: "INBOUND" },
    });
    if (existing) {
      throw ApiError.conflict("You have already submitted tracking for this trade");
    }

    const shipment = await prisma.shipment.create({
      data: {
        tradeId,
        senderId: userId,
        receiverId,
        trackingNumber: data.trackingNumber,
        carrier: data.carrier,
        direction: "INBOUND",
        isInsured: data.isInsured,
        insuredValue: data.insuredValue,
        status: "SHIPPED",
        shippedAt: new Date(),
      },
    });

    // Register with AfterShip so delivery is detected automatically
    await this.trackingService.registerTracking({
      trackingNumber: data.trackingNumber,
      carrier: data.carrier,
      shipmentId: shipment.id,
      tradeId,
    });

    // Notify other party
    const sender = await prisma.user.findUnique({ where: { id: userId } });
    await this.notificationService.notify({
      userId: receiverId,
      type: NotificationType.SHIPMENT_UPDATED,
      title: "Package shipped",
      body: `${sender?.username ?? "Your trade partner"} has shipped their cards`,
      data: { tradeId, tradeCode: trade.tradeCode },
    });

    // Both parties submitted → BOTH_SHIPPED
    const inboundCount = await prisma.shipment.count({
      where: { tradeId, direction: "INBOUND" },
    });

    if (inboundCount >= 2) {
      return this.tradeRepository.updateStatus(tradeId, TradeStatus.BOTH_SHIPPED);
    }

    return this.tradeRepository.findById(tradeId) as Promise<Trade>;
  }

  // ─────────────────────────────────────────────────────────────────────────
  async confirmReceipt(tradeId: string, userId: string): Promise<Trade> {
    const trade = await this.tradeRepository.findById(tradeId);
    if (!trade) throw ApiError.notFound("Trade not found");

    if (trade.proposerId !== userId && trade.receiverId !== userId) {
      throw ApiError.forbidden("You are not part of this trade");
    }

    const receiptStatuses: TradeStatus[] = [
      TradeStatus.BOTH_SHIPPED,
      TradeStatus.A_RECEIVED,
      TradeStatus.B_RECEIVED,
    ];
    if (!receiptStatuses.includes(trade.status)) {
      throw ApiError.badRequest("Trade is not in a shippable state");
    }

    // Mark the inbound shipment for this user's counterpart as delivered
    await prisma.shipment.updateMany({
      where: { tradeId, receiverId: userId, direction: "INBOUND" },
      data: { status: "DELIVERED", deliveredAt: new Date() },
    });

    const isProposer = userId === trade.proposerId;

    let nextStatus: TradeStatus;
    if (trade.status === TradeStatus.BOTH_SHIPPED) {
      nextStatus = isProposer ? TradeStatus.A_RECEIVED : TradeStatus.B_RECEIVED;
    } else if (
      (trade.status === TradeStatus.A_RECEIVED && !isProposer) ||
      (trade.status === TradeStatus.B_RECEIVED && isProposer)
    ) {
      nextStatus = TradeStatus.BOTH_RECEIVED;
    } else {
      // Already confirmed by this party — idempotent
      return this.tradeRepository.findById(tradeId) as Promise<Trade>;
    }

    return this.tradeRepository.updateStatus(tradeId, nextStatus);
  }

  // ─────────────────────────────────────────────────────────────────────────
  async getUserTrades(
    userId: string,
    params: PaginationParams & { status?: TradeStatus }
  ): Promise<PaginatedResult<Trade>> {
    return this.tradeRepository.findByUserId(userId, params);
  }

  async getTradeById(tradeId: string, userId: string): Promise<Trade> {
    const trade = await this.tradeRepository.findById(tradeId);
    if (!trade) throw ApiError.notFound("Trade not found");

    if (trade.proposerId !== userId && trade.receiverId !== userId) {
      throw ApiError.forbidden("You are not part of this trade");
    }

    return trade;
  }

  // ─────────────────────────────────────────────────────────────────────────
  async findMatches(userId: string): Promise<TradeMatch[]> {
    const [userWants, userCollection] = await Promise.all([
      prisma.userWant.findMany({
        where: { userId, isFulfilled: false },
        include: { card: true },
      }),
      prisma.userCollection.findMany({
        where: { userId, status: CardStatus.AVAILABLE },
        include: { card: true, media: { orderBy: { order: "asc" }, take: 1 } },
      }),
    ]);

    if (userWants.length === 0 || userCollection.length === 0) return [];

    const wantedCardIds = userWants.map((w) => w.cardId);
    const ownedCardIds = userCollection.map((c) => c.cardId);

    const potentialMatches = await prisma.user.findMany({
      where: {
        id: { not: userId },
        isBanned: false,
        collection: {
          some: { cardId: { in: wantedCardIds }, status: CardStatus.AVAILABLE },
        },
        wants: {
          some: { cardId: { in: ownedCardIds }, isFulfilled: false },
        },
      },
      include: {
        collection: {
          where: { cardId: { in: wantedCardIds }, status: CardStatus.AVAILABLE },
          include: { card: true, media: { orderBy: { order: "asc" }, take: 1 } },
        },
        wants: {
          where: { cardId: { in: ownedCardIds }, isFulfilled: false },
          include: { card: true },
        },
      },
    });

    return potentialMatches
      .map((match) => {
        const theyHave = match.collection.map((item) => ({
          collectionItemId: item.id,
          cardName: item.card.name,
          setName: item.card.setName,
          condition: item.condition,
          marketValue: item.currentMarketValue ?? 0,
          photos: item.media.map((m) => m.url),
        }));

        const youHave = userCollection
          .filter((item) => match.wants.some((w) => w.cardId === item.cardId))
          .map((item) => ({
            collectionItemId: item.id,
            cardName: item.card.name,
            setName: item.card.setName,
            condition: item.condition,
            marketValue: item.currentMarketValue ?? 0,
            photos: item.media.map((m) => m.url),
          }));

        const theyHaveValue = theyHave.reduce((s, i) => s + i.marketValue, 0);
        const youHaveValue = youHave.reduce((s, i) => s + i.marketValue, 0);

        return {
          userId: match.id,
          username: match.username,
          avatarUrl: match.avatarUrl,
          theyHave,
          youHave,
          matchScore: theyHave.length + youHave.length,
          valueDifference: Math.abs(theyHaveValue - youHaveValue),
          reputationScore: match.reputationScore,
          tradeCount: match.tradeCount,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  // ─── Admin methods ────────────────────────────────────────────────────────

  async verifyCards(tradeId: string, adminId: string, data: VerifyCardsData): Promise<Trade> {
    const trade = await this.tradeRepository.findById(tradeId);
    if (!trade) throw ApiError.notFound("Trade not found");

    if (trade.status !== TradeStatus.BOTH_RECEIVED) {
      throw ApiError.badRequest("Both cards must be received before verification");
    }

    // Create verification record + attach media
    const verification = await prisma.cardVerification.create({
      data: {
        tradeId,
        collectionItemId: data.collectionItemId,
        cardOwnerId: data.cardOwnerId,
        conditionConfirmed: data.conditionConfirmed,
        conditionNotes: data.conditionNotes,
        isAuthentic: data.isAuthentic,
        verifiedById: adminId,
        submittedAt: new Date(),
        verifiedAt: new Date(),
      },
    });

    if (data.mediaUrls.length > 0) {
      await prisma.cardMedia.createMany({
        data: data.mediaUrls.map((url, i) => ({
          verificationId: verification.id,
          collectionItemId: data.collectionItemId,
          type: "PHOTO" as const,
          angle: "OVERVIEW" as const,
          url,
          order: i,
        })),
      });
    }

    const verifications = await prisma.cardVerification.findMany({ where: { tradeId } });

    // Check if this verification failed
    const thisFailed = data.isAuthentic === false || data.conditionConfirmed === false;

    if (thisFailed) {
      return this.handleVerificationFailure(trade, adminId, data);
    }

    // All verifications passed — move to VERIFIED
    if (verifications.length >= 2) {
      return this.tradeRepository.updateStatus(tradeId, TradeStatus.VERIFIED);
    }

    return this.tradeRepository.findById(tradeId) as Promise<Trade>;
  }

  // Flat fee charged to the at-fault party to cover both return shipments ($24 = 2 × ~$12 labels)
  private static readonly RETURN_SHIPPING_FEE_CENTS = 2400;

  /**
   * Called when a card fails verification. Handles the full failure flow:
   * - Builds a human-readable reason for both parties
   * - Creates a Dispute record in UNDER_REVIEW
   * - Schedules return shipments for both sides
   * - Cancels the Stripe trade PaymentIntent (cash-on-top + 2.5% fee — neither collected)
   * - Bills the at-fault party a flat $24 return shipping fee via Stripe Invoice
   * - Notifies both parties; at-fault party gets the invoice payment link
   */
  private async handleVerificationFailure(
    trade: Trade,
    adminId: string,
    failedVerification: VerifyCardsData
  ): Promise<Trade> {
    const tradeId = trade.id;

    // Build a clear failure reason
    const failureReasons: string[] = [];
    if (failedVerification.isAuthentic === false) {
      failureReasons.push("card appears to be counterfeit or not authentic");
    }
    if (failedVerification.conditionConfirmed === false) {
      failureReasons.push(
        `card condition does not match what was listed${
          failedVerification.conditionNotes ? ` (${failedVerification.conditionNotes})` : ""
        }`
      );
    }
    const reason = failureReasons.join("; ");
    const adminNotes = `Verification failed for card ${failedVerification.collectionItemId}: ${reason}`;

    // Identify the at-fault party and the innocent party
    const ownerIsProposer = failedVerification.cardOwnerId === trade.proposerId;
    const faultPartyId = ownerIsProposer ? trade.proposerId : trade.receiverId;
    const innocentPartyId = ownerIsProposer ? trade.receiverId : trade.proposerId;

    await prisma.$transaction(async (tx) => {
      await tx.trade.update({
        where: { id: tradeId },
        data: { status: TradeStatus.DISPUTED, adminNotes },
      });

      await tx.dispute.upsert({
        where: { tradeId },
        create: {
          tradeId,
          openedById: adminId,
          reason: "Card failed verification",
          details: adminNotes,
          status: DisputeStatus.UNDER_REVIEW,
        },
        update: {
          details: adminNotes,
          status: DisputeStatus.UNDER_REVIEW,
        },
      });

      // Return shipments — admin is the sender for both (platform ships them back)
      await tx.shipment.createMany({
        data: [
          {
            tradeId,
            senderId: adminId,
            receiverId: trade.proposerId,
            direction: "OUTBOUND",
            status: "PENDING",
          },
          {
            tradeId,
            senderId: adminId,
            receiverId: trade.receiverId,
            direction: "OUTBOUND",
            status: "PENDING",
          },
        ],
      });
    });

    // Cancel the trade PaymentIntent — releases the hold, nothing is charged
    if (trade.stripePaymentIntentId) {
      try {
        await this.stripeService.cancelPaymentIntent(trade.stripePaymentIntentId);
        logger.info("PaymentIntent cancelled on verification failure", {
          tradeId,
          paymentIntentId: trade.stripePaymentIntentId,
        });
      } catch (err) {
        logger.error("Failed to cancel PaymentIntent — manual action needed", {
          tradeId,
          paymentIntentId: trade.stripePaymentIntentId,
          err,
        });
      }
    }

    // Charge the at-fault party a flat return shipping fee via Stripe Invoice
    let invoicePaymentUrl: string | undefined;
    const faultUser = await prisma.user.findUnique({
      where: { id: faultPartyId },
      select: { stripeCustomerId: true, email: true },
    });

    if (faultUser?.stripeCustomerId) {
      try {
        const invoice = await this.stripeService.createReturnShippingInvoice(
          faultUser.stripeCustomerId,
          TradeService.RETURN_SHIPPING_FEE_CENTS,
          trade.tradeCode
        );
        invoicePaymentUrl = invoice.hostedInvoiceUrl;
        logger.info("Return shipping invoice created for at-fault party", {
          tradeId,
          faultPartyId,
          invoiceId: invoice.invoiceId,
        });
      } catch (err) {
        // Non-fatal — log for manual collection, don't block the rest of the flow
        logger.error("Failed to create return shipping invoice — manual billing needed", {
          tradeId,
          faultPartyId,
          err,
        });
      }
    } else {
      logger.warn("At-fault party has no Stripe customer — return shipping fee requires manual billing", {
        tradeId,
        faultPartyId,
      });
    }

    // Notify at-fault party — include payment link if invoice was created
    await this.notificationService.notify({
      userId: faultPartyId,
      type: NotificationType.DISPUTE_OPENED,
      title: "Trade cancelled — card issue found",
      body: `Your card in trade ${trade.tradeCode} did not pass our verification: ${reason}. The trade has been cancelled and your card will be returned. A $${(TradeService.RETURN_SHIPPING_FEE_CENTS / 100).toFixed(2)} return shipping fee has been invoiced to you — please pay within 7 days.${invoicePaymentUrl ? " Click the link in your email to pay." : ""}`,
      data: { tradeId, tradeCode: trade.tradeCode, reason, invoicePaymentUrl },
    });

    // Notify innocent party — no charge, card coming back
    await this.notificationService.notify({
      userId: innocentPartyId,
      type: NotificationType.DISPUTE_OPENED,
      title: "Trade cancelled — card issue found",
      body: `Trade ${trade.tradeCode} was cancelled because the other party's card did not pass our verification: ${reason}. No charge has been made to you. Your card will be returned.`,
      data: { tradeId, tradeCode: trade.tradeCode, reason },
    });

    logger.warn("Trade failed verification — return shipments created, at-fault party invoiced", {
      tradeId,
      tradeCode: trade.tradeCode,
      reason,
      faultPartyId,
      adminId,
    });

    return this.tradeRepository.findById(tradeId) as Promise<Trade>;
  }

  // ─────────────────────────────────────────────────────────────────────────
  async completeTrade(tradeId: string, adminId: string): Promise<Trade> {
    const trade = await this.tradeRepository.findById(tradeId);
    if (!trade) throw ApiError.notFound("Trade not found");

    if (trade.status !== TradeStatus.VERIFIED) {
      throw ApiError.badRequest("Trade must be verified before completion");
    }

    if (trade.stripePaymentIntentId) {
      await this.stripeService.capturePaymentIntent(trade.stripePaymentIntentId);
    }

    // Fetch trade items for ownership transfer
    const tradeItems = await prisma.tradeItem.findMany({ where: { tradeId } });

    await prisma.$transaction(async (tx) => {
      for (const item of tradeItems) {
        const newOwnerId = item.ownedByProposer ? trade.receiverId : trade.proposerId;
        const oldOwnerId = item.ownedByProposer ? trade.proposerId : trade.receiverId;

        // Transfer ownership + unlock
        await tx.userCollection.update({
          where: { id: item.collectionItemId },
          data: {
            userId: newOwnerId,
            status: CardStatus.AVAILABLE,
            lockedByTradeId: null,
          },
        });

        // Record provenance
        await tx.cardOwnershipHistory.create({
          data: {
            collectionItemId: item.collectionItemId,
            fromUserId: oldOwnerId,
            toUserId: newOwnerId,
            tradeId,
          },
        });
      }

      // Increment trade counts
      await tx.user.updateMany({
        where: { id: { in: [trade.proposerId, trade.receiverId] } },
        data: { tradeCount: { increment: 1 } },
      });
    });

    const completed = await this.tradeRepository.updateStatus(tradeId, TradeStatus.COMPLETED);

    // Recalculate tiers for both parties
    const [updatedProposer, updatedReceiver] = await Promise.all([
      prisma.user.findUnique({ where: { id: trade.proposerId }, select: { tradeCount: true, reputationScore: true } }),
      prisma.user.findUnique({ where: { id: trade.receiverId }, select: { tradeCount: true, reputationScore: true } }),
    ]);
    await Promise.all([
      prisma.user.update({ where: { id: trade.proposerId }, data: { tier: recalculateTier(updatedProposer!.tradeCount, updatedProposer!.reputationScore) } }),
      prisma.user.update({ where: { id: trade.receiverId }, data: { tier: recalculateTier(updatedReceiver!.tradeCount, updatedReceiver!.reputationScore) } }),
    ]);

    // Notify both parties
    await this.notificationService.notifyMany([trade.proposerId, trade.receiverId], {
      type: NotificationType.TRADE_COMPLETED,
      title: "Trade completed!",
      body: `Your trade (${trade.tradeCode}) has been completed. Leave a review for your trade partner.`,
      data: { tradeId, tradeCode: trade.tradeCode },
    });

    logger.info("Trade completed", { tradeId, tradeCode: trade.tradeCode, adminId });

    return completed;
  }

  // ─────────────────────────────────────────────────────────────────────────
  async refreshTradePrices(tradeId: string, userId: string): Promise<Trade> {
    const trade = await this.tradeRepository.findById(tradeId);
    if (!trade) throw ApiError.notFound("Trade not found");

    if (trade.proposerId !== userId && trade.receiverId !== userId) {
      throw ApiError.forbidden("You are not part of this trade");
    }

    if (trade.status !== TradeStatus.PROPOSED && trade.status !== TradeStatus.COUNTERED) {
      throw ApiError.badRequest("Prices can only be refreshed during negotiation");
    }

    if (trade.priceRefreshCount >= 3) {
      throw ApiError.badRequest("Price refresh limit reached for this trade (max 3)");
    }

    // Fetch all trade items
    const tradeItems = await prisma.tradeItem.findMany({
      where: { tradeId },
      include: { collectionItem: { include: { card: true } } },
    });

    // Refresh prices using PricingService for each item
    for (const item of tradeItems) {
      const collectionItem = item.collectionItem;
      let newValue = collectionItem.currentMarketValue ?? 0;

      if (collectionItem.askingValueOverride !== null) {
        newValue = collectionItem.askingValueOverride;
      } else if (collectionItem.card.tcgplayerId) {
        const priceData = await this.pricingService.getCardPrice(collectionItem.card.tcgplayerId);
        if (priceData) {
          newValue = priceData.marketPrice;
          // Update cached value on collection item
          await prisma.userCollection.update({
            where: { id: collectionItem.id },
            data: { currentMarketValue: newValue, marketValueUpdatedAt: new Date() },
          });
        }
      }

      // Update the snapshot on the trade item
      await prisma.tradeItem.update({
        where: { id: item.id },
        data: { valueAtTimeOfTrade: newValue },
      });
    }

    // Recalculate aggregate trade values
    const updatedItems = await prisma.tradeItem.findMany({ where: { tradeId } });
    const proposerMarketValue = updatedItems
      .filter((i) => i.ownedByProposer)
      .reduce((sum, i) => sum + (i.valueAtTimeOfTrade ?? 0), 0);
    const receiverMarketValue = updatedItems
      .filter((i) => !i.ownedByProposer)
      .reduce((sum, i) => sum + (i.valueAtTimeOfTrade ?? 0), 0);
    const valueDifference = receiverMarketValue - proposerMarketValue;

    await prisma.trade.update({
      where: { id: tradeId },
      data: {
        proposerMarketValue,
        receiverMarketValue,
        valueDifference,
        priceRefreshCount: { increment: 1 },
      },
    });

    return this.tradeRepository.findById(tradeId) as Promise<Trade>;
  }

  // ─────────────────────────────────────────────────────────────────────────
  async disputeTrade(tradeId: string, adminId: string, notes: string): Promise<Trade> {
    const trade = await this.tradeRepository.findById(tradeId);
    if (!trade) throw ApiError.notFound("Trade not found");

    if (trade.stripePaymentIntentId) {
      try {
        await this.stripeService.refundPayment(trade.stripePaymentIntentId);
      } catch {
        logger.warn("Could not refund payment for disputed trade", { tradeId });
      }
    }

    const updated = await this.tradeRepository.updateStatus(tradeId, TradeStatus.DISPUTED, notes);

    await this.notificationService.notifyMany([trade.proposerId, trade.receiverId], {
      type: NotificationType.DISPUTE_OPENED,
      title: "Trade disputed",
      body: `Trade ${trade.tradeCode} has been flagged for review by our team.`,
      data: { tradeId, tradeCode: trade.tradeCode },
    });

    return updated;
  }
}

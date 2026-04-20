import { Trade, TradeStatus } from "@prisma/client";
import { prisma } from "@/config/prisma";
import {
  ITradeRepository,
  CreateTradeData,
} from "@/repositories/interfaces/ITradeRepository";
import { PaginatedResult, PaginationParams } from "@/types";

const tradeInclude = {
  proposer: { omit: { passwordHash: true } },
  receiver: { omit: { passwordHash: true } },
  items: {
    include: {
      collectionItem: {
        include: { card: true, media: { orderBy: { order: "asc" as const } } },
      },
    },
  },
  shipments: true,
  verifications: { include: { media: true } },
  offers: { include: { offeredBy: { omit: { passwordHash: true } } } },
};

export class TradeRepository implements ITradeRepository {
  async findById(id: string): Promise<Trade | null> {
    return prisma.trade.findUnique({
      where: { id },
      include: tradeInclude,
    }) as unknown as Trade | null;
  }

  async findByTradeCode(tradeCode: string): Promise<Trade | null> {
    return prisma.trade.findUnique({
      where: { tradeCode },
      include: tradeInclude,
    }) as unknown as Trade | null;
  }

  async findByUserId(
    userId: string,
    params: PaginationParams
  ): Promise<PaginatedResult<Trade>> {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.trade.findMany({
        where: {
          OR: [{ proposerId: userId }, { receiverId: userId }],
        },
        include: tradeInclude,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.trade.count({
        where: {
          OR: [{ proposerId: userId }, { receiverId: userId }],
        },
      }),
    ]);

    return {
      data: data as unknown as Trade[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByStatus(
    status: TradeStatus,
    params: PaginationParams
  ): Promise<PaginatedResult<Trade>> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await prisma.$transaction([
      prisma.trade.findMany({
        where: { status },
        include: tradeInclude,
        skip,
        take: limit,
        orderBy: { createdAt: "asc" },
      }),
      prisma.trade.count({ where: { status } }),
    ]);

    return {
      data: data as unknown as Trade[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: CreateTradeData): Promise<Trade> {
    const tradeCode = await this.generateTradeCode();

    return prisma.trade.create({
      data: {
        tradeCode,
        proposerId: data.proposerId,
        receiverId: data.receiverId,
        proposerMarketValue: data.proposerMarketValue,
        receiverMarketValue: data.receiverMarketValue,
        cashDifference: data.cashDifference,
        cashPayerId: data.cashPayerId,
        items: {
          create: [
            ...data.proposerCollectionItemIds.map((id) => ({
              collectionItemId: id,
              ownedByProposer: true,
            })),
            ...data.receiverCollectionItemIds.map((id) => ({
              collectionItemId: id,
              ownedByProposer: false,
            })),
          ],
        },
      },
      include: tradeInclude,
    }) as unknown as Trade;
  }

  async updateStatus(
    id: string,
    status: TradeStatus,
    adminNotes?: string
  ): Promise<Trade> {
    return prisma.trade.update({
      where: { id },
      data: { status, ...(adminNotes && { adminNotes }) },
      include: tradeInclude,
    }) as unknown as Trade;
  }

  async updatePaymentIntent(
    id: string,
    paymentIntentId: string
  ): Promise<Trade> {
    return prisma.trade.update({
      where: { id },
      data: { stripePaymentIntentId: paymentIntentId },
      include: tradeInclude,
    }) as unknown as Trade;
  }

  async delete(id: string): Promise<void> {
    await prisma.trade.delete({ where: { id } });
  }

  async generateTradeCode(): Promise<string> {
    const count = await prisma.trade.count();
    return `TRD-${String(count + 1).padStart(5, "0")}`;
  }
}

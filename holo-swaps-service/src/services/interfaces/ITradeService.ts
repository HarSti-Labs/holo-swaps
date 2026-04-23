import { Trade, TradeStatus } from "@prisma/client";
import { PaginatedResult, PaginationParams, TradeMatch } from "@/types";

export interface ITradeService {
  proposeTrade(data: ProposeTradeData): Promise<Trade>;
  counterOffer(tradeId: string, userId: string, data: CounterOfferData): Promise<Trade>;
  acceptTrade(tradeId: string, userId: string): Promise<Trade>;
  declineTrade(tradeId: string, userId: string): Promise<Trade>;
  cancelTrade(tradeId: string, userId: string): Promise<Trade>;
  submitTrackingNumber(tradeId: string, userId: string, data: TrackingData): Promise<Trade>;
  getUserTrades(userId: string, params: PaginationParams & { status?: TradeStatus }): Promise<PaginatedResult<Trade>>;
  getTradeById(tradeId: string, userId: string): Promise<Trade>;
  getTradeSnapshots(tradeId: string, userId: string): Promise<any[]>;
  findMatches(userId: string): Promise<TradeMatch[]>;
  confirmReceipt(tradeId: string, userId: string): Promise<Trade>;
  refreshTradePrices(tradeId: string, userId: string): Promise<Trade>;
  // Admin only
  verifyCards(tradeId: string, adminId: string, data: VerifyCardsData): Promise<Trade>;
  completeTrade(tradeId: string, adminId: string): Promise<Trade>;
  disputeTrade(tradeId: string, adminId: string, notes: string): Promise<Trade>;
}

export interface ProposeTradeData {
  proposerId: string;
  receiverId: string;
  proposerCollectionItemIds: string[];
  receiverCollectionItemIds: string[];
  /**
   * Either side can sweeten the deal with cash — both are optional and always >= 0.
   * Net cash transfer = proposerCashAdd - receiverCashAdd.
   *   net > 0 → proposer pays receiver
   *   net < 0 → receiver pays proposer
   *   net = 0 → straight card swap (even if market values differ)
   */
  proposerCashAdd?: number;
  receiverCashAdd?: number;
  message?: string;
}

export interface CounterOfferData {
  proposerCollectionItemIds?: string[];
  receiverCollectionItemIds?: string[];
  /** Same semantics as ProposeTradeData — either side can offer cash, both >= 0 */
  proposerCashAdd?: number;
  receiverCashAdd?: number;
  message?: string;
}

export interface TrackingData {
  trackingNumber: string;
  carrier: string;
  isInsured: boolean;
  insuredValue?: number;
}

export interface VerifyCardsData {
  collectionItemId: string;
  cardOwnerId: string;
  mediaUrls: string[];
  conditionConfirmed: boolean;
  conditionNotes?: string;
  isAuthentic: boolean;
}

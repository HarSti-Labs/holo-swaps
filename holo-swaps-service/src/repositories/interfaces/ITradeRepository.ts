import { Trade, TradeStatus } from "@prisma/client";
import { PaginatedResult, PaginationParams } from "@/types";

export interface ITradeRepository {
  findById(id: string): Promise<Trade | null>;
  findByTradeCode(tradeCode: string): Promise<Trade | null>;
  findByUserId(userId: string, params: PaginationParams): Promise<PaginatedResult<Trade>>;
  findByStatus(status: TradeStatus, params: PaginationParams): Promise<PaginatedResult<Trade>>;
  create(data: CreateTradeData): Promise<Trade>;
  updateStatus(id: string, status: TradeStatus, adminNotes?: string): Promise<Trade>;
  updatePaymentIntent(id: string, paymentIntentId: string): Promise<Trade>;
  delete(id: string): Promise<void>;
  generateTradeCode(): Promise<string>;
}

export interface CreateTradeData {
  proposerId: string;
  receiverId: string;
  proposerCollectionItemIds: string[];
  receiverCollectionItemIds: string[];
  proposerMarketValue: number;
  receiverMarketValue: number;
  cashDifference: number;
  cashPayerId?: string;
}

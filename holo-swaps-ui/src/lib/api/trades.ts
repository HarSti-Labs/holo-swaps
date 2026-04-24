import { api } from "./client";
import {
  ApiResponse,
  Trade,
  TradeMatch,
  TradeStatus,
  PaginatedResult,
} from "@/types";

export interface ProposeTradePayload {
  receiverId: string;
  proposerCollectionItemIds: string[];
  receiverCollectionItemIds: string[];
  proposerCashAdd?: number;
  message?: string;
}

export interface TrackingPayload {
  trackingNumber: string;
  carrier: string;
  isInsured: boolean;
  insuredValue?: number;
}

export const tradesApi = {
  getMyTrades: async (params?: {
    page?: number;
    limit?: number;
    status?: TradeStatus;
  }): Promise<PaginatedResult<Trade>> => {
    const res = await api.get<ApiResponse<PaginatedResult<Trade>>>("/trades", {
      params,
    });
    return res.data.data!;
  },

  getById: async (tradeId: string): Promise<Trade> => {
    const res = await api.get<ApiResponse<Trade>>(`/trades/${tradeId}`);
    return res.data.data!;
  },

  getMatches: async (): Promise<TradeMatch[]> => {
    const res = await api.get<ApiResponse<TradeMatch[]>>("/trades/matches");
    return res.data.data!;
  },

  propose: async (data: ProposeTradePayload): Promise<Trade> => {
    const res = await api.post<ApiResponse<Trade>>("/trades", data);
    return res.data.data!;
  },

  counter: async (
    tradeId: string,
    data: {
      proposerCollectionItemIds?: string[];
      receiverCollectionItemIds?: string[];
      proposerCashAdd?: number;
      receiverCashAdd?: number;
      message?: string;
    }
  ): Promise<Trade> => {
    const res = await api.post<ApiResponse<Trade>>(
      `/trades/${tradeId}/counter`,
      data
    );
    return res.data.data!;
  },

  accept: async (tradeId: string): Promise<Trade> => {
    const res = await api.patch<ApiResponse<Trade>>(
      `/trades/${tradeId}/accept`
    );
    return res.data.data!;
  },

  decline: async (tradeId: string): Promise<Trade> => {
    const res = await api.patch<ApiResponse<Trade>>(
      `/trades/${tradeId}/decline`
    );
    return res.data.data!;
  },

  cancel: async (tradeId: string): Promise<Trade> => {
    const res = await api.patch<ApiResponse<Trade>>(
      `/trades/${tradeId}/cancel`
    );
    return res.data.data!;
  },

  requestCancel: async (tradeId: string): Promise<Trade> => {
    const res = await api.post<ApiResponse<Trade>>(`/trades/${tradeId}/request-cancel`);
    return res.data.data!;
  },

  acceptCancel: async (tradeId: string): Promise<Trade> => {
    const res = await api.post<ApiResponse<Trade>>(`/trades/${tradeId}/accept-cancel`);
    return res.data.data!;
  },

  submitTracking: async (
    tradeId: string,
    data: TrackingPayload
  ): Promise<Trade> => {
    const res = await api.patch<ApiResponse<Trade>>(
      `/trades/${tradeId}/tracking`,
      data
    );
    return res.data.data!;
  },

  confirmReceipt: async (tradeId: string): Promise<Trade> => {
    const res = await api.patch<ApiResponse<Trade>>(`/trades/${tradeId}/received`);
    return res.data.data!;
  },

  submitReview: async (tradeId: string, data: { rating: number; comment?: string }): Promise<any> => {
    const res = await api.post<ApiResponse<any>>(`/trades/${tradeId}/reviews`, data);
    return res.data.data!;
  },

  getSnapshots: async (tradeId: string): Promise<any[]> => {
    const res = await api.get<ApiResponse<any[]>>(`/trades/${tradeId}/snapshots`);
    return res.data.data!;
  },

  getCheckoutUrl: async (tradeId: string): Promise<string> => {
    const res = await api.get<ApiResponse<{ checkoutUrl: string }>>(`/trades/${tradeId}/checkout-url`);
    return res.data.data!.checkoutUrl;
  },

  // Trade messages
  getMessages: async (tradeId: string): Promise<any[]> => {
    const res = await api.get<ApiResponse<any[]>>(`/trades/${tradeId}/messages`);
    return res.data.data!;
  },

  sendMessage: async (tradeId: string, body: string): Promise<any> => {
    const res = await api.post<ApiResponse<any>>(`/trades/${tradeId}/messages`, { body });
    return res.data.data!;
  },
};

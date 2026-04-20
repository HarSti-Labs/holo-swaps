import { api } from "./client";
import {
  ApiResponse,
  CollectionItem,
  WantItem,
  CardCondition,
  WantPriority,
  PaginatedResult,
} from "@/types";

export interface AddCollectionItemPayload {
  cardId: string;
  condition: CardCondition;
  isFoil?: boolean;
  isFirstEdition?: boolean;
  language?: string;
  photos?: string[];
  notes?: string;
  status?: "AVAILABLE" | "UNAVAILABLE" | "IN_TRADE" | "TRADED_AWAY";
  askingValueOverride?: number;
}

export interface AddWantPayload {
  cardId: string;
  maxCondition?: CardCondition;
  priority?: WantPriority;
  notes?: string;
}

export const collectionApi = {
  getMyCollection: async (
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<CollectionItem>> => {
    const res = await api.get<ApiResponse<PaginatedResult<CollectionItem>>>(
      `/collection`,
      { params: { page, limit } }
    );
    return res.data.data!;
  },

  getUserCollection: async (
    username: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<CollectionItem>> => {
    const res = await api.get<ApiResponse<PaginatedResult<CollectionItem>>>(
      `/users/${username}/collection`,
      { params: { page, limit } }
    );
    return res.data.data!;
  },

  getCollection: async (
    username: string,
    params?: { page?: number; limit?: number }
  ): Promise<PaginatedResult<CollectionItem>> => {
    const res = await api.get<ApiResponse<PaginatedResult<CollectionItem>>>(
      `/users/${username}/collection`,
      { params }
    );
    return res.data.data!;
  },

  getWants: async (): Promise<WantItem[]> => {
    const res = await api.get<ApiResponse<WantItem[]>>("/wants");
    return res.data.data!;
  },

  addToCollection: async (
    data: AddCollectionItemPayload
  ): Promise<CollectionItem> => {
    const res = await api.post<ApiResponse<CollectionItem>>(
      "/collection",
      data
    );
    return res.data.data!;
  },

  updateCollectionItem: async (
    itemId: string,
    data: Partial<AddCollectionItemPayload>
  ): Promise<CollectionItem> => {
    const res = await api.patch<ApiResponse<CollectionItem>>(
      `/collection/${itemId}`,
      data
    );
    return res.data.data!;
  },

  removeFromCollection: async (itemId: string): Promise<void> => {
    await api.delete(`/collection/${itemId}`);
  },

  addToWants: async (data: AddWantPayload): Promise<WantItem> => {
    const res = await api.post<ApiResponse<WantItem>>("/wants", data);
    return res.data.data!;
  },

  removeFromWants: async (wantId: string): Promise<void> => {
    await api.delete(`/wants/${wantId}`);
  },
};

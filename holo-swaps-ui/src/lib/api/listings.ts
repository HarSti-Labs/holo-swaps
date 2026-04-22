import { api } from "./client";
import { ApiResponse, Card, CardCondition } from "@/types";

export interface Listing {
  id: string;
  cardId: string;
  userId: string;
  condition: CardCondition;
  isFoil: boolean;
  isFirstEdition: boolean;
  language: string;
  currentMarketValue: number | null;
  askingValueOverride: number | null;
  listingDescription: string | null;
  status: "AVAILABLE";
  card: Card;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    reputationScore: number;
    tier: string | null;
  };
  media: { id: string; url: string; order: number }[];
  updatedAt: string;
}

export interface ListingsResult {
  data: Listing[];
  total: number;
  page: number;
  totalPages: number;
}

export const listingsApi = {
  getListings: async (params?: {
    game?: string;
    q?: string;
    rarity?: string;
    condition?: string;
    minPrice?: number;
    maxPrice?: number;
    foilOnly?: boolean;
    sortBy?: string;
    page?: number;
    limit?: number;
  }): Promise<ListingsResult> => {
    const res = await api.get<ApiResponse<ListingsResult>>("/listings", { params });
    return res.data.data!;
  },

  getGames: async (): Promise<string[]> => {
    const res = await api.get<ApiResponse<string[]>>("/listings/games");
    return res.data.data!;
  },

  getRarities: async (game?: string): Promise<string[]> => {
    const res = await api.get<ApiResponse<string[]>>("/listings/rarities", {
      params: game ? { game } : undefined,
    });
    return res.data.data!;
  },
};

import { api } from "./client";
import { Card, PaginatedResult, ApiResponse } from "@/types";

export interface CardHolder {
  id: string; // collectionItemId
  condition: string;
  isFoil: boolean;
  isFirstEdition: boolean;
  currentMarketValue: number | null;
  askingValueOverride: number | null;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
    reputationScore: number;
    tradeCount: number;
  };
}

export interface CardSet {
  setCode: string;
  name: string;
  game: string;
  totalCards?: number;
}

export interface SearchCardsParams {
  q?: string;
  game?: "POKEMON" | "MAGIC_THE_GATHERING" | "ONE_PIECE" | "YUGIOH" | "DIGIMON" | "OTHER";
  setCode?: string;
  setName?: string;
  rarity?: string;
  page?: number;
  limit?: number;
}

export interface CardPriceHistory {
  id: string;
  cardId: string;
  marketPrice: number;
  lowPrice: number | null;
  highPrice: number | null;
  recordedAt: string;
}

export interface CardWithHistory extends Card {
  priceHistory: CardPriceHistory[];
}

// GET /api/cards - Search/list cards with pagination
export async function searchCards(params: SearchCardsParams = {}) {
  const { data } = await api.get<ApiResponse<PaginatedResult<Card>>>("/cards", {
    params,
  });
  return data.data!;
}

// GET /api/cards/:cardId - Get single card with price history
export async function getCardById(cardId: string) {
  const { data } = await api.get<ApiResponse<CardWithHistory>>(`/cards/${cardId}`);
  return data.data!;
}

// GET /api/cards/:cardId/price - Get latest price for a card
export async function getCardPrice(cardId: string) {
  const { data } = await api.get<ApiResponse<{
    cardId: string;
    name: string;
    tcgplayerId: string | null;
    latestPrice: CardPriceHistory | null;
  }>>(`/cards/${cardId}/price`);
  return data.data!;
}

// GET /api/cards/:cardId/holders - Get users who have this card available for trade
export async function getCardHolders(cardId: string, page = 1, limit = 20) {
  const { data } = await api.get<ApiResponse<{
    card: import("@/types").Card;
    data: CardHolder[];
    total: number;
    page: number;
    totalPages: number;
  }>>(`/cards/${cardId}/holders`, { params: { page, limit } });
  return data.data!;
}

// GET /api/sets - Get all sets
export async function getSets(game?: string) {
  const { data } = await api.get<ApiResponse<CardSet[]>>("/sets", {
    params: game ? { game } : undefined,
  });
  return data.data!;
}

// GET /api/cards/rarities?setCode=XXX - Get distinct rarities (optionally scoped to a set)
export async function getRarities(setCode?: string) {
  const { data } = await api.get<ApiResponse<string[]>>("/cards/rarities", {
    params: setCode ? { setCode } : undefined,
  });
  return data.data!;
}

// GET /api/cards/most-wanted - Get most wanted cards
export async function getMostWantedCards(limit = 20) {
  const { data } = await api.get<ApiResponse<Array<{
    card: Card;
    wantCount: number;
  }>>>("/cards/most-wanted", {
    params: { limit },
  });
  return data.data!;
}

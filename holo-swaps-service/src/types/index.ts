import { Request } from "express";
import { User } from "@prisma/client";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
    isAdmin: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface TradeMatch {
  userId: string;
  username: string;
  avatarUrl: string | null;
  theyHave: {
    collectionItemId: string;
    cardName: string;
    setName: string;
    condition: string;
    marketValue: number;
    photos: string[];
  }[];
  youHave: {
    collectionItemId: string;
    cardName: string;
    setName: string;
    condition: string;
    marketValue: number;
    photos: string[];
  }[];
  matchScore: number;
  valueDifference: number;
}

export interface CardPriceData {
  cardId: string;
  tcgplayerId: string | null;
  marketPrice: number;
  lowPrice: number;
  midPrice: number;
  highPrice: number;
  updatedAt: Date;
}

export type SafeUser = Omit<User, "passwordHash">;

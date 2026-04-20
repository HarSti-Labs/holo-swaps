import { UserCollection, CardCondition, CardStatus } from "@prisma/client";
import { PaginatedResult, PaginationParams } from "@/types";

export interface ICollectionRepository {
  findById(id: string): Promise<UserCollection | null>;
  findByUserId(userId: string, params: PaginationParams & { status?: CardStatus; q?: string }): Promise<PaginatedResult<UserCollection>>;
  findAvailableForTrade(userId: string): Promise<UserCollection[]>;
  create(data: CreateCollectionItemData): Promise<UserCollection>;
  update(id: string, data: UpdateCollectionItemData): Promise<UserCollection>;
  updateMarketValue(id: string, value: number): Promise<UserCollection>;
  delete(id: string): Promise<void>;
}

export interface CreateCollectionItemData {
  userId: string;
  cardId: string;
  condition: CardCondition;
  isFoil?: boolean;
  isFirstEdition?: boolean;
  language?: string;
  photos?: string[];
  notes?: string;
  availableForTrade?: boolean;
  askingValueOverride?: number;
}

export interface UpdateCollectionItemData {
  condition?: CardCondition;
  isFoil?: boolean;
  isFirstEdition?: boolean;
  language?: string;
  photos?: string[];
  notes?: string;
  availableForTrade?: boolean;
  askingValueOverride?: number;
}

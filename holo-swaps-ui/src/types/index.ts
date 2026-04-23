export type CardCondition =
  | "MINT"
  | "NEAR_MINT"
  | "LIGHTLY_PLAYED"
  | "MODERATELY_PLAYED"
  | "HEAVILY_PLAYED"
  | "DAMAGED";

export type TradeStatus =
  | "PROPOSED"
  | "COUNTERED"
  | "ACCEPTED"
  | "BOTH_SHIPPED"
  | "A_RECEIVED"
  | "B_RECEIVED"
  | "BOTH_RECEIVED"
  | "VERIFIED"
  | "COMPLETED"
  | "DISPUTED"
  | "CANCELLED";

export type WantPriority = "HIGH" | "MEDIUM" | "LOW";

export interface User {
  id: string;
  email: string;
  username: string;
  isEmailVerified: boolean;
  avatarUrl: string | null;
  bio: string | null;
  location: string | null;
  reputationScore: number;
  tradeCount: number;
  stripeCustomerId: string | null;
  stripeAccountId: string | null;
  stripeAccountVerified: boolean;
  isAdmin: boolean;
  emailOnTradeProposed: boolean;
  emailOnTradeCountered: boolean;
  emailOnTradeAccepted: boolean;
  emailOnTradeDeclined: boolean;
  emailOnTradeCancelled: boolean;
  emailOnTradeMessage: boolean;
  createdAt: string;
  followerCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  isBlocked?: boolean;
}

export interface Card {
  id: string;
  name: string;
  setName: string;
  setCode: string;
  cardNumber: string;
  rarity: string | null;
  imageUrl: string | null;
  tcgplayerId: string | null;
}

export interface CollectionItem {
  id: string;
  quantity: number;
  userId: string;
  cardId: string;
  card: Card;
  condition: CardCondition;
  isFoil: boolean;
  isFirstEdition: boolean;
  language: string;
  photos: string[];
  notes: string | null;
  status: "AVAILABLE" | "UNAVAILABLE" | "IN_TRADE" | "TRADED_AWAY";
  askingValueOverride: number | null;
  currentMarketValue: number | null;
  isOpenListing: boolean;
  listingDescription: string | null;
  createdAt: string;
}

export interface WantItem {
  id: string;
  userId: string;
  cardId: string;
  card: Card;
  maxCondition: CardCondition;
  priority: WantPriority;
  notes: string | null;
  isFulfilled: boolean;
  createdAt: string;
}

export interface Trade {
  id: string;
  tradeCode: string;
  proposer: User;
  receiver: User;
  proposerMarketValue: number;
  receiverMarketValue: number;
  cashDifference: number;
  cashPayerId: string | null;
  lastActionById: string | null;
  stripeProposerSessionId: string | null;
  stripeReceiverSessionId: string | null;
  stripeProposerIntentId: string | null;
  stripeReceiverIntentId: string | null;
  status: TradeStatus;
  items: TradeItem[];
  offers: TradeOffer[];
  shipments: Shipment[];
  verifications: CardVerification[];
  createdAt: string;
  updatedAt: string;
}

export interface TradeSnapshotItem {
  id: string;
  snapshotId: string;
  ownedByProposer: boolean;
  cardName: string;
  cardSetName: string | null;
  cardImageUrl: string | null;
  condition: CardCondition;
  isFoil: boolean;
  valueAtTime: number | null;
}

export interface TradeSnapshot {
  id: string;
  tradeId: string;
  round: number;
  label: string;
  actionById: string;
  actionBy: { id: string; username: string };
  cashDifference: number;
  cashPayerId: string | null;
  createdAt: string;
  items: TradeSnapshotItem[];
}

export interface TradeItem {
  id: string;
  tradeId: string;
  collectionItemId: string;
  ownedByProposer: boolean;
  collectionItem?: CollectionItem;
  proposerCollection?: CollectionItem;
  receiverCollection?: CollectionItem;
}

export interface TradeOffer {
  id: string;
  tradeId: string;
  offeredBy: User;
  cashAdjustment: number;
  message: string | null;
  isAccepted: boolean;
  createdAt: string;
}

export interface Shipment {
  id: string;
  tradeId: string;
  senderId: string;
  receiverId: string;
  trackingNumber: string | null;
  carrier: string | null;
  direction: "INBOUND" | "OUTBOUND";
  isInsured: boolean;
  insuredValue: number | null;
  status: "PENDING" | "SHIPPED" | "IN_TRANSIT" | "DELIVERED";
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
}

export interface CardVerification {
  id: string;
  tradeId: string;
  cardOwnerId: string;
  photos: string[];
  conditionConfirmed: boolean;
  conditionNotes: string | null;
  isAuthentic: boolean | null;
  verifiedAt: string | null;
}

export interface TradeMatch {
  userId: string;
  username: string;
  avatarUrl: string | null;
  theyHave: MatchCard[];
  youHave: MatchCard[];
  matchScore: number;
  valueDifference: number;
  reputationScore: number;
  tradeCount: number;
}

export interface MatchCard {
  collectionItemId: string;
  cardName: string;
  setName: string;
  condition: string;
  marketValue: number;
  photos: string[];
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

export const CONDITION_LABELS: Record<CardCondition, string> = {
  MINT: "Mint",
  NEAR_MINT: "Near Mint",
  LIGHTLY_PLAYED: "Lightly Played",
  MODERATELY_PLAYED: "Moderately Played",
  HEAVILY_PLAYED: "Heavily Played",
  DAMAGED: "Damaged",
};

export const TRADE_STATUS_LABELS: Record<TradeStatus, string> = {
  PROPOSED: "Proposed",
  COUNTERED: "Counter Offer",
  ACCEPTED: "Accepted",
  BOTH_SHIPPED: "Both Shipped",
  A_RECEIVED: "Partially Received",
  B_RECEIVED: "Partially Received",
  BOTH_RECEIVED: "Both Received",
  VERIFIED: "Verified",
  COMPLETED: "Completed",
  DISPUTED: "Disputed",
  CANCELLED: "Cancelled",
};

import { CardPriceData } from "@/types";

export interface IPricingService {
  getCardPrice(tcgplayerId: string): Promise<CardPriceData | null>;
  getCardPrices(tcgplayerIds: string[]): Promise<CardPriceData[]>;
  calculateTradeDifference(
    proposerItemIds: string[],
    receiverItemIds: string[]
  ): Promise<TradePriceBreakdown>;
}

export interface TradePriceBreakdown {
  proposerTotalValue: number;
  receiverTotalValue: number;
  cashDifference: number; // positive = proposer pays, negative = receiver pays
  proposerItems: ItemValueBreakdown[];
  receiverItems: ItemValueBreakdown[];
}

export interface ItemValueBreakdown {
  collectionItemId: string;
  cardName: string;
  marketValue: number;
  valueSource: "market" | "override";
}

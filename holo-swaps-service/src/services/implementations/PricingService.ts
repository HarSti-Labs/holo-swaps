import { prisma } from "@/config/prisma";
import { config } from "@/config";
import { CardPriceData } from "@/types";
import {
  IPricingService,
  TradePriceBreakdown,
  ItemValueBreakdown,
} from "@/services/interfaces/IPricingService";
import { logger } from "@/utils/logger";

export class PricingService implements IPricingService {
  async getCardPrice(tcgplayerId: string): Promise<CardPriceData | null> {
    try {
      const response = await fetch(
        `${config.tcgapis.apiUrl}/pricing/product/${tcgplayerId}`,
        {
          headers: {
            Authorization: `Bearer ${config.tcgapis.apiKey}`,
          },
        }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const price = data.results?.[0];

      if (!price) return null;

      return {
        cardId: tcgplayerId,
        tcgplayerId,
        marketPrice: price.marketPrice || 0,
        lowPrice: price.lowPrice || 0,
        midPrice: price.midPrice || 0,
        highPrice: price.highPrice || 0,
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error("Failed to fetch TCGAPIs price", { tcgplayerId, error });
      return null;
    }
  }

  async getCardPrices(tcgplayerIds: string[]): Promise<CardPriceData[]> {
    const prices = await Promise.all(
      tcgplayerIds.map((id) => this.getCardPrice(id))
    );
    return prices.filter((p): p is CardPriceData => p !== null);
  }

  async calculateTradeDifference(
    proposerItemIds: string[],
    receiverItemIds: string[]
  ): Promise<TradePriceBreakdown> {
    const [proposerItems, receiverItems] = await Promise.all([
      this.getItemValues(proposerItemIds),
      this.getItemValues(receiverItemIds),
    ]);

    const proposerTotalValue = proposerItems.reduce(
      (sum, item) => sum + item.marketValue,
      0
    );
    const receiverTotalValue = receiverItems.reduce(
      (sum, item) => sum + item.marketValue,
      0
    );

    // Positive = proposer needs to pay cash, Negative = receiver needs to pay cash
    const cashDifference = receiverTotalValue - proposerTotalValue;

    return {
      proposerTotalValue,
      receiverTotalValue,
      cashDifference,
      proposerItems,
      receiverItems,
    };
  }

  private async getItemValues(
    collectionItemIds: string[]
  ): Promise<ItemValueBreakdown[]> {
    const items = await prisma.userCollection.findMany({
      where: { id: { in: collectionItemIds } },
      include: { card: true },
    });

    return Promise.all(
      items.map(async (item) => {
        // Use override value if set
        if (item.askingValueOverride !== null) {
          return {
            collectionItemId: item.id,
            cardName: item.card.name,
            marketValue: item.askingValueOverride,
            valueSource: "override" as const,
          };
        }

        // Fetch live market price
        let marketValue = item.currentMarketValue || 0;

        if (item.card.tcgplayerId) {
          const priceData = await this.getCardPrice(item.card.tcgplayerId);
          if (priceData) {
            marketValue = priceData.marketPrice;
            // Cache it
            await prisma.userCollection.update({
              where: { id: item.id },
              data: {
                currentMarketValue: marketValue,
                marketValueUpdatedAt: new Date(),
              },
            });
          }
        }

        return {
          collectionItemId: item.id,
          cardName: item.card.name,
          marketValue,
          valueSource: "market" as const,
        };
      })
    );
  }
}

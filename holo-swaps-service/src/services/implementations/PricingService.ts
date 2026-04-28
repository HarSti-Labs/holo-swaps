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
  private get headers() {
    return { "X-API-Key": config.tcgapiDev.apiKey };
  }

  /**
   * Fetch price for a single card by its tcgapi.dev internal ID.
   * This is the fast path used during sync (ID already stored on Card row).
   */
  async getCardPriceByDevId(tcgapiDevId: number): Promise<CardPriceData | null> {
    try {
      const url = `${config.tcgapiDev.apiUrl}/cards/${tcgapiDevId}/prices`;
      logger.info("tcgapi.dev price fetch", { url, hasKey: !!config.tcgapiDev.apiKey, keyPrefix: config.tcgapiDev.apiKey.slice(0, 12) });
      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        logger.error("tcgapi.dev price fetch failed", { tcgapiDevId, status: response.status, body });
        return null;
      }

      const json = await response.json();
      // The API returns an array of price variants — take the first entry
      const priceList = Array.isArray(json.data) ? json.data : [json.data];
      const price = priceList[0];

      if (!price || price.market_price == null) {
        logger.warn("tcgapi.dev: no price data available", { tcgapiDevId });
        return null;
      }

      return {
        cardId: String(tcgapiDevId),
        tcgplayerId: String(tcgapiDevId),
        marketPrice: price.market_price,
        lowPrice: price.low_price ?? null,
        midPrice: price.median_price ?? null,
        highPrice: price.foil_market_price ?? null,
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error("Failed to fetch tcgapi.dev price by dev ID", { tcgapiDevId, error });
      return null;
    }
  }

  /**
   * Fetch price for a card by TCGPlayer ID.
   * Two-step: resolve tcgplayer ID → tcgapi.dev card ID, then fetch prices.
   * Stores the resolved tcgapiDevId back onto the Card row to avoid the
   * double-call on subsequent lookups.
   */
  async getCardPrice(tcgplayerId: string): Promise<CardPriceData | null> {
    try {
      // Step 1: resolve to tcgapi.dev card
      const cardResp = await fetch(
        `${config.tcgapiDev.apiUrl}/cards/tcgplayer/${tcgplayerId}`,
        { headers: this.headers }
      );

      if (!cardResp.ok) return null;

      const cardJson = await cardResp.json();
      const devId: number | undefined = cardJson.data?.id;
      if (!devId) return null;

      // Persist the devId so future lookups skip this step
      await prisma.card.updateMany({
        where: { tcgplayerId },
        data: { tcgapiDevId: devId },
      });

      return this.getCardPriceByDevId(devId);
    } catch (error) {
      logger.error("Failed to fetch tcgapi.dev price by tcgplayerId", { tcgplayerId, error });
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
        if (item.askingValueOverride !== null) {
          return {
            collectionItemId: item.id,
            cardName: item.card.name,
            marketValue: item.askingValueOverride,
            valueSource: "override" as const,
          };
        }

        let marketValue = item.currentMarketValue ?? 0;

        // Use fast path if tcgapiDevId is already stored
        if (item.card.tcgapiDevId) {
          const priceData = await this.getCardPriceByDevId(item.card.tcgapiDevId);
          if (priceData) {
            marketValue = priceData.marketPrice;
            await prisma.userCollection.update({
              where: { id: item.id },
              data: {
                currentMarketValue: marketValue,
                marketValueUpdatedAt: new Date(),
              },
            });
          }
        } else if (item.card.tcgplayerId) {
          const priceData = await this.getCardPrice(item.card.tcgplayerId);
          if (priceData) {
            marketValue = priceData.marketPrice;
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

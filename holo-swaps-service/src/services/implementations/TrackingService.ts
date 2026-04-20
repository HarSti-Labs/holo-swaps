import { config } from "@/config";
import { logger } from "@/utils/logger";

export interface RegisterTrackingParams {
  trackingNumber: string;
  carrier: string;  // e.g. "ups", "usps", "fedex" — AfterShip slug
  shipmentId: string;
  tradeId: string;
}

/**
 * Normalises common carrier names to AfterShip courier slugs.
 * https://www.aftership.com/couriers
 */
const CARRIER_SLUG_MAP: Record<string, string> = {
  usps: "usps",
  ups: "ups",
  fedex: "fedex",
  dhl: "dhl",
  "dhl express": "dhl-express",
  "canada post": "canada-post",
  "royal mail": "royal-mail",
  purolator: "purolator",
};

function toSlug(carrier: string): string {
  return CARRIER_SLUG_MAP[carrier.toLowerCase()] ?? carrier.toLowerCase().replace(/\s+/g, "-");
}

export class TrackingService {
  private readonly apiKey = config.aftership.apiKey;
  private readonly apiUrl = config.aftership.apiUrl;

  /**
   * Registers a tracking number with AfterShip.
   * AfterShip will poll the carrier and fire a webhook to /api/webhooks/tracking
   * when the status changes (especially on "Delivered").
   *
   * If AFTERSHIP_API_KEY is not set (e.g. local dev), this is a no-op.
   */
  async registerTracking(params: RegisterTrackingParams): Promise<void> {
    if (!this.apiKey) {
      logger.warn("AfterShip API key not set — skipping tracking registration", {
        trackingNumber: params.trackingNumber,
      });
      return;
    }

    try {
      const response = await fetch(`${this.apiUrl}/trackings`, {
        method: "POST",
        headers: {
          "aftership-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tracking: {
            tracking_number: params.trackingNumber,
            slug: toSlug(params.carrier),
            // Store our IDs in custom fields so the webhook knows which shipment to update
            custom_fields: {
              shipmentId: params.shipmentId,
              tradeId: params.tradeId,
            },
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        logger.error("AfterShip tracking registration failed", {
          status: response.status,
          body,
          trackingNumber: params.trackingNumber,
        });
        return;
      }

      logger.info("Tracking registered with AfterShip", {
        trackingNumber: params.trackingNumber,
        shipmentId: params.shipmentId,
        tradeId: params.tradeId,
      });
    } catch (err) {
      // Never let tracking registration failures break the trade flow
      logger.error("AfterShip registration threw an error", { err });
    }
  }

  /**
   * Verifies the HMAC-SHA256 signature AfterShip attaches to every webhook.
   * AfterShip signs using: HMAC-SHA256(secret, rawBody) → base64
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!config.aftership.webhookSecret) return true; // skip in dev
    const crypto = require("crypto") as typeof import("crypto");
    const expected = crypto
      .createHmac("sha256", config.aftership.webhookSecret)
      .update(rawBody)
      .digest("base64");
    return expected === signature;
  }
}

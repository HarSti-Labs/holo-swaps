/**
 * seedFromTcgApiDev.ts
 *
 * Pulls all Pokemon sets and their cards directly from tcgapi.dev
 * and upserts them into the database.
 *
 * Run with: npm run db:seed
 */

import { prisma } from "@/config/prisma";
import { config } from "@/config";
import { CardGame } from "@prisma/client";
import { logger } from "@/utils/logger";

const BASE_URL = config.tcgapiDev.apiUrl;
const HEADERS = { "X-API-Key": config.tcgapiDev.apiKey };
const GAME_SLUG = "pokemon";

// Delay between set fetches to be a good API citizen
const SET_DELAY_MS = 500;

interface TcgApiSet {
  id: number;
  name: string;
  slug: string;
  abbreviation: string | null;
  release_date: string | null;
  card_count: number;
  image_url: string | null;
  set_icon_url: string | null;
}

interface TcgApiCard {
  id: number;
  name: string;
  clean_name: string;
  number: string | null;
  rarity: string | null;
  image_url: string | null;
  tcgplayer_id: number | null;
  product_type: string | null;
  set_name: string;
  set_slug: string;
}

async function fetchSets(): Promise<TcgApiSet[]> {
  const url = `${BASE_URL}/games/${GAME_SLUG}/sets?per_page=200`;
  logger.info(`Fetching sets from: ${url}`);

  const resp = await fetch(url, { headers: HEADERS });
  if (!resp.ok) {
    throw new Error(`Failed to fetch sets: ${resp.status} ${resp.statusText}`);
  }

  const json = await resp.json();
  return json.data as TcgApiSet[];
}

async function fetchCardsForSet(setId: number, setName: string): Promise<TcgApiCard[]> {
  const cards: TcgApiCard[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${BASE_URL}/sets/${setId}/cards?per_page=200&page=${page}`;
    const resp = await fetch(url, { headers: HEADERS });

    if (!resp.ok) {
      logger.warn(`Failed to fetch cards for set ${setName} (page ${page}): ${resp.status}`);
      break;
    }

    const json = await resp.json();
    cards.push(...(json.data as TcgApiCard[]));
    hasMore = json.meta?.has_more ?? false;
    page++;
  }

  return cards;
}

async function seedFromTcgApiDev() {
  if (!config.tcgapiDev.apiKey) {
    throw new Error("TCGAPI_DEV_API_KEY is not set in .env");
  }

  logger.info("=== SEEDING FROM TCGAPI.DEV ===");

  const sets = await fetchSets();
  logger.info(`Found ${sets.length} Pokemon sets`);

  let totalSetsUpserted = 0;
  let totalCardsUpserted = 0;
  let totalCardsSkipped = 0;

  for (const set of sets) {
    // Use abbreviation as setCode if available, fall back to slug
    const setCode = (set.abbreviation || set.slug).toUpperCase();

    await prisma.cardSet.upsert({
      where: { setCode },
      create: {
        game: CardGame.POKEMON,
        setCode,
        name: set.name,
        releaseDate: set.release_date ? new Date(set.release_date) : undefined,
        totalCards: set.card_count,
        logoUrl: set.image_url ?? set.set_icon_url ?? undefined,
      },
      update: {
        name: set.name,
        releaseDate: set.release_date ? new Date(set.release_date) : undefined,
        totalCards: set.card_count,
        logoUrl: set.image_url ?? set.set_icon_url ?? undefined,
      },
    });

    totalSetsUpserted++;
    logger.info(`[${totalSetsUpserted}/${sets.length}] Set: ${set.name} (${setCode})`);

    const cards = await fetchCardsForSet(set.id, set.name);
    logger.info(`  → ${cards.length} cards`);

    for (const card of cards) {
      if (!card.name) {
        totalCardsSkipped++;
        continue;
      }

      const cardNumber = card.number ?? "";
      const tcgplayerId = card.tcgplayer_id ? String(card.tcgplayer_id) : null;

      // Find any existing row that matches on any of the unique keys
      const existing = await prisma.card.findFirst({
        where: {
          OR: [
            { tcgapiDevId: card.id },
            ...(tcgplayerId ? [{ tcgplayerId }] : []),
            { setCode, cardNumber },
          ],
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.card.update({
          where: { id: existing.id },
          data: {
            name: card.name,
            setName: set.name,
            setCode,
            cardNumber,
            rarity: card.rarity ?? null,
            imageUrl: card.image_url ?? null,
            tcgplayerId,
            tcgapiDevId: card.id,
          },
        });
      } else {
        await prisma.card.create({
          data: {
            game: CardGame.POKEMON,
            name: card.name,
            setName: set.name,
            setCode,
            cardNumber,
            rarity: card.rarity ?? null,
            imageUrl: card.image_url ?? null,
            tcgplayerId,
            tcgapiDevId: card.id,
          },
        });
      }

      totalCardsUpserted++;
    }

    // Pause between sets
    if (sets.indexOf(set) < sets.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, SET_DELAY_MS));
    }
  }

  const finalCardCount = await prisma.card.count();
  const finalSetCount = await prisma.cardSet.count();

  logger.info("");
  logger.info("=== SEED COMPLETE ===");
  logger.info(`  Sets upserted  : ${totalSetsUpserted}`);
  logger.info(`  Cards upserted : ${totalCardsUpserted}`);
  logger.info(`  Cards skipped  : ${totalCardsSkipped}`);
  logger.info(`  Total in DB    : ${finalCardCount} cards across ${finalSetCount} sets`);
}

seedFromTcgApiDev()
  .then(() => {
    logger.info("Seed script finished successfully.");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Seed script failed", { error });
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

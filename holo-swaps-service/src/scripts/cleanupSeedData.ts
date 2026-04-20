import { parse } from "csv-parse";
import fs from "fs";
import path from "path";
import { prisma } from "@/config/prisma";
import { logger } from "@/utils/logger";

interface CSVRow {
  "Expansion Code": string;
  Expansion: string;
  Game: string;
  Name: string;
  Number: string;
  "TCGPlayer ID": string;
  Rarity: string;
}

async function cleanupSeedData() {
  const csvPath = path.join(__dirname, "../../data/Pokemon_complete.csv");

  logger.info("Starting cleanup of seeded data...");
  logger.info(`Reading CSV from: ${csvPath}`);

  const records: CSVRow[] = [];

  // Parse CSV to get all TCGPlayer IDs that were seeded
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(
        parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        })
      )
      .on("data", (row: CSVRow) => {
        records.push(row);
      })
      .on("error", (error) => reject(error))
      .on("end", () => resolve());
  });

  logger.info(`Parsed ${records.length} records from CSV`);

  // Extract TCGPlayer IDs and set codes
  const tcgplayerIds = records
    .map((row) => row["TCGPlayer ID"])
    .filter((id) => id);
  const setCodes = [
    ...new Set(
      records.map((row) => row["Expansion Code"]).filter((code) => code)
    ),
  ];

  logger.info(
    `Found ${tcgplayerIds.length} TCGPlayer IDs and ${setCodes.length} set codes to potentially clean up`
  );

  // Find cards that match the CSV AND are NOT owned by any user
  const cardsToDelete = await prisma.card.findMany({
    where: {
      tcgplayerId: { in: tcgplayerIds },
      collectionItems: { none: {} }, // Not in any user collection
      wants: { none: {} }, // Not in any user want list
      priceAlerts: { none: {} }, // Not in any price alerts
    },
    select: { id: true, name: true, tcgplayerId: true },
  });

  logger.info(
    `Found ${cardsToDelete.length} cards safe to delete (not owned/wanted by any user)`
  );

  if (cardsToDelete.length === 0) {
    logger.info("No cards to delete. Cleanup complete.");
    await prisma.$disconnect();
    return;
  }

  const cardIdsToDelete = cardsToDelete.map((c) => c.id);

  // Step 1: Delete price history for these cards
  logger.info("Deleting price history...");
  const priceHistoryResult = await prisma.cardPriceHistory.deleteMany({
    where: { cardId: { in: cardIdsToDelete } },
  });
  logger.info(`Deleted ${priceHistoryResult.count} price history records`);

  // Step 2: Delete the cards
  logger.info("Deleting cards...");
  const cardsResult = await prisma.card.deleteMany({
    where: { id: { in: cardIdsToDelete } },
  });
  logger.info(`Deleted ${cardsResult.count} cards`);

  // Step 3: Delete orphaned card sets (sets with no remaining cards)
  logger.info("Checking for orphaned card sets...");
  let orphanedSetsCount = 0;

  for (const setCode of setCodes) {
    const remainingCards = await prisma.card.count({
      where: { setCode },
    });

    if (remainingCards === 0) {
      await prisma.cardSet.deleteMany({
        where: { setCode },
      });
      orphanedSetsCount++;
      logger.info(`Deleted orphaned set: ${setCode}`);
    }
  }

  logger.info(`Deleted ${orphanedSetsCount} orphaned card sets`);

  logger.info("Cleanup completed!");
  logger.info(
    `Summary: ${cardsResult.count} cards, ${priceHistoryResult.count} price records, ${orphanedSetsCount} sets deleted`
  );

  await prisma.$disconnect();
}

// Run the cleanup
cleanupSeedData()
  .then(() => {
    logger.info("Cleanup script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Cleanup script failed", { error });
    console.error(error);
    process.exit(1);
  });

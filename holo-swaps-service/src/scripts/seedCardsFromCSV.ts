import { parse } from "csv-parse";
import fs from "fs";
import path from "path";
import { prisma } from "@/config/prisma";
import { CardGame } from "@prisma/client";
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

async function seedCardsFromCSV() {
  const csvPath = path.join(__dirname, "../../data/Pokemon_complete.csv");

  logger.info("Starting card seed from CSV...");
  logger.info(`Reading CSV from: ${csvPath}`);

  const records: CSVRow[] = [];

  // Parse CSV file
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

  // Group by set to create CardSet records first
  const uniqueSets = new Map<
    string,
    { setCode: string; name: string; game: CardGame }
  >();

  records.forEach((row) => {
    const setCode = row["Expansion Code"];
    if (setCode && !uniqueSets.has(setCode)) {
      uniqueSets.set(setCode, {
        setCode,
        name: row.Expansion,
        game: CardGame.POKEMON,
      });
    }
  });

  logger.info(`Creating ${uniqueSets.size} card sets...`);

  // Create CardSet records
  let setsCreated = 0;
  let setsUpdated = 0;

  for (const setData of uniqueSets.values()) {
    const existing = await prisma.cardSet.findUnique({
      where: { setCode: setData.setCode },
    });

    if (existing) {
      await prisma.cardSet.update({
        where: { setCode: setData.setCode },
        data: {
          name: setData.name,
          game: setData.game,
        },
      });
      setsUpdated++;
    } else {
      await prisma.cardSet.create({
        data: setData,
      });
      setsCreated++;
    }
  }

  logger.info(`Sets: ${setsCreated} created, ${setsUpdated} updated`);

  // Create Card records
  logger.info(`Creating ${records.length} cards...`);

  let cardsCreated = 0;
  let cardsUpdated = 0;
  let cardsSkipped = 0;

  for (const row of records) {
    const setCode = row["Expansion Code"];
    const cardNumber = row.Number;
    const tcgplayerId = row["TCGPlayer ID"];

    // Skip if missing critical data
    if (!setCode || !row.Name || !tcgplayerId) {
      cardsSkipped++;
      continue;
    }

    // Check if card exists (by setCode + cardNumber or by tcgplayerId)
    const existing = await prisma.card.findFirst({
      where: {
        OR: [
          { setCode, cardNumber: cardNumber || "" },
          { tcgplayerId },
        ],
      },
    });

    const cardData = {
      game: CardGame.POKEMON,
      name: row.Name,
      setName: row.Expansion,
      setCode,
      cardNumber: cardNumber || "",
      rarity: row.Rarity || null,
      tcgplayerId,
      imageUrl: null, // Can be fetched later via API
    };

    if (existing) {
      await prisma.card.update({
        where: { id: existing.id },
        data: cardData,
      });
      cardsUpdated++;
    } else {
      await prisma.card.create({
        data: cardData,
      });
      cardsCreated++;
    }

    // Log progress every 100 cards
    if ((cardsCreated + cardsUpdated + cardsSkipped) % 100 === 0) {
      logger.info(
        `Progress: ${cardsCreated} created, ${cardsUpdated} updated, ${cardsSkipped} skipped`
      );
    }
  }

  logger.info("Seed completed!");
  logger.info(
    `Final stats: ${cardsCreated} cards created, ${cardsUpdated} cards updated, ${cardsSkipped} cards skipped`
  );
  logger.info(`Total cards in database: ${cardsCreated + cardsUpdated}`);

  await prisma.$disconnect();
}

// Run the seed
seedCardsFromCSV()
  .then(() => {
    logger.info("Seed script finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Seed script failed", { error });
    console.error(error);
    process.exit(1);
  });

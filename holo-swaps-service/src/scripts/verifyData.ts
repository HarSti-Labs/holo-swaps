import { prisma } from "@/config/prisma";
import { logger } from "@/utils/logger";

async function verifyData() {
  logger.info("Verifying seeded data...");

  // Count cards
  const totalCards = await prisma.card.count();
  logger.info(`Total cards in database: ${totalCards}`);

  // Count sets
  const totalSets = await prisma.cardSet.count();
  logger.info(`Total card sets in database: ${totalSets}`);

  // Show first 5 cards
  const sampleCards = await prisma.card.findMany({
    take: 5,
    select: {
      id: true,
      name: true,
      setName: true,
      setCode: true,
      cardNumber: true,
      rarity: true,
      tcgplayerId: true,
    },
  });

  logger.info("Sample cards:");
  console.table(sampleCards);

  // Show all sets
  const sets = await prisma.cardSet.findMany({
    select: {
      setCode: true,
      name: true,
      game: true,
    },
  });

  logger.info("Card sets:");
  console.table(sets);

  await prisma.$disconnect();
}

verifyData()
  .then(() => {
    logger.info("Verification complete");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Verification failed", { error });
    console.error(error);
    process.exit(1);
  });

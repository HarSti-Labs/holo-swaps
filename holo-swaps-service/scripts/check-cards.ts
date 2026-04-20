import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cardCount = await prisma.card.count();
  const setCount = await prisma.cardSet.count();

  console.log(`Cards in database: ${cardCount}`);
  console.log(`Sets in database: ${setCount}`);

  if (cardCount > 0) {
    const sampleCards = await prisma.card.findMany({ take: 5 });
    console.log('\nSample cards:');
    sampleCards.forEach((card) => {
      console.log(`- ${card.name} (${card.setName}) - TCG ID: ${card.tcgplayerId}`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

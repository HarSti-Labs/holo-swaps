import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Applying UserFollow migration...');

  try {
    // Create table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_follows" (
          "id" TEXT NOT NULL,
          "followerId" TEXT NOT NULL,
          "followingId" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('✓ Table created');

    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "user_follows_followerId_idx" ON "user_follows"("followerId")
    `);
    console.log('✓ followerId index created');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "user_follows_followingId_idx" ON "user_follows"("followingId")
    `);
    console.log('✓ followingId index created');

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "user_follows_followerId_followingId_key" ON "user_follows"("followerId", "followingId")
    `);
    console.log('✓ Unique constraint created');

    // Add foreign keys separately (they may already exist)
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "user_follows"
        ADD CONSTRAINT "user_follows_followerId_fkey"
        FOREIGN KEY ("followerId") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('✓ Added followerId foreign key');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✓ followerId foreign key already exists');
      } else {
        throw e;
      }
    }

    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "user_follows"
        ADD CONSTRAINT "user_follows_followingId_fkey"
        FOREIGN KEY ("followingId") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
      `);
      console.log('✓ Added followingId foreign key');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✓ followingId foreign key already exists');
      } else {
        throw e;
      }
    }

    console.log('\n✅ Migration completed successfully!');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

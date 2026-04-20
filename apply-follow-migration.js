const { Client } = require('pg');
require('dotenv').config({ path: './holo-swaps-service/.env' });

const migration = `
-- CreateTable
CREATE TABLE IF NOT EXISTS "user_follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_follows_followerId_idx" ON "user_follows"("followerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_follows_followingId_idx" ON "user_follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_follows_followerId_followingId_key" ON "user_follows"("followerId", "followingId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_follows_followerId_fkey'
  ) THEN
    ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_follows_followingId_fkey'
  ) THEN
    ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
`;

async function applyMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    await client.query(migration);
    console.log('✓ Migration applied successfully!');
    console.log('\nuser_follows table created with:');
    console.log('  - Primary key on id');
    console.log('  - Indexes on followerId and followingId');
    console.log('  - Unique constraint on (followerId, followingId)');
    console.log('  - Foreign keys to users table');

  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();

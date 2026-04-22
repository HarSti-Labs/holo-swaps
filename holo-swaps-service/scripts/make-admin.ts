import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: npx tsx scripts/make-admin.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, username: true, email: true, isAdmin: true },
  });

  if (!user) {
    console.log(`No user found with email "${email}"`);
    process.exit(1);
  }

  console.log('\nFound user:');
  console.log('Username:', user.username);
  console.log('Email:   ', user.email);
  console.log('isAdmin: ', user.isAdmin);

  if (user.isAdmin) {
    console.log('\n✅ User is already an admin.');
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
  });

  console.log('\n✅ Admin access granted to', user.username);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

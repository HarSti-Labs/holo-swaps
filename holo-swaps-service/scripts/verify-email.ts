import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get your user by username or email
  const username = process.argv[2];

  if (!username) {
    console.log('Usage: npx tsx scripts/verify-email.ts <username>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      email: true,
      isEmailVerified: true,
    },
  });

  if (!user) {
    console.log(`User "${username}" not found`);
    process.exit(1);
  }

  console.log('\nCurrent user status:');
  console.log('Username:', user.username);
  console.log('Email:', user.email);
  console.log('Email Verified:', user.isEmailVerified);

  if (!user.isEmailVerified) {
    console.log('\nVerifying email...');
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });
    console.log('✅ Email verified successfully!');
  } else {
    console.log('\n✅ Email is already verified!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

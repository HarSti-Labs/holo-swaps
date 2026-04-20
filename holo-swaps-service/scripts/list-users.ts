import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      username: true,
      email: true,
      isEmailVerified: true,
    },
    take: 10,
  });

  console.log('Users in database:');
  users.forEach((user) => {
    console.log(`- ${user.username} (${user.email}) - Verified: ${user.isEmailVerified}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

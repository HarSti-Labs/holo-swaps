import { User } from "@prisma/client";
import { prisma } from "@/config/prisma";
import {
  IUserRepository,
  CreateUserData,
  UpdateUserData,
} from "@/repositories/interfaces/IUserRepository";
import { SafeUser } from "@/types";

const selectSafeUser = {
  id: true,
  email: true,
  username: true,
  isEmailVerified: true,
  avatarUrl: true,
  bio: true,
  location: true,
  reputationScore: true,
  tradeCount: true,
  stripeCustomerId: true,
  stripeAccountId: true,
  stripeAccountVerified: true,
  isAdmin: true,
  isBanned: true,
  emailOnTradeProposed: true,
  emailOnTradeCountered: true,
  emailOnTradeAccepted: true,
  emailOnTradeDeclined: true,
  emailOnTradeCancelled: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: false,
};

export class UserRepository implements IUserRepository {
  async findById(id: string): Promise<SafeUser | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: selectSafeUser,
    });
    return user as SafeUser | null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findByUsername(username: string): Promise<SafeUser | null> {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" } },
      select: selectSafeUser,
    });
    return user as SafeUser | null;
  }

  async create(data: CreateUserData): Promise<SafeUser> {
    const user = await prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        username: data.username.toLowerCase(),
      },
      select: selectSafeUser,
    });
    return user as SafeUser;
  }

  async update(id: string, data: UpdateUserData): Promise<SafeUser> {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: selectSafeUser,
    });
    return user as SafeUser;
  }

  async updateStripeAccount(id: string, stripeAccountId: string): Promise<SafeUser> {
    const user = await prisma.user.update({
      where: { id },
      data: { stripeAccountId, stripeAccountVerified: true },
      select: selectSafeUser,
    });
    return user as SafeUser;
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }
}

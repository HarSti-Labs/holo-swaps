import { User } from "@prisma/client";
import { SafeUser } from "@/types";

export interface IUserRepository {
  findById(id: string): Promise<SafeUser | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<SafeUser | null>;
  create(data: CreateUserData): Promise<SafeUser>;
  update(id: string, data: UpdateUserData): Promise<SafeUser>;
  updateStripeAccount(id: string, stripeAccountId: string): Promise<SafeUser>;
  delete(id: string): Promise<void>;
}

export interface CreateUserData {
  email: string;
  username: string;
  passwordHash: string;
  avatarUrl?: string;
  location?: string;
}

export interface UpdateUserData {
  username?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  stripeCustomerId?: string;
  stripeAccountId?: string;
  stripeAccountVerified?: boolean;
}

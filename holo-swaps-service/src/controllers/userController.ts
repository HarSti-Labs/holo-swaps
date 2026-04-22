import { Request, Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { UserRepository } from "@/repositories/implementations/UserRepository";
import { sendSuccess } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { z } from "zod";
import { prisma } from "@/config/prisma";
import { CollectionRepository } from "@/repositories/implementations/CollectionRepository";
import { CardStatus } from "@prisma/client";

const collectionRepo = new CollectionRepository();

const userRepo = new UserRepository();

const updateProfileSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
  collectionVisibility: z.enum(["PUBLIC", "PRIVATE", "FOLLOWERS_ONLY"]).optional(),
});

const addressSchema = z.object({
  label: z.string().max(50).optional(),
  fullName: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().default("US"),
  isDefault: z.boolean().optional(),
});

const reportSchema = z.object({
  reason: z.string().min(1).max(200),
  details: z.string().max(1000).optional(),
  tradeId: z.string().uuid().optional(),
});

// GET /api/users/:username
export const getPublicProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await userRepo.findByUsername(req.params.username);
  if (!user || user.isBanned) throw ApiError.notFound("User not found");

  // Check if current user (if authenticated) is following this user
  const currentUserId = (req as any).user?.id;

  const [reviewCount, avgRating, followerCount, followingCount] = await prisma.$transaction([
    prisma.tradeReview.count({ where: { subjectId: user.id } }),
    prisma.tradeReview.aggregate({
      where: { subjectId: user.id },
      _avg: { rating: true },
    }),
    prisma.userFollow.count({ where: { followingId: user.id } }),
    prisma.userFollow.count({ where: { followerId: user.id } }),
  ]);

  // Check following status separately (not a Prisma promise chain)
  let isFollowing = false;
  if (currentUserId) {
    const followRecord = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: user.id,
        },
      },
    });
    isFollowing = !!followRecord;
  }

  sendSuccess(res, {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    location: user.location,
    reputationScore: user.reputationScore,
    tradeCount: user.tradeCount,
    reviewCount,
    avgRating: avgRating._avg.rating ?? null,
    followerCount,
    followingCount,
    isFollowing,
    createdAt: user.createdAt,
  });
};

// PATCH /api/users/me
export const updateProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  if (parsed.data.username) {
    parsed.data.username = parsed.data.username.toLowerCase();
    const existing = await userRepo.findByUsername(parsed.data.username);
    if (existing && existing.id !== req.user!.id) {
      throw ApiError.conflict("Username already taken");
    }
  }

  const updated = await userRepo.update(req.user!.id, parsed.data);
  sendSuccess(res, updated, "Profile updated");
};

// GET /api/users/me/addresses
export const getAddresses = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const addresses = await prisma.userAddress.findMany({
    where: { userId: req.user!.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
  sendSuccess(res, addresses);
};

// POST /api/users/me/addresses
export const addAddress = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  // Auto-default if this is the user's first address, or if explicitly requested
  const existingCount = await prisma.userAddress.count({ where: { userId: req.user!.id } });
  const shouldDefault = parsed.data.isDefault || existingCount === 0;

  if (shouldDefault) {
    await prisma.userAddress.updateMany({
      where: { userId: req.user!.id },
      data: { isDefault: false },
    });
  }

  const address = await prisma.userAddress.create({
    data: { userId: req.user!.id, ...parsed.data, isDefault: shouldDefault },
  });

  sendSuccess(res, address, "Address added");
};

// PATCH /api/users/me/addresses/:addressId
export const updateAddress = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const addr = await prisma.userAddress.findUnique({
    where: { id: req.params.addressId },
  });
  if (!addr) throw ApiError.notFound("Address not found");
  if (addr.userId !== req.user!.id) throw ApiError.forbidden();

  const parsed = addressSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  if (parsed.data.isDefault) {
    await prisma.userAddress.updateMany({
      where: { userId: req.user!.id },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.userAddress.update({
    where: { id: req.params.addressId },
    data: parsed.data,
  });
  sendSuccess(res, updated, "Address updated");
};

// DELETE /api/users/me/addresses/:addressId
export const deleteAddress = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const addr = await prisma.userAddress.findUnique({
    where: { id: req.params.addressId },
  });
  if (!addr) throw ApiError.notFound("Address not found");
  if (addr.userId !== req.user!.id) throw ApiError.forbidden();

  await prisma.userAddress.delete({ where: { id: req.params.addressId } });

  // If we just deleted the default, promote the next address
  if (addr.isDefault) {
    const next = await prisma.userAddress.findFirst({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.userAddress.update({
        where: { id: next.id },
        data: { isDefault: true },
      });
    }
  }

  sendSuccess(res, null, "Address deleted");
};

// POST /api/users/:userId/block
export const blockUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  if (userId === req.user!.id) throw ApiError.badRequest("You cannot block yourself");

  const target = await userRepo.findById(userId);
  if (!target) throw ApiError.notFound("User not found");

  await prisma.userBlock.upsert({
    where: {
      blockerId_blockedId: { blockerId: req.user!.id, blockedId: userId },
    },
    create: { blockerId: req.user!.id, blockedId: userId },
    update: {},
  });

  sendSuccess(res, null, "User blocked");
};

// DELETE /api/users/:userId/block
export const unblockUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  await prisma.userBlock.deleteMany({
    where: { blockerId: req.user!.id, blockedId: req.params.userId },
  });
  sendSuccess(res, null, "User unblocked");
};

// POST /api/users/:userId/report
export const reportUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  if (userId === req.user!.id) throw ApiError.badRequest("You cannot report yourself");

  const target = await userRepo.findById(userId);
  if (!target) throw ApiError.notFound("User not found");

  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  await prisma.userReport.create({
    data: { reporterId: req.user!.id, reportedId: userId, ...parsed.data },
  });

  sendSuccess(res, null, "Report submitted");
};

// POST /api/users/:userId/follow
export const followUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { userId } = req.params;
  if (userId === req.user!.id) throw ApiError.badRequest("You cannot follow yourself");

  const target = await userRepo.findById(userId);
  if (!target) throw ApiError.notFound("User not found");

  await prisma.userFollow.upsert({
    where: {
      followerId_followingId: { followerId: req.user!.id, followingId: userId },
    },
    create: { followerId: req.user!.id, followingId: userId },
    update: {},
  });

  sendSuccess(res, null, "User followed");
};

// DELETE /api/users/:userId/follow
export const unfollowUser = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  await prisma.userFollow.deleteMany({
    where: { followerId: req.user!.id, followingId: req.params.userId },
  });
  sendSuccess(res, null, "User unfollowed");
};

// GET /api/users/:username/followers
export const getFollowers = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await userRepo.findByUsername(req.params.username);
  if (!user || user.isBanned) throw ApiError.notFound("User not found");

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [data, total] = await prisma.$transaction([
    prisma.userFollow.findMany({
      where: { followingId: user.id },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            reputationScore: true,
            tradeCount: true,
            tier: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.userFollow.count({ where: { followingId: user.id } }),
  ]);

  sendSuccess(res, {
    data: data.map((f) => f.follower),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

// GET /api/users/:username/following
export const getFollowing = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await userRepo.findByUsername(req.params.username);
  if (!user || user.isBanned) throw ApiError.notFound("User not found");

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [data, total] = await prisma.$transaction([
    prisma.userFollow.findMany({
      where: { followerId: user.id },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            reputationScore: true,
            tradeCount: true,
            tier: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.userFollow.count({ where: { followerId: user.id } }),
  ]);

  sendSuccess(res, {
    data: data.map((f) => f.following),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

// GET /api/users/:userId/collection
export const getPublicCollection = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { username } = req.params;

  const targetUser = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true, isBanned: true, collectionVisibility: true },
  });
  if (!targetUser || targetUser.isBanned) throw ApiError.notFound("User not found");

  if (targetUser.collectionVisibility === "PRIVATE") {
    throw ApiError.forbidden("This collection is private");
  }

  if (targetUser.collectionVisibility === "FOLLOWERS_ONLY") {
    // TODO: check if the requesting user follows this user once followers feature is built
    throw ApiError.forbidden("This collection is only visible to followers");
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const q = (req.query.q as string) || undefined;

  const result = await collectionRepo.findByUserId(targetUser.id, {
    page,
    limit,
    status: CardStatus.AVAILABLE,
    q,
  });
  sendSuccess(res, result);
};

// GET /api/users/:username/reviews
export const getUserReviews = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await userRepo.findByUsername(req.params.username);
  if (!user || user.isBanned) throw ApiError.notFound("User not found");

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const [data, total] = await prisma.$transaction([
    prisma.tradeReview.findMany({
      where: { subjectId: user.id },
      include: { author: { omit: { passwordHash: true } } },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.tradeReview.count({ where: { subjectId: user.id } }),
  ]);

  sendSuccess(res, {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
};

// GET /api/users/leaderboard
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  const users = await prisma.user.findMany({
    where: { isBanned: false },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      reputationScore: true,
      tier: true,
      tradeCount: true,
    },
    orderBy: [{ reputationScore: "desc" }, { tradeCount: "desc" }],
    take: limit,
  });

  sendSuccess(res, users);
};

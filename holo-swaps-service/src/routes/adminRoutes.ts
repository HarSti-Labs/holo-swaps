import { Router, Request, Response } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth";
import { sendSuccess } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { prisma } from "@/config/prisma";
import { TradeStatus } from "@prisma/client";
import { AuthenticatedRequest } from "@/types";

const router = Router();

router.use(authenticate, requireAdmin);

// GET /api/admin/users?search=&page=&limit=
router.get("/users", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const search = req.query.search as string | undefined;

  const where = search
    ? {
        OR: [
          { username: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      omit: { passwordHash: true },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where }),
  ]);

  sendSuccess(res, { data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// PATCH /api/admin/users/:userId/ban
router.patch("/users/:userId/ban", async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
  if (!user) throw ApiError.notFound("User not found");
  if (user.isAdmin) throw ApiError.badRequest("Cannot ban an admin account");

  const updated = await prisma.user.update({
    where: { id: req.params.userId },
    data: { isBanned: true },
    omit: { passwordHash: true },
  });

  sendSuccess(res, updated, "User banned");
});

// PATCH /api/admin/users/:userId/unban
router.patch("/users/:userId/unban", async (req: Request, res: Response) => {
  const updated = await prisma.user.update({
    where: { id: req.params.userId },
    data: { isBanned: false },
    omit: { passwordHash: true },
  });

  sendSuccess(res, updated, "User unbanned");
});

// GET /api/admin/trades?status=&page=&limit=
router.get("/trades", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;
  const status = req.query.status as TradeStatus | undefined;

  const where = status ? { status } : {};

  const [data, total] = await prisma.$transaction([
    prisma.trade.findMany({
      where,
      include: {
        proposer: { omit: { passwordHash: true } },
        receiver: { omit: { passwordHash: true } },
        dispute: true,
      },
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.trade.count({ where }),
  ]);

  sendSuccess(res, { data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// GET /api/admin/disputes?page=&limit=
router.get("/disputes", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [data, total] = await prisma.$transaction([
    prisma.dispute.findMany({
      include: {
        trade: {
          include: {
            proposer: { omit: { passwordHash: true } },
            receiver: { omit: { passwordHash: true } },
          },
        },
        openedBy: { omit: { passwordHash: true } },
        evidence: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.dispute.count(),
  ]);

  sendSuccess(res, { data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// GET /api/admin/reports?page=&limit=
router.get("/reports", async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  const [data, total] = await prisma.$transaction([
    prisma.userReport.findMany({
      include: {
        reporter: { omit: { passwordHash: true } },
        reported: { omit: { passwordHash: true } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.userReport.count(),
  ]);

  sendSuccess(res, { data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// PATCH /api/admin/reports/:reportId/resolve
router.patch("/reports/:reportId/resolve", async (req: AuthenticatedRequest, res: Response) => {
  const report = await prisma.userReport.findUnique({
    where: { id: req.params.reportId },
  });
  if (!report) throw ApiError.notFound("Report not found");

  const updated = await prisma.userReport.update({
    where: { id: req.params.reportId },
    data: { isResolved: true },
  });

  sendSuccess(res, updated, "Report resolved");
});

export default router;

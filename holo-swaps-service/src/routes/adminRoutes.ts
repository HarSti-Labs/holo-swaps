import { Router, Request, Response } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth";
import { sendSuccess } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { prisma } from "@/config/prisma";
import { TradeStatus } from "@prisma/client";
import { AuthenticatedRequest } from "@/types";
import { listAllTickets } from "@/controllers/supportController";
import { selectSafeUser } from "@/repositories/implementations/UserRepository";
import { EmailService } from "@/services/implementations/EmailService";
import { StripeService } from "@/services/implementations/StripeService";
import { logger } from "@/utils/logger";
import { config } from "@/config";

const emailService = new EmailService();
const stripeService = new StripeService();

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
      select: selectSafeUser,
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
    select: selectSafeUser,
  });

  sendSuccess(res, updated, "User banned");
});

// PATCH /api/admin/users/:userId/unban
router.patch("/users/:userId/unban", async (req: Request, res: Response) => {
  const updated = await prisma.user.update({
    where: { id: req.params.userId },
    data: { isBanned: false },
    select: selectSafeUser,
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
        proposer: { select: selectSafeUser },
        receiver: { select: selectSafeUser },
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
            proposer: { select: selectSafeUser },
            receiver: { select: selectSafeUser },
          },
        },
        openedBy: { select: selectSafeUser },
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
        reporter: { select: selectSafeUser },
        reported: { select: selectSafeUser },
        messages: { orderBy: { createdAt: "asc" } },
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.userReport.count(),
  ]);

  sendSuccess(res, { data, total, page, limit, totalPages: Math.ceil(total / limit) });
});

// GET /api/admin/reports/:reportId
router.get("/reports/:reportId", async (req: Request, res: Response) => {
  const report = await prisma.userReport.findUnique({
    where: { id: req.params.reportId },
    include: {
      reporter: { select: selectSafeUser },
      reported: { select: selectSafeUser },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!report) throw ApiError.notFound("Report not found");
  sendSuccess(res, report);
});

// POST /api/admin/reports/:reportId/messages
router.post("/reports/:reportId/messages", async (req: AuthenticatedRequest, res: Response) => {
  const { body } = req.body;
  if (!body?.trim()) throw ApiError.badRequest("Message body is required");

  const report = await prisma.userReport.findUnique({
    where: { id: req.params.reportId },
    include: { reporter: { select: { email: true, username: true } } },
  });
  if (!report) throw ApiError.notFound("Report not found");

  const message = await prisma.userReportMessage.create({
    data: { reportId: report.id, body: body.trim(), isAdminReply: true },
  });

  const reportUrl = `${config.frontend.url}/admin/reports/${report.id}`;
  emailService.sendReportAdminReplyEmail(
    report.reporter.email,
    report.reporter.username,
    body.trim(),
    reportUrl
  ).catch(() => {});

  sendSuccess(res, message, "Message sent");
});

// GET /api/admin/support
router.get("/support", listAllTickets);

// PATCH /api/admin/reports/:reportId/resolve
router.patch("/reports/:reportId/resolve", async (req: AuthenticatedRequest, res: Response) => {
  const { note } = req.body;

  const report = await prisma.userReport.findUnique({
    where: { id: req.params.reportId },
    include: {
      reporter: { select: { email: true, username: true } },
      reported: { select: { username: true } },
    },
  });
  if (!report) throw ApiError.notFound("Report not found");

  const updated = await prisma.userReport.update({
    where: { id: req.params.reportId },
    data: {
      isResolved: true,
      resolvedNote: note?.trim() || null,
    },
    include: {
      reporter: { select: selectSafeUser },
      reported: { select: selectSafeUser },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  emailService.sendReportResolvedEmail(
    report.reporter.email,
    report.reporter.username,
    report.reported.username,
    report.reason,
    note?.trim() || null
  ).catch(() => {});

  sendSuccess(res, updated, "Report resolved");
});

// POST /api/admin/backfill-stripe-customers
router.post("/backfill-stripe-customers", authenticate, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const users = await prisma.user.findMany({
    where: { stripeCustomerId: null },
    select: { id: true, email: true },
  });

  let created = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const customerId = await stripeService.createCustomer(user.id, user.email);
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
      created++;
    } catch (err) {
      logger.error("Backfill: failed to create Stripe customer", { userId: user.id, err });
      failed++;
    }
  }

  sendSuccess(res, { total: users.length, created, failed }, "Stripe customer backfill complete");
});

export default router;

import { Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { ApiError } from "@/utils/ApiError";
import { EmailService } from "@/services/implementations/EmailService";
import { sendSuccess } from "@/utils/response";
import { AuthenticatedRequest } from "@/types";
import { prisma } from "@/config/prisma";

const emailService = new EmailService();

const TRADE_RELATED_CATEGORIES = ["TRADE_DISPUTE", "CARD_CONDITION", "SHIPPING_TRACKING"];

const supportSchema = z.object({
  email: z.string().email("A valid email address is required"),
  category: z.enum([
    "TRADE_DISPUTE", "CARD_CONDITION", "SHIPPING_TRACKING",
    "ACCOUNT_ISSUE", "BILLING_PAYMENT", "BUG_REPORT",
    "ABUSE_FRAUD", "GENERAL_QUESTION", "OTHER",
  ]),
  urgency: z.enum(["NORMAL", "HIGH", "URGENT"]),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(120),
  description: z.string().min(20, "Please provide at least 20 characters of detail").max(5000),
  tradeCode: z.string().max(20).optional().nullable(),
  userAgent: z.string().max(500).optional().nullable(),
});

function generateTicketNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `SUP-${timestamp}-${random}`;
}

// POST /api/support
export const submitSupportTicket = async (req: Request, res: Response): Promise<void> => {
  const parsed = supportSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest("Validation failed", parsed.error.errors.map((e) => e.message));
  }

  const { email, category, urgency, subject, description, tradeCode, userAgent } = parsed.data;

  if (TRADE_RELATED_CATEGORIES.includes(category) && tradeCode) {
    if (!/^TRD-\d+$/i.test(tradeCode.trim())) {
      throw ApiError.badRequest("Trade code must be in the format TRD-XXXXX");
    }
  }

  const authUser = (req as AuthenticatedRequest).user ?? null;
  const username = authUser?.username ?? null;
  const userId = authUser?.id ?? null;

  const ticketNumber = generateTicketNumber();
  const resolvedUserAgent = (userAgent ?? req.headers["user-agent"] ?? null) as string | null;

  await prisma.supportTicket.create({
    data: {
      ticketNumber, userId, email, category, urgency,
      subject, description,
      tradeCode: tradeCode ?? null,
      userAgent: resolvedUserAgent,
    },
  });

  // Email to admin
  await emailService.sendSupportTicketEmail({
    ticketNumber, username, email, category, urgency,
    subject, description,
    tradeCode: tradeCode ?? null,
    userAgent: resolvedUserAgent,
  });

  // Confirmation email to user
  emailService.sendTicketConfirmation(email, ticketNumber, subject);

  sendSuccess(res, { ticketNumber }, "Support ticket submitted successfully");
};

// GET /api/support/my
export const getMyTickets = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as AuthenticatedRequest).user!.id;

  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      ticketNumber: true,
      category: true,
      urgency: true,
      subject: true,
      status: true,
      tradeCode: true,
      createdAt: true,
    },
  });

  sendSuccess(res, tickets);
};

// GET /api/support/ticket/:ticketNumber
export const getTicket = async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as AuthenticatedRequest).user;
  const { ticketNumber } = req.params;

  const ticket = await prisma.supportTicket.findUnique({
    where: { ticketNumber },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          isAdminReply: true,
          createdAt: true,
          author: { select: { username: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!ticket) throw ApiError.notFound("Ticket not found");

  // Only the ticket owner or an admin can view
  if (!authUser?.isAdmin && ticket.userId !== authUser?.id) {
    throw ApiError.forbidden();
  }

  sendSuccess(res, ticket);
};

// POST /api/support/ticket/:ticketNumber/messages
export const postMessage = async (req: Request, res: Response): Promise<void> => {
  const authUser = (req as AuthenticatedRequest).user!;
  const { ticketNumber } = req.params;
  const { body } = req.body;

  if (!body || typeof body !== "string" || body.trim().length < 1) {
    throw ApiError.badRequest("Message body is required");
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { ticketNumber } });
  if (!ticket) throw ApiError.notFound("Ticket not found");

  // Only owner or admin can post
  if (!authUser.isAdmin && ticket.userId !== authUser.id) {
    throw ApiError.forbidden();
  }

  // Users cannot reply to resolved tickets
  if (!authUser.isAdmin && ticket.status === "RESOLVED") {
    throw ApiError.badRequest("This ticket has been resolved. Please open a new ticket if you need further help.");
  }

  const message = await prisma.supportTicketMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: authUser.id,
      body: body.trim(),
      isAdminReply: authUser.isAdmin,
    },
    select: {
      id: true,
      body: true,
      isAdminReply: true,
      createdAt: true,
      author: { select: { username: true, avatarUrl: true } },
    },
  });

  // If admin replied, email the user
  if (authUser.isAdmin && ticket.email) {
    emailService.sendAdminReply(ticket.email, ticket.ticketNumber, ticket.subject, body.trim());
  }

  // If user replied, notify admin via email (fire-and-forget)
  if (!authUser.isAdmin) {
    emailService.sendSupportTicketEmail({
      ticketNumber: ticket.ticketNumber,
      username: authUser.username,
      email: ticket.email,
      category: ticket.category,
      urgency: ticket.urgency,
      subject: `[User Reply] ${ticket.subject}`,
      description: body.trim(),
      tradeCode: null,
      userAgent: null,
    });
  }

  sendSuccess(res, message, "Message sent");
};

// PATCH /api/support/ticket/:ticketNumber/status  (admin only)
export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  const { ticketNumber } = req.params;
  const { status } = req.body;

  if (!["OPEN", "IN_PROGRESS", "RESOLVED"].includes(status)) {
    throw ApiError.badRequest("Invalid status");
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { ticketNumber } });
  if (!ticket) throw ApiError.notFound("Ticket not found");

  const updated = await prisma.supportTicket.update({
    where: { ticketNumber },
    data: { status },
  });

  // Email user when resolved
  if (status === "RESOLVED" && ticket.email) {
    emailService.sendTicketResolved(ticket.email, ticket.ticketNumber, ticket.subject);
  }

  sendSuccess(res, updated, "Status updated");
};

// GET /api/admin/support  (admin only)
export const listAllTickets = async (req: Request, res: Response): Promise<void> => {
  const status = req.query.status as string | undefined;
  const urgency = req.query.urgency as string | undefined;
  const category = req.query.category as string | undefined;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 25;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (urgency) where.urgency = urgency;
  if (category) where.category = category;

  const [tickets, total] = await prisma.$transaction([
    prisma.supportTicket.findMany({
      where,
      orderBy: [{ urgency: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        ticketNumber: true,
        email: true,
        category: true,
        urgency: true,
        subject: true,
        status: true,
        tradeCode: true,
        createdAt: true,
        user: { select: { username: true } },
        messages: { select: { id: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.supportTicket.count({ where }),
  ]);

  sendSuccess(res, { tickets, total, page, limit, totalPages: Math.ceil(total / limit) });
};

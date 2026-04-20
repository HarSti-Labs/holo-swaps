import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { sendSuccess, sendCreated } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { z } from "zod";
import { prisma } from "@/config/prisma";
import { DisputeStatus, TradeStatus } from "@prisma/client";

const openDisputeSchema = z.object({
  reason: z.string().min(1).max(200),
  details: z.string().max(2000).optional(),
});

const evidenceSchema = z.object({
  description: z.string().max(1000).optional(),
  mediaUrls: z.array(z.string().url()).min(1).max(10),
});

const resolveSchema = z.object({
  resolution: z.string().min(1).max(2000),
  status: z.enum([
    DisputeStatus.RESOLVED_FOR_PROPOSER,
    DisputeStatus.RESOLVED_FOR_RECEIVER,
    DisputeStatus.RESOLVED_MUTUAL,
    DisputeStatus.CLOSED,
  ]),
});

const DISPUTE_ELIGIBLE_STATUSES: TradeStatus[] = [
  TradeStatus.BOTH_SHIPPED,
  TradeStatus.A_RECEIVED,
  TradeStatus.B_RECEIVED,
  TradeStatus.BOTH_RECEIVED,
  TradeStatus.VERIFIED,
];

// POST /api/trades/:tradeId/dispute
export const openDispute = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const trade = await prisma.trade.findUnique({ where: { id: req.params.tradeId } });
  if (!trade) throw ApiError.notFound("Trade not found");

  if (trade.proposerId !== req.user!.id && trade.receiverId !== req.user!.id) {
    throw ApiError.forbidden();
  }

  if (!DISPUTE_ELIGIBLE_STATUSES.includes(trade.status)) {
    throw ApiError.badRequest(
      "Disputes can only be opened for trades that are in progress"
    );
  }

  const existing = await prisma.dispute.findUnique({
    where: { tradeId: req.params.tradeId },
  });
  if (existing) throw ApiError.conflict("A dispute already exists for this trade");

  const parsed = openDisputeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const [dispute] = await prisma.$transaction([
    prisma.dispute.create({
      data: {
        tradeId: req.params.tradeId,
        openedById: req.user!.id,
        ...parsed.data,
      },
    }),
    prisma.trade.update({
      where: { id: req.params.tradeId },
      data: { status: TradeStatus.DISPUTED },
    }),
  ]);

  sendCreated(res, dispute, "Dispute opened");
};

// GET /api/disputes/:disputeId
export const getDispute = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: req.params.disputeId },
    include: {
      trade: true,
      openedBy: { omit: { passwordHash: true } },
      evidence: true,
    },
  });
  if (!dispute) throw ApiError.notFound("Dispute not found");

  const { trade } = dispute;
  const isParticipant =
    trade.proposerId === req.user!.id || trade.receiverId === req.user!.id;

  if (!isParticipant && !req.user!.isAdmin) throw ApiError.forbidden();

  sendSuccess(res, dispute);
};

// POST /api/disputes/:disputeId/evidence
export const submitEvidence = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: req.params.disputeId },
    include: { trade: true },
  });
  if (!dispute) throw ApiError.notFound("Dispute not found");

  const { trade } = dispute;
  if (trade.proposerId !== req.user!.id && trade.receiverId !== req.user!.id) {
    throw ApiError.forbidden();
  }

  const parsed = evidenceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const evidence = await prisma.disputeEvidence.create({
    data: {
      disputeId: req.params.disputeId,
      submittedById: req.user!.id,
      ...parsed.data,
    },
  });

  // Move dispute status forward if still OPENED
  if (dispute.status === DisputeStatus.OPENED) {
    await prisma.dispute.update({
      where: { id: req.params.disputeId },
      data: { status: DisputeStatus.EVIDENCE_SUBMITTED },
    });
  }

  sendCreated(res, evidence, "Evidence submitted");
};

// PATCH /api/disputes/:disputeId/resolve  — admin only
export const resolveDispute = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const dispute = await prisma.dispute.findUnique({
    where: { id: req.params.disputeId },
  });
  if (!dispute) throw ApiError.notFound("Dispute not found");

  const parsed = resolveSchema.safeParse(req.body);
  if (!parsed.success) {
    throw ApiError.badRequest(
      "Validation failed",
      parsed.error.errors.map((e) => e.message)
    );
  }

  const updated = await prisma.dispute.update({
    where: { id: req.params.disputeId },
    data: {
      ...parsed.data,
      resolvedById: req.user!.id,
      resolvedAt: new Date(),
    },
  });

  sendSuccess(res, updated, "Dispute resolved");
};

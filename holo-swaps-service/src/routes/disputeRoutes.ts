import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth";
import {
  getDispute,
  submitEvidence,
  resolveDispute,
} from "@/controllers/disputeController";

const router = Router();

router.use(authenticate);

router.get("/:disputeId", getDispute);
router.post("/:disputeId/evidence", submitEvidence);
router.patch("/:disputeId/resolve", requireAdmin, resolveDispute);

export default router;

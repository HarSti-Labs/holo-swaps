import { Router } from "express";
import {
  submitSupportTicket,
  getMyTickets,
  getTicket,
  postMessage,
  updateStatus,
} from "@/controllers/supportController";
import { authenticate, optionalAuthenticate, requireAdmin } from "@/middleware/auth";

const router = Router();

router.post("/", optionalAuthenticate, submitSupportTicket);
router.get("/my", authenticate, getMyTickets);
router.get("/ticket/:ticketNumber", authenticate, getTicket);
router.post("/ticket/:ticketNumber/messages", authenticate, postMessage);
router.patch("/ticket/:ticketNumber/status", authenticate, requireAdmin, updateStatus);

export default router;

import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import {
  getNotifications,
  markNotificationRead,
  markAllRead,
} from "@/controllers/notificationController";

const router = Router();

router.use(authenticate);

router.get("/", getNotifications);
// read-all must come before /:notificationId to avoid route conflict
router.patch("/read-all", markAllRead);
router.patch("/:notificationId/read", markNotificationRead);

export default router;

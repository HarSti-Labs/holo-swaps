import { Response } from "express";
import { AuthenticatedRequest } from "@/types";
import { sendSuccess } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { prisma } from "@/config/prisma";

// GET /api/notifications
export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const unreadOnly = req.query.unread === "true";
  const skip = (page - 1) * limit;

  const where = {
    userId: req.user!.id,
    ...(unreadOnly && { isRead: false }),
  };

  const [notifications, total, unreadCount] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: req.user!.id, isRead: false } }),
  ]);

  sendSuccess(res, {
    data: notifications,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    unreadCount,
  });
};

// PATCH /api/notifications/:notificationId/read
export const markNotificationRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const notification = await prisma.notification.findUnique({
    where: { id: req.params.notificationId },
  });
  if (!notification) throw ApiError.notFound("Notification not found");
  if (notification.userId !== req.user!.id) throw ApiError.forbidden();

  await prisma.notification.update({
    where: { id: req.params.notificationId },
    data: { isRead: true },
  });

  sendSuccess(res, null, "Notification marked as read");
};

// PATCH /api/notifications/read-all
export const markAllRead = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, isRead: false },
    data: { isRead: true },
  });

  sendSuccess(res, null, "All notifications marked as read");
};

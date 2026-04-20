import { NotificationType } from "@prisma/client";
import { prisma } from "@/config/prisma";
import { logger } from "@/utils/logger";

interface NotifyPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Fire-and-forget — notification failures never break the calling flow.
 */
export class NotificationService {
  async notify(payload: NotifyPayload): Promise<void> {
    try {
      await prisma.notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          data: payload.data,
        },
      });
    } catch (err) {
      logger.error("Failed to create notification", { payload, err });
    }
  }

  async notifyMany(userIds: string[], payload: Omit<NotifyPayload, "userId">): Promise<void> {
    try {
      await prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type: payload.type,
          title: payload.title,
          body: payload.body,
          data: payload.data,
        })),
      });
    } catch (err) {
      logger.error("Failed to create notifications", { userIds, payload, err });
    }
  }
}

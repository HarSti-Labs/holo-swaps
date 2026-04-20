import { Request, Response, NextFunction } from "express";
import { ApiError } from "@/utils/ApiError";
import { logger } from "@/utils/logger";
import { config } from "@/config";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  // Prisma errors
  if (err.constructor.name === "PrismaClientKnownRequestError") {
    const prismaError = err as { code: string };
    if (prismaError.code === "P2002") {
      res.status(409).json({
        success: false,
        message: "A record with that value already exists",
      });
      return;
    }
    if (prismaError.code === "P2025") {
      res.status(404).json({
        success: false,
        message: "Record not found",
      });
      return;
    }
  }

  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    message: config.server.isDev ? err.message : "Internal server error",
    ...(config.server.isDev && { stack: err.stack }),
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
  });
};

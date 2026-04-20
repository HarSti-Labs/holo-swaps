import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "@/types";
import { AuthService } from "@/services/implementations/AuthService";
import { ApiError } from "@/utils/ApiError";

const authService = new AuthService();

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    throw ApiError.unauthorized("No token provided");
  }

  const token = authHeader.split(" ")[1];
  const payload = await authService.verifyToken(token);
  req.user = payload;
  next();
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.isAdmin) {
    throw ApiError.forbidden("Admin access required");
  }
  next();
};

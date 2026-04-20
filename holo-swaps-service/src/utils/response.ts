import { Response } from "express";
import { ApiResponse } from "@/types";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  res.status(statusCode).json(response);
};

export const sendCreated = <T>(res: Response, data: T, message?: string): void => {
  sendSuccess(res, data, message, 201);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errors?: string[]
): void => {
  const response: ApiResponse = {
    success: false,
    message,
    errors,
  };
  res.status(statusCode).json(response);
};

import winston from "winston";
import { config } from "@/config";

export const logger = winston.createLogger({
  level: config.server.isDev ? "debug" : "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    config.server.isDev
      ? winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      : winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});

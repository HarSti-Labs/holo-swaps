import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { config } from "@/config";
import { logger } from "@/utils/logger";
import { errorHandler, notFound } from "@/middleware/errorHandler";

import authRoutes from "@/routes/authRoutes";
import tradeRoutes from "@/routes/tradeRoutes";
import collectionRoutes from "@/routes/collectionRoutes";
import wantRoutes from "@/routes/wantRoutes";
import cardRoutes from "@/routes/cardRoutes";
import userRoutes from "@/routes/userRoutes";
import notificationRoutes from "@/routes/notificationRoutes";
import disputeRoutes from "@/routes/disputeRoutes";
import priceAlertRoutes from "@/routes/priceAlertRoutes";
import stripeRoutes from "@/routes/stripeRoutes";
import adminRoutes from "@/routes/adminRoutes";
import listingRoutes from "@/routes/listingRoutes";
import setRoutes from "@/routes/setRoutes";
import uploadRoutes from "@/routes/uploadRoutes";
import supportRoutes from "@/routes/supportRoutes";
import { handleWebhook } from "@/controllers/stripeController";
import { handleTrackingWebhook } from "@/controllers/trackingWebhookController";
import { startTradeExpiryJob } from "@/jobs/tradeExpiryJob";
import { startMatchJob } from "@/jobs/matchJob";
import { startPriceSyncJob } from "@/jobs/priceSyncJob";

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.frontend.url,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: "Too many requests, please try again later" },
});
app.use("/api", limiter);

// Stripe webhook needs raw body — must come before express.json()
app.use(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  handleWebhook
);

// AfterShip tracking webhook — standard JSON body
app.post("/api/webhooks/tracking", handleTrackingWebhook);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(morgan(config.server.isDev ? "dev" : "combined"));

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/trades", tradeRoutes);
app.use("/api/collection", collectionRoutes);
app.use("/api/wants", wantRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/price-alerts", priceAlertRoutes);
app.use("/api/stripe", stripeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/sets", setRoutes);
app.use("/api", uploadRoutes);
app.use("/api/support", supportRoutes);

// 404 and error handling — must be last
app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    app.listen(config.server.port, () => {
      logger.info(
        `Server running on port ${config.server.port} in ${config.server.nodeEnv} mode`
      );
    });

    // Background jobs
    startTradeExpiryJob();
    startMatchJob();
    startPriceSyncJob();
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
};

start();

export default app;

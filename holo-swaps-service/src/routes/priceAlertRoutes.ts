import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import {
  getPriceAlerts,
  createPriceAlert,
  deletePriceAlert,
} from "@/controllers/priceAlertController";

const router = Router();

router.use(authenticate);

router.get("/", getPriceAlerts);
router.post("/", createPriceAlert);
router.delete("/:alertId", deletePriceAlert);

export default router;

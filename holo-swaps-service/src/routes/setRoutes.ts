import { Router } from "express";
import { authenticate, requireAdmin } from "@/middleware/auth";
import { getSets, getSetCards, getSetCompletion, createSet } from "@/controllers/setController";

const router = Router();

router.get("/", getSets);
router.get("/:setCode/cards", getSetCards);
router.get("/:setCode/completion", authenticate, getSetCompletion);
router.post("/", authenticate, requireAdmin, createSet);

export default router;

import { Router } from "express";
import { searchCards, getCardById, getCardPrice, getCardHolders, getMostWanted, getRarities, getCardSets } from "@/controllers/cardController";

const router = Router();

// Static routes before dynamic /:cardId
router.get("/most-wanted", getMostWanted);
router.get("/rarities", getRarities);
router.get("/sets", getCardSets);

router.get("/", searchCards);
router.get("/:cardId", getCardById);
router.get("/:cardId/price", getCardPrice);
router.get("/:cardId/holders", getCardHolders);

export default router;

import { Router } from "express";
import { authenticate, optionalAuthenticate } from "@/middleware/auth";
import { getListings, getListingGames, getListingRarities, makeListingOffer } from "@/controllers/listingController";

const router = Router();

router.get("/", optionalAuthenticate, getListings);
router.get("/games", getListingGames);
router.get("/rarities", getListingRarities);
router.post("/:itemId/offer", authenticate, makeListingOffer);

export default router;

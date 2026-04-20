import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import { getListings, makeListingOffer } from "@/controllers/listingController";

const router = Router();

router.get("/", getListings);
router.post("/:itemId/offer", authenticate, makeListingOffer);

export default router;

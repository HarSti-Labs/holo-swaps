import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import {
  getCollection,
  getCollectionItem,
  addToCollection,
  updateCollectionItem,
  removeFromCollection,
} from "@/controllers/collectionController";
import { toggleListing } from "@/controllers/listingController";
import { getCollectionValue } from "@/controllers/setController";

const router = Router();

router.use(authenticate);

router.get("/", getCollection);
router.get("/value", getCollectionValue);
router.post("/", addToCollection);
router.get("/:itemId", getCollectionItem);
router.patch("/:itemId", updateCollectionItem);
router.delete("/:itemId", removeFromCollection);
router.patch("/:itemId/listing", toggleListing);

export default router;

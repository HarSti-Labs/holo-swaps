import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import { getWants, addWant, updateWant, removeWant } from "@/controllers/wantController";

const router = Router();

router.use(authenticate);

router.get("/", getWants);
router.post("/", addWant);
router.patch("/:wantId", updateWant);
router.delete("/:wantId", removeWant);

export default router;

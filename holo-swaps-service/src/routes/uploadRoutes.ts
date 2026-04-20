import { Router } from "express";
import { authenticate } from "@/middleware/auth";
import { upload, uploadMedia } from "@/controllers/uploadController";

const router = Router();

router.post("/upload", authenticate, upload.single("file"), uploadMedia);

export default router;

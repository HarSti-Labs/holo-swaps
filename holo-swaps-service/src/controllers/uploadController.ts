import { Response } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import path from "path";
import { AuthenticatedRequest } from "@/types";
import { sendCreated } from "@/utils/response";
import { ApiError } from "@/utils/ApiError";
import { config } from "@/config";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new ApiError("Only JPEG, PNG, WebP images and MP4 videos are allowed", 400));
    }
  },
});

// POST /api/upload
export const uploadMedia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.file) {
    throw ApiError.badRequest("No file provided");
  }

  const supabaseUrl = config.supabase.url;
  const serviceKey = config.supabase.serviceKey;

  if (!supabaseUrl || !serviceKey) {
    throw ApiError.internal("Storage not configured");
  }

  const ext = MIME_TO_EXT[req.file.mimetype] ?? path.extname(req.file.originalname).slice(1);
  const filename = `${uuid()}.${ext}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/card-media/${filename}`;

  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": req.file.mimetype,
      "x-upsert": "false",
    },
    body: req.file.buffer,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw ApiError.internal(`Failed to upload file: ${errorText}`);
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/card-media/${filename}`;

  sendCreated(res, { url: publicUrl });
};

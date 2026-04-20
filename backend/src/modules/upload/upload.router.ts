import { Router } from "express";
import multer from "multer";
import { supabaseAdmin } from "../../config/supabase.js";
import { authenticate, type AuthRequest } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/middleware/errorHandler.js";
import type { Response } from "express";
import { v4 as uuidv4 } from "uuid";

export const uploadRouter = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf", "text/plain", "application/json",
      "text/javascript", "text/typescript", "text/x-python",
      "application/zip", "video/mp4",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("File type not allowed"));
  },
});

// POST /api/upload/avatar
uploadRouter.post("/avatar", authenticate, upload.single("file"), async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError(400, "No file provided");

  const ext = req.file.originalname.split(".").pop();
  const filename = `avatars/${req.userId}/${uuidv4()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("techit-uploads")
    .upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });

  if (error) throw new AppError(500, `Upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("techit-uploads")
    .getPublicUrl(filename);

  // Update profile
  await supabaseAdmin.from("profiles")
    .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("user_id", req.userId!);

  res.json({ url: publicUrl });
});

// POST /api/upload/workspace-file
uploadRouter.post("/workspace-file", authenticate, upload.single("file"), async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError(400, "No file provided");
  const { workspaceId } = req.body;
  if (!workspaceId) throw new AppError(400, "workspaceId required");

  const filename = `workspaces/${workspaceId}/${req.file.originalname}`;

  const { error } = await supabaseAdmin.storage
    .from("techit-uploads")
    .upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });

  if (error) throw new AppError(500, `Upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("techit-uploads")
    .getPublicUrl(filename);

  // Create workspace file record
  const { data: fileRecord } = await supabaseAdmin.from("workspace_files").insert({
    workspace_id: workspaceId,
    name: req.file.originalname,
    path: "/",
    file_url: publicUrl,
    language: "text",
  }).select().single();

  res.json({ url: publicUrl, file: fileRecord });
});

// POST /api/upload/post-media
uploadRouter.post("/post-media", authenticate, upload.single("file"), async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError(400, "No file provided");

  const ext = req.file.originalname.split(".").pop();
  const filename = `posts/${req.userId}/${uuidv4()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from("techit-uploads")
    .upload(filename, req.file.buffer, { contentType: req.file.mimetype });

  if (error) throw new AppError(500, `Upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("techit-uploads")
    .getPublicUrl(filename);

  res.json({ url: publicUrl });
});

// POST /api/upload/certification
uploadRouter.post("/certification", authenticate, upload.single("file"), async (req: AuthRequest, res: Response) => {
  if (!req.file) throw new AppError(400, "No file provided");
  const { name, issuer, issuedAt } = req.body;

  const filename = `certifications/${req.userId}/${uuidv4()}_${req.file.originalname}`;

  const { error } = await supabaseAdmin.storage
    .from("techit-uploads")
    .upload(filename, req.file.buffer, { contentType: req.file.mimetype });

  if (error) throw new AppError(500, `Upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from("techit-uploads")
    .getPublicUrl(filename);

  // Add to profile certifications
  const { data: profile } = await supabaseAdmin.from("profiles")
    .select("certifications").eq("user_id", req.userId!).single();

  const certs = Array.isArray(profile?.certifications) ? profile.certifications : [];
  const newCert = {
    id: uuidv4(),
    name: name || req.file.originalname,
    issuer: issuer || "Unknown",
    issued_at: issuedAt || new Date().toISOString(),
    file_url: publicUrl,
    verified: false,
  };

  await supabaseAdmin.from("profiles")
    .update({ certifications: [...certs, newCert], updated_at: new Date().toISOString() })
    .eq("user_id", req.userId!);

  res.json({ certification: newCert, url: publicUrl });
});

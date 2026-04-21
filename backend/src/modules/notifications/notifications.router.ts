import { Router } from "express";
import { supabaseAdmin } from "../../config/supabase.js";
import { authenticate, type AuthRequest } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/middleware/errorHandler.js";
import type { Response } from "express";

export const notificationsRouter = Router();

notificationsRouter.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("*")
    .eq("user_id", req.userId!)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new AppError(500, error.message);
  res.json(data);
});

notificationsRouter.patch("/:id/read", authenticate, async (req: AuthRequest, res: Response) => {
  await supabaseAdmin.from("notifications")
    .update({ read: true })
    .eq("id", req.params.id)
    .eq("user_id", req.userId!);
  res.json({ message: "Marked as read" });
});

notificationsRouter.patch("/read-all", authenticate, async (req: AuthRequest, res: Response) => {
  await supabaseAdmin.from("notifications")
    .update({ read: true })
    .eq("user_id", req.userId!);
  res.json({ message: "All marked as read" });
});

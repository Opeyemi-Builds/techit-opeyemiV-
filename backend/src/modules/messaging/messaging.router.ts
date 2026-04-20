import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../config/supabase.js";
import { authenticate, type AuthRequest } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/middleware/errorHandler.js";
import type { Response } from "express";

export const messagingRouter = Router();

// GET /api/messages/conversations
messagingRouter.get("/conversations", authenticate, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("conversations")
    .select("*, participants:profiles!inner(user_id, first_name, last_name, avatar_url, role)")
    .contains("participant_ids", [req.userId!])
    .order("created_at", { ascending: false });

  if (error) throw new AppError(500, error.message);
  res.json(data);
});

// POST /api/messages/conversations — start or get conversation
messagingRouter.post("/conversations", authenticate, async (req: AuthRequest, res: Response) => {
  const { participantId } = z.object({ participantId: z.string().uuid() }).parse(req.body);

  // Check if conversation exists
  const { data: existing } = await supabaseAdmin
    .from("conversations")
    .select("*")
    .contains("participant_ids", [req.userId!, participantId])
    .single();

  if (existing) { res.json(existing); return; }

  const { data, error } = await supabaseAdmin
    .from("conversations")
    .insert({ participant_ids: [req.userId!, participantId] })
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.status(201).json(data);
});

// GET /api/messages/conversations/:id
messagingRouter.get("/conversations/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const { limit = "50", before } = req.query;

  let query = supabaseAdmin
    .from("messages")
    .select(`*, sender:profiles!sender_id(first_name, last_name, avatar_url)`)
    .eq("conversation_id", req.params.id)
    .order("created_at", { ascending: false })
    .limit(parseInt(limit as string));

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw new AppError(500, error.message);
  res.json((data ?? []).reverse());
});

// POST /api/messages/conversations/:id
messagingRouter.post("/conversations/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const { content, file_urls } = z.object({
    content: z.string().min(1).max(5000),
    file_urls: z.array(z.string()).optional().default([]),
  }).parse(req.body);

  const { data, error } = await supabaseAdmin
    .from("messages")
    .insert({ conversation_id: req.params.id, sender_id: req.userId!, content, file_urls })
    .select(`*, sender:profiles!sender_id(first_name, last_name, avatar_url)`)
    .single();

  if (error) throw new AppError(500, error.message);
  res.status(201).json(data);
});

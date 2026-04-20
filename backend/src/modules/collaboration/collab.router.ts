import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../config/supabase.js";
import { authenticate, type AuthRequest } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/middleware/errorHandler.js";
import type { Response } from "express";

export const collabRouter = Router();

const requestSchema = z.object({
  to_id: z.string().uuid(),
  project_id: z.string().uuid().optional(),
  type: z.enum(["paid", "free", "equity"]),
  message: z.string().min(10).max(1000),
  compensation: z.string().optional(),
});

const CREDIT_COSTS = { paid: 25, free: 0, equity: 15 } as const;

// POST /api/collab/requests
collabRouter.post("/requests", authenticate, async (req: AuthRequest, res: Response) => {
  const body = requestSchema.parse(req.body);
  const creditCost = CREDIT_COSTS[body.type];

  if (creditCost > 0) {
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("credit_balance").eq("user_id", req.userId!).single();
    if (!profile || profile.credit_balance < creditCost) {
      throw new AppError(402, `Insufficient credits. This request costs ${creditCost} credits.`);
    }
    const newBalance = profile.credit_balance - creditCost;
    await supabaseAdmin.from("profiles").update({ credit_balance: newBalance }).eq("user_id", req.userId!);
    await supabaseAdmin.from("credit_transactions").insert({
      user_id: req.userId!, amount: -creditCost, action: "collab_request",
      description: `${body.type} collab request sent`,
    });
  }

  const { data, error } = await supabaseAdmin
    .from("collab_requests")
    .insert({ ...body, from_id: req.userId!, credits_used: creditCost, status: "pending" })
    .select(`*, from:profiles!from_id(first_name, last_name, role, avatar_url)`)
    .single();

  if (error) throw new AppError(500, error.message);

  // Create notification for recipient
  await supabaseAdmin.from("notifications").insert({
    user_id: body.to_id,
    type: "collab_request",
    title: "New Collaboration Request",
    body: `Someone sent you a ${body.type} collaboration request`,
    metadata: { request_id: data.id, from_id: req.userId! },
    read: false,
  });

  res.status(201).json(data);
});

// GET /api/collab/requests/received
collabRouter.get("/requests/received", authenticate, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("collab_requests")
    .select(`*, from:profiles!from_id(first_name, last_name, role, avatar_url, credibility_score), project:projects(title, industry)`)
    .eq("to_id", req.userId!)
    .order("created_at", { ascending: false });

  if (error) throw new AppError(500, error.message);
  res.json(data);
});

// GET /api/collab/requests/sent
collabRouter.get("/requests/sent", authenticate, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("collab_requests")
    .select(`*, to:profiles!to_id(first_name, last_name, role, avatar_url), project:projects(title)`)
    .eq("from_id", req.userId!)
    .order("created_at", { ascending: false });

  if (error) throw new AppError(500, error.message);
  res.json(data);
});

// PATCH /api/collab/requests/:id — accept or decline
collabRouter.patch("/requests/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const { status } = z.object({ status: z.enum(["accepted", "declined"]) }).parse(req.body);

  const { data: request } = await supabaseAdmin
    .from("collab_requests").select("*").eq("id", req.params.id).single();
  if (!request) throw new AppError(404, "Request not found");
  if (request.to_id !== req.userId) throw new AppError(403, "Forbidden");

  const { data, error } = await supabaseAdmin
    .from("collab_requests")
    .update({ status })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw new AppError(500, error.message);

  // Notify the sender
  await supabaseAdmin.from("notifications").insert({
    user_id: request.from_id,
    type: "collab_request",
    title: `Collaboration Request ${status === "accepted" ? "Accepted! 🎉" : "Declined"}`,
    body: status === "accepted" ? "Your collaboration request was accepted!" : "Your collaboration request was declined.",
    metadata: { request_id: req.params.id },
    read: false,
  });

  res.json(data);
});

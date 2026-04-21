import { Router } from "express";
import { supabaseAdmin } from "../../config/supabase.js";
import { authenticate, type AuthRequest } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/middleware/errorHandler.js";
import type { Response } from "express";

export const creditsRouter = Router();

// GET /api/credits/balance
creditsRouter.get("/balance", authenticate, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("profiles").select("credit_balance").eq("user_id", req.userId!).single();
  if (error || !data) throw new AppError(404, "Profile not found");
  res.json({ balance: data.credit_balance });
});

// GET /api/credits/transactions
creditsRouter.get("/transactions", authenticate, async (req: AuthRequest, res: Response) => {
  const { limit = "30", offset = "0" } = req.query;
  const { data, error } = await supabaseAdmin
    .from("credit_transactions")
    .select("*")
    .eq("user_id", req.userId!)
    .order("created_at", { ascending: false })
    .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

  if (error) throw new AppError(500, error.message);
  res.json(data);
});

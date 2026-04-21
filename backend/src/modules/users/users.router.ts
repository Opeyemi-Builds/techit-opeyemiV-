import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../config/supabase.js";
import { authenticate, type AuthRequest } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/middleware/errorHandler.js";
import type { Response, Request } from "express";

export const usersRouter = Router();

// GET /api/users/search?q=term&role=collaborator
usersRouter.get("/search", async (req: Request, res: Response) => {
  const { q, role, country, limit = "20", offset = "0" } = req.query;

  let query = supabaseAdmin
    .from("profiles")
    .select("id, user_id, first_name, last_name, username, role, country, credibility_score, skills, avatar_url, bio")
    .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

  if (q) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,username.ilike.%${q}%`);
  }
  if (role) query = query.eq("role", role);
  if (country) query = query.eq("country", country);

  const { data, error } = await query;
  if (error) throw new AppError(500, error.message);
  res.json(data);
});

// GET /api/users/:username — public profile
usersRouter.get("/:username", async (req: Request, res: Response) => {
  const { username } = req.params;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, user_id, first_name, last_name, username, role, country, credibility_score, skills, certifications, avatar_url, bio, linkedin_url, github_url, portfolio_url, weekly_hours, risk_tolerance, industries, is_verified, created_at")
    .or(`username.eq.${username},user_id.eq.${username}`)
    .single();

  if (error || !data) throw new AppError(404, "User not found");
  res.json(data);
});

// PATCH /api/users/me
usersRouter.patch("/me", authenticate, async (req: AuthRequest, res: Response) => {
  const allowedFields = [
    "first_name", "last_name", "username", "bio", "avatar_url",
    "phone", "country", "timezone", "linkedin_url", "github_url",
    "portfolio_url", "skills", "industries", "startup_stage",
    "experience", "weekly_hours", "risk_tolerance", "investment_focus",
    "ticket_size", "org_name", "org_type", "website", "role",
    "secondary_roles", "certifications", "is_onboarded",
  ];

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("user_id", req.userId!)
    .select()
    .single();

  if (error) throw new AppError(400, error.message);
  res.json(data);
});

// PATCH /api/users/me/role — switch role
usersRouter.patch("/me/role", authenticate, async (req: AuthRequest, res: Response) => {
  const { role } = z.object({ role: z.enum(["founder", "collaborator", "investor", "organisation"]) }).parse(req.body);

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("user_id", req.userId!)
    .select()
    .single();

  if (error) throw new AppError(400, error.message);
  res.json({ message: "Role updated", profile: data });
});

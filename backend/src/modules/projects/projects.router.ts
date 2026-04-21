import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../config/supabase.js";
import { authenticate, type AuthRequest } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/middleware/errorHandler.js";
import type { Response } from "express";

export const projectsRouter = Router();

const projectSchema = z.object({
  title: z.string().min(1).max(200),
  pitch: z.string().min(1).max(500),
  problem: z.string().min(1),
  solution: z.string().min(1),
  industry: z.string().min(1),
  tech_stack: z.array(z.string()).optional().default([]),
  stage: z.string().default("Idea"),
  monetization: z.string().optional(),
});

// GET /api/projects — user's projects
projectsRouter.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("founder_id", req.userId!)
    .order("created_at", { ascending: false });

  if (error) throw new AppError(500, error.message);
  res.json(data);
});

// POST /api/projects
projectsRouter.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  const body = projectSchema.parse(req.body);

  const { data, error } = await supabaseAdmin
    .from("projects")
    .insert({ ...body, founder_id: req.userId!, status: "active" })
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.status(201).json(data);
});

// GET /api/projects/:id
projectsRouter.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(`*, founder:profiles!founder_id(first_name, last_name, username, avatar_url)`)
    .eq("id", req.params.id)
    .single();

  if (error || !data) throw new AppError(404, "Project not found");
  res.json(data);
});

// PATCH /api/projects/:id
projectsRouter.patch("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const { data: project } = await supabaseAdmin
    .from("projects").select("founder_id").eq("id", req.params.id).single();
  if (!project) throw new AppError(404, "Project not found");
  if (project.founder_id !== req.userId) throw new AppError(403, "Forbidden");

  const { data, error } = await supabaseAdmin
    .from("projects")
    .update({ ...req.body, updated_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.json(data);
});

// DELETE /api/projects/:id
projectsRouter.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const { data: project } = await supabaseAdmin
    .from("projects").select("founder_id").eq("id", req.params.id).single();
  if (!project) throw new AppError(404, "Project not found");
  if (project.founder_id !== req.userId) throw new AppError(403, "Forbidden");

  await supabaseAdmin.from("projects").delete().eq("id", req.params.id);
  res.json({ message: "Project deleted" });
});

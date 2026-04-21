import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../config/supabase.js";
import { authenticate, type AuthRequest } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/middleware/errorHandler.js";
import type { Response } from "express";

export const workspaceRouter = Router();

// GET /api/workspace/:projectId
workspaceRouter.get("/:projectId", authenticate, async (req: AuthRequest, res: Response) => {
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select("*, files:workspace_files(*)")
    .eq("project_id", req.params.projectId)
    .single();

  if (error) {
    // Auto-create workspace if none exists
    const { data: newWs } = await supabaseAdmin
      .from("workspaces")
      .insert({ project_id: req.params.projectId })
      .select("*, files:workspace_files(*)")
      .single();
    res.json(newWs);
    return;
  }
  res.json(data);
});

// POST /api/workspace/:id/files
workspaceRouter.post("/:id/files", authenticate, async (req: AuthRequest, res: Response) => {
  const { name, path, content, language } = z.object({
    name: z.string().min(1),
    path: z.string(),
    content: z.string().optional(),
    language: z.string().optional(),
  }).parse(req.body);

  const { data, error } = await supabaseAdmin
    .from("workspace_files")
    .insert({ workspace_id: req.params.id, name, path, content: content ?? "", language })
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.status(201).json(data);
});

// PATCH /api/workspace/:id/files/:fileId
workspaceRouter.patch("/:id/files/:fileId", authenticate, async (req: AuthRequest, res: Response) => {
  const { content, name } = req.body;

  const { data, error } = await supabaseAdmin
    .from("workspace_files")
    .update({ content, name, updated_at: new Date().toISOString() })
    .eq("id", req.params.fileId)
    .eq("workspace_id", req.params.id)
    .select()
    .single();

  if (error) throw new AppError(500, error.message);
  res.json(data);
});

// DELETE /api/workspace/:id/files/:fileId
workspaceRouter.delete("/:id/files/:fileId", authenticate, async (req: AuthRequest, res: Response) => {
  await supabaseAdmin
    .from("workspace_files")
    .delete()
    .eq("id", req.params.fileId)
    .eq("workspace_id", req.params.id);
  res.json({ message: "File deleted" });
});

import { Router } from "express";
import { supabaseAdmin } from "../../config/supabase.js";
import { authenticate, type AuthRequest } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/middleware/errorHandler.js";
import { recalculateCredibility } from "../../shared/utils/credibilityScore.js";
import type { Response } from "express";

export const analyticsRouter = Router();

// GET /api/analytics/dashboard — personalized stats
analyticsRouter.get("/dashboard", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const [profileRes, projectsRes, collabsRes, postsRes, requestsRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("role, credibility_score, credit_balance, created_at").eq("user_id", userId).single(),
    supabaseAdmin.from("projects").select("id, status, ai_score").eq("founder_id", userId),
    supabaseAdmin.from("collaborations").select("status, project_id").eq("user_id", userId),
    supabaseAdmin.from("posts").select("id, likes, views").eq("author_id", userId),
    supabaseAdmin.from("collab_requests").select("status").eq("to_id", userId),
  ]);

  const profile = profileRes.data;
  const projects = projectsRes.data ?? [];
  const collabs = collabsRes.data ?? [];
  const posts = postsRes.data ?? [];
  const requests = requestsRes.data ?? [];

  const totalLikes = posts.reduce((s, p) => s + (p.likes?.length ?? 0), 0);
  const totalViews = posts.reduce((s, p) => s + (p.views ?? 0), 0);
  const avgAiScore = projects.length > 0
    ? Math.round(projects.filter(p => p.ai_score).reduce((s, p) => s + (p.ai_score ?? 0), 0) / projects.filter(p => p.ai_score).length)
    : null;

  // Recalculate credibility on analytics fetch
  const newCredibility = await recalculateCredibility(userId);

  res.json({
    role: profile?.role,
    credibilityScore: newCredibility,
    creditBalance: profile?.credit_balance,
    memberSince: profile?.created_at,
    projects: {
      total: projects.length,
      active: projects.filter(p => p.status === "active").length,
      avgAiScore,
    },
    collaborations: {
      total: collabs.length,
      active: collabs.filter(c => c.status === "active").length,
      completed: collabs.filter(c => c.status === "completed").length,
    },
    feed: {
      posts: posts.length,
      totalLikes,
      totalViews,
    },
    requests: {
      pending: requests.filter(r => r.status === "pending").length,
      accepted: requests.filter(r => r.status === "accepted").length,
    },
  });
});

// GET /api/analytics/platform — global platform stats (public)
analyticsRouter.get("/platform", async (_req, res: Response) => {
  const [usersRes, projectsRes, collabsRes, postsRes] = await Promise.all([
    supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("projects").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("collaborations").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("posts").select("id", { count: "exact", head: true }),
  ]);

  res.json({
    totalUsers: usersRes.count ?? 0,
    totalProjects: projectsRes.count ?? 0,
    totalCollaborations: collabsRes.count ?? 0,
    totalPosts: postsRes.count ?? 0,
  });
});

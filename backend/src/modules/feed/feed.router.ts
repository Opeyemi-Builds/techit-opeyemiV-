import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../../config/supabase.js";
import { authenticate, optionalAuth, type AuthRequest } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/middleware/errorHandler.js";
import type { Response, Request } from "express";

export const feedRouter = Router();

const postSchema = z.object({
  content: z.string().min(1).max(3000),
  media_urls: z.array(z.string().url()).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  collab_tag: z.enum(["PAID", "FREE", "HIRING", "INVESTING"]).nullable().optional(),
});

// GET /api/feed — paginated feed
feedRouter.get("/", optionalAuth, async (req: AuthRequest, res: Response) => {
  const { limit = "20", offset = "0", role, tag } = req.query;

  let query = supabaseAdmin
    .from("posts")
    .select(`
      *,
      author:profiles!author_id(
        user_id, first_name, last_name, username, role, country,
        credibility_score, avatar_url, is_verified
      ),
      comments(
        id, content, created_at,
        author:profiles!author_id(first_name, last_name, avatar_url)
      )
    `)
    .order("created_at", { ascending: false })
    .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

  if (tag) query = query.eq("collab_tag", tag);

  const { data, error, count } = await query;
  if (error) throw new AppError(500, error.message);

  res.json({ posts: data, total: count });
});

// POST /api/feed/posts
feedRouter.post("/posts", authenticate, async (req: AuthRequest, res: Response) => {
  const body = postSchema.parse(req.body);

  const { data, error } = await supabaseAdmin
    .from("posts")
    .insert({
      author_id: req.userId!,
      content: body.content,
      media_urls: body.media_urls,
      tags: body.tags,
      collab_tag: body.collab_tag ?? null,
      likes: [],
      views: 0,
    })
    .select(`
      *,
      author:profiles!author_id(first_name, last_name, username, role, country, credibility_score, avatar_url)
    `)
    .single();

  if (error) throw new AppError(500, error.message);
  res.status(201).json(data);
});

// POST /api/feed/posts/:id/like
feedRouter.post("/posts/:id/like", authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.userId!;

  const { data: post } = await supabaseAdmin
    .from("posts").select("likes").eq("id", id).single();
  if (!post) throw new AppError(404, "Post not found");

  const likes: string[] = post.likes ?? [];
  const isLiked = likes.includes(userId);
  const newLikes = isLiked ? likes.filter((l: string) => l !== userId) : [...likes, userId];

  const { data, error } = await supabaseAdmin
    .from("posts").update({ likes: newLikes }).eq("id", id).select("id, likes").single();

  if (error) throw new AppError(500, error.message);
  res.json({ liked: !isLiked, likeCount: newLikes.length });
});

// POST /api/feed/posts/:id/comment
feedRouter.post("/posts/:id/comment", authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { content } = z.object({ content: z.string().min(1).max(1000) }).parse(req.body);

  const { data, error } = await supabaseAdmin
    .from("comments")
    .insert({ post_id: id, author_id: req.userId!, content })
    .select(`*, author:profiles!author_id(first_name, last_name, avatar_url)`)
    .single();

  if (error) throw new AppError(500, error.message);
  res.status(201).json(data);
});

// DELETE /api/feed/posts/:id
feedRouter.delete("/posts/:id", authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  const { data: post } = await supabaseAdmin
    .from("posts").select("author_id").eq("id", id).single();
  if (!post) throw new AppError(404, "Post not found");
  if (post.author_id !== req.userId) throw new AppError(403, "Forbidden");

  await supabaseAdmin.from("posts").delete().eq("id", id);
  res.json({ message: "Post deleted" });
});

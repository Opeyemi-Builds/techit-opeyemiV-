import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "../../config/supabase.js";
import { authenticate, type AuthRequest } from "../../shared/middleware/auth.js";
import { AppError } from "../../shared/middleware/errorHandler.js";
import type { Response } from "express";

export const matchingRouter = Router();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MATCH_CREDIT_COST = 50;

// POST /api/matching/find
matchingRouter.post("/find", authenticate, async (req: AuthRequest, res: Response) => {
  const { projectId, requirements } = req.body;

  // Check credits
  const { data: profile } = await supabaseAdmin
    .from("profiles").select("credit_balance").eq("user_id", req.userId!).single();
  if (!profile || profile.credit_balance < MATCH_CREDIT_COST) {
    throw new AppError(402, `Insufficient credits. AI Matching costs ${MATCH_CREDIT_COST} credits.`);
  }

  // Get project if provided
  let projectData: Record<string, unknown> | null = null;
  if (projectId) {
    const { data } = await supabaseAdmin.from("projects").select("*").eq("id", projectId).single();
    projectData = data;
  }

  // Get candidate collaborators from DB
  const { data: candidates } = await supabaseAdmin
    .from("profiles")
    .select("user_id, first_name, last_name, skills, weekly_hours, risk_tolerance, credibility_score, industries, country, bio")
    .eq("role", "collaborator")
    .neq("user_id", req.userId!)
    .limit(30);

  if (!candidates || candidates.length === 0) {
    res.json({ matches: [], message: "No candidates available yet." });
    return;
  }

  // Build AI prompt
  const prompt = `You are TechIT Network's AI matching engine.

Project Requirements:
${projectData ? JSON.stringify(projectData, null, 2) : JSON.stringify(requirements ?? {}, null, 2)}

Available Collaborators:
${JSON.stringify(candidates, null, 2)}

Analyze each collaborator and return a JSON array of the top 5 matches. For each match return:
{
  "user_id": "string",
  "score": number (0-100),
  "breakdown": {
    "skillAlignment": number,
    "domainFit": number,
    "availability": number,
    "riskAlignment": number,
    "credibility": number
  },
  "aiInsight": "One sentence explaining why this person is a great match"
}

Consider: skill overlap, availability (hours/week), domain/industry fit, risk tolerance, credibility score, and bio.
Respond ONLY with valid JSON array, no explanation text.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  let matchResults: unknown[] = [];
  try {
    const text = response.content[0].type === "text" ? response.content[0].text : "[]";
    matchResults = JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    matchResults = [];
  }

  // Hydrate with full profile data
  const hydratedMatches = await Promise.all(
    (matchResults as Array<{ user_id: string; score: number; breakdown: Record<string, number>; aiInsight: string }>)
      .map(async (match) => {
        const { data: p } = await supabaseAdmin
          .from("profiles")
          .select("user_id, first_name, last_name, username, role, country, credibility_score, skills, avatar_url, bio, weekly_hours, risk_tolerance")
          .eq("user_id", match.user_id)
          .single();
        return { ...match, profile: p };
      })
  );

  // Deduct credits
  const newBalance = profile.credit_balance - MATCH_CREDIT_COST;
  await supabaseAdmin.from("profiles").update({ credit_balance: newBalance }).eq("user_id", req.userId!);
  await supabaseAdmin.from("credit_transactions").insert({
    user_id: req.userId!,
    amount: -MATCH_CREDIT_COST,
    action: "ai_match",
    description: `AI Matching for project: ${projectData?.title ?? "custom search"}`,
  });

  res.json({
    matches: hydratedMatches,
    creditsUsed: MATCH_CREDIT_COST,
    remainingCredits: newBalance,
  });
});

// POST /api/matching/evaluate-idea — AI evaluates startup idea
matchingRouter.post("/evaluate-idea", authenticate, async (req: AuthRequest, res: Response) => {
  const { title, pitch, problem, solution, target, industry, techStack, monetization } = req.body;
  const EVAL_COST = 75;

  const { data: profile } = await supabaseAdmin
    .from("profiles").select("credit_balance").eq("user_id", req.userId!).single();
  if (!profile || profile.credit_balance < EVAL_COST) {
    throw new AppError(402, `Insufficient credits. Idea evaluation costs ${EVAL_COST} credits.`);
  }

  const prompt = `You are TechIT Network's startup idea evaluator.

Evaluate this startup idea and return a structured JSON analysis:

Title: ${title}
One-line pitch: ${pitch}
Problem: ${problem}
Solution: ${solution}
Target Users: ${target}
Industry: ${industry}
Tech Stack: ${techStack}
Monetization: ${monetization}

Return ONLY a JSON object with:
{
  "overallScore": number (0-100),
  "breakdown": {
    "problemClarity": number,
    "marketSize": number,
    "technicalFeasibility": number,
    "monetizationViability": number,
    "competitiveAdvantage": number
  },
  "readinessLevel": "Not Ready | Early Stage | Ready for MVP | Strong Potential | Market Ready",
  "risks": [{"risk": "string", "level": "Low|Medium|High", "description": "string"}],
  "roadmap": [{"phase": "string", "task": "string", "weeks": "string"}],
  "teamComposition": [{"role": "string", "skills": "string"}],
  "strengths": ["string"],
  "improvements": ["string"]
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  let evalData: unknown = {};
  try {
    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    evalData = JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    evalData = { overallScore: 0, error: "Evaluation failed" };
  }

  // Deduct credits
  const newBalance = profile.credit_balance - EVAL_COST;
  await supabaseAdmin.from("profiles").update({ credit_balance: newBalance }).eq("user_id", req.userId!);
  await supabaseAdmin.from("credit_transactions").insert({
    user_id: req.userId!, amount: -EVAL_COST, action: "idea_eval",
    description: `AI evaluation for: ${title}`,
  });

  res.json({ evaluation: evalData, creditsUsed: EVAL_COST, remainingCredits: newBalance });
});

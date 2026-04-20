import { supabase } from "./supabase";

// CRITICAL: Use relative path so Vite proxy handles it (/api -> http://localhost:3001)
// Never use absolute URL here — it breaks auth token delivery through proxy
const BASE = "";

async function getToken(): Promise<string | null> {
  // Try current session first
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;

  // Try refreshing
  const { data: { session: refreshed } } = await supabase.auth.refreshSession();
  return refreshed?.access_token ?? null;
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      errMsg = body.error ?? body.message ?? errMsg;
    } catch {}

    if (res.status === 401) {
      // Token expired — try refresh once
      const { data } = await supabase.auth.refreshSession();
      if (data.session?.access_token) {
        headers["Authorization"] = `Bearer ${data.session.access_token}`;
        const retry = await fetch(`${BASE}${path}`, { ...options, headers });
        if (retry.ok) return retry.json();
      }
    }

    throw new Error(errMsg);
  }

  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

// ── Projects ────────────────────────────────────────────────
export const projectsApi = {
  list: () => request<Project[]>("/api/projects"),
  create: (data: Partial<Project>) =>
    request<Project>("/api/projects", { method: "POST", body: JSON.stringify(data) }),
  get: (id: string) => request<Project>(`/api/projects/${id}`),
  update: (id: string, data: Partial<Project>) =>
    request<Project>(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<void>(`/api/projects/${id}`, { method: "DELETE" }),
};

// ── Matching / AI ────────────────────────────────────────────
export const matchingApi = {
  find: (projectId?: string, requirements?: Record<string, unknown>) =>
    request<{ matches: MatchResult[]; creditsUsed: number; remainingCredits: number }>(
      "/api/matching/find",
      { method: "POST", body: JSON.stringify({ projectId, requirements }) }
    ),
  evaluateIdea: (idea: IdeaData) =>
    request<{ evaluation: IdeaEvaluation; creditsUsed: number; remainingCredits: number }>(
      "/api/matching/evaluate-idea",
      { method: "POST", body: JSON.stringify(idea) }
    ),
};

// ── Collab Requests ─────────────────────────────────────────
export const collabApi = {
  send: (data: {
    to_id: string; type: string; message: string;
    project_id?: string; compensation?: string;
  }) =>
    request("/api/collab/requests", { method: "POST", body: JSON.stringify(data) }),
  received: () => request<CollabRequest[]>("/api/collab/requests/received"),
  sent: () => request<CollabRequest[]>("/api/collab/requests/sent"),
  respond: (id: string, status: "accepted" | "declined") =>
    request(`/api/collab/requests/${id}`, {
      method: "PATCH", body: JSON.stringify({ status }),
    }),
};

// ── Credits / Payments ──────────────────────────────────────
export const creditsApi = {
  balance: () => request<{ balance: number }>("/api/credits/balance"),
  transactions: () => request<CreditTransaction[]>("/api/credits/transactions"),
  createCheckout: (packageId: string) =>
    request<{ url: string }>("/api/payments/create-checkout", {
      method: "POST", body: JSON.stringify({ packageId }),
    }),
};

// ── Notifications ───────────────────────────────────────────
export const notificationsApi = {
  list: () => request<AppNotification[]>("/api/notifications"),
  markRead: (id: string) =>
    request(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () =>
    request("/api/notifications/read-all", { method: "PATCH" }),
};

// ── Types ────────────────────────────────────────────────────
export interface Profile {
  id: string; user_id: string; first_name: string; last_name: string;
  username?: string | null; email: string; phone: string; country: string;
  avatar_url?: string | null; bio?: string | null; role: string;
  secondary_roles: string[]; credit_balance: number; credibility_score: number;
  is_verified: boolean; is_onboarded: boolean; startup_stage?: string | null;
  industries: string[]; experience?: string | null; skills: string[];
  weekly_hours?: number | null; risk_tolerance?: string | null;
  investment_focus: string[]; ticket_size?: string | null;
  org_name?: string | null; org_type?: string | null; website?: string | null;
  linkedin_url?: string | null; github_url?: string | null;
  portfolio_url?: string | null; timezone?: string | null;
  certifications: unknown[]; created_at: string; updated_at: string;
}

export interface Project {
  id: string; founder_id: string; title: string; pitch: string;
  problem: string; solution: string; industry: string; tech_stack: string[];
  stage: string; monetization?: string; ai_score?: number;
  ai_eval_data?: Record<string, unknown>; status: string;
  created_at: string; updated_at: string; founder?: Profile;
}

export interface IdeaData {
  title: string; pitch: string; problem: string; solution: string;
  target: string; industry: string; techStack: string; monetization: string;
}

export interface IdeaEvaluation {
  overallScore: number;
  breakdown: {
    problemClarity: number; marketSize: number;
    technicalFeasibility: number; monetizationViability: number;
    competitiveAdvantage: number;
  };
  readinessLevel: string;
  risks: { risk: string; level: string; description: string }[];
  roadmap: { phase: string; task: string; weeks: string }[];
  teamComposition: { role: string; skills: string }[];
  strengths: string[];
  improvements: string[];
}

export interface MatchResult {
  user_id: string; score: number;
  breakdown: {
    skillAlignment: number; domainFit: number;
    availability: number; riskAlignment: number; credibility: number;
  };
  aiInsight: string; profile: Profile;
}

export interface CollabRequest {
  id: string; from_id: string; to_id: string; project_id?: string;
  type: string; message: string; compensation?: string;
  credits_used: number; status: string; created_at: string;
  from?: Profile; to?: Profile; project?: Project;
}

export interface AppNotification {
  id: string; user_id: string; type: string; title: string; body: string;
  read: boolean; metadata?: Record<string, unknown>; created_at: string;
}

export interface CreditTransaction {
  id: string; user_id: string; amount: number; action: string;
  description: string; created_at: string;
}

export interface Message {
  id: string; conversation_id: string; sender_id: string; content: string;
  file_urls: string[]; created_at: string; sender?: Profile;
}

export interface Conversation {
  id: string; participant_ids: string[]; participants?: Profile[];
  created_at: string; last_message?: Message;
}

export interface Post {
  id: string; author_id: string; content: string; media_urls: string[];
  tags: string[]; likes: string[]; views: number; collab_tag?: string | null;
  created_at: string; updated_at: string; author?: Profile;
}

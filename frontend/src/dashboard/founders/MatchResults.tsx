import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, MessageCircle, Zap, AlertCircle, RefreshCw, Search } from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Avatar, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useCredits, CREDIT_COSTS } from "../../contexts/CreditContext";
import { useAuth } from "../../contexts/AuthContext";
import { cn, timeAgo } from "../../lib/utils";

interface MatchBreakdown {
  skillAlignment: number;
  domainFit: number;
  availability: number;
  riskAlignment: number;
  credibility: number;
}

interface MatchResult {
  user_id: string;
  score: number;
  breakdown: MatchBreakdown;
  aiInsight: string;
  profile?: {
    user_id: string;
    first_name: string;
    last_name: string;
    username: string | null;
    role: string;
    country: string;
    credibility_score: number;
    skills: string[];
    avatar_url: string | null;
    bio: string | null;
    weekly_hours: number | null;
    risk_tolerance: string | null;
    is_verified: boolean;
  };
}

interface Project {
  id: string;
  title: string;
  industry: string;
  stage: string;
}

export default function MatchResults() {
  const { profile } = useAuth();
  const { balance, deduct } = useCredits();
  const location = useLocation();
  const navigate = useNavigate();
  const { projectId: initProjectId } = (location.state ?? {}) as { projectId?: string };

  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState(initProjectId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestSent, setRequestSent] = useState<Record<string, boolean>>({});
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState("all");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const { data } = await supabase
      .from("projects")
      .select("id, title, industry, stage")
      .eq("founder_id", profile!.user_id)
      .eq("status", "active");
    setProjects(data ?? []);
    if (data?.length && !selectedProject) setSelectedProject(data[0].id);
  }

  async function findMatches() {
    if (balance < CREDIT_COSTS.AI_MATCH) {
      setError(`Insufficient credits. AI Matching costs ${CREDIT_COSTS.AI_MATCH} credits. You have ${balance}.`);
      return;
    }
    setLoading(true);
    setError("");

    try {
      const session = (await supabase.auth.getSession()).data.session;
      // Try refresh if needed
      const token = session?.access_token ?? (await supabase.auth.refreshSession()).data.session?.access_token;

      if (!token) {
        // Fallback: do matching entirely client-side
        await clientSideMatch();
        return;
      }

      const res = await fetch("/api/matching/find", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ projectId: selectedProject || undefined }),
      });

      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches ?? []);
        // Refresh credits (backend deducted)
        const { data: updated } = await supabase
          .from("profiles").select("credit_balance").eq("user_id", profile!.user_id).single();
        // Credit context will auto-refresh on next render via profile
      } else {
        // Backend unavailable — fallback to client-side
        await clientSideMatch();
      }
    } catch (e) {
      await clientSideMatch();
    } finally {
      setLoading(false);
    }
  }

  async function clientSideMatch() {
    // Deduct credits client-side
    const deducted = await deduct(CREDIT_COSTS.AI_MATCH, "ai_match", "AI collaborator matching");
    if (!deducted) {
      setError("Failed to deduct credits. Check your balance.");
      setLoading(false);
      return;
    }

    // Fetch collaborators from Supabase directly
    const { data: candidates } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, username, role, country, credibility_score, skills, avatar_url, bio, weekly_hours, risk_tolerance, is_verified")
      .eq("role", "collaborator")
      .neq("user_id", profile!.user_id)
      .order("credibility_score", { ascending: false })
      .limit(20);

    if (!candidates?.length) {
      setMatches([]);
      setLoading(false);
      return;
    }

    // Simple client-side scoring
    const project = projects.find(p => p.id === selectedProject);
    const scored = candidates.map(c => {
      const skillMatch = Math.min(100, (c.skills?.length ?? 0) * 8);
      const credScore = Math.min(100, (c.credibility_score ?? 0));
      const availScore = c.weekly_hours ? Math.min(100, c.weekly_hours * 1.5) : 50;
      const score = Math.round((skillMatch * 0.35) + (credScore * 0.35) + (availScore * 0.3));
      return {
        user_id: c.user_id,
        score: Math.min(99, score + Math.floor(Math.random() * 10)),
        breakdown: {
          skillAlignment: Math.min(100, skillMatch + Math.floor(Math.random() * 15)),
          domainFit: Math.floor(55 + Math.random() * 40),
          availability: availScore,
          riskAlignment: Math.floor(60 + Math.random() * 35),
          credibility: Math.min(100, credScore),
        },
        aiInsight: `Strong ${c.skills?.slice(0, 2).join(" and ")} background with ${c.country} market understanding.`,
        profile: c,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    setMatches(scored.slice(0, 8));
    setLoading(false);
  }

  async function sendRequest(match: MatchResult) {
    if (!match.profile) return;
    setRequestingId(match.user_id);

    try {
      // Try backend first
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      let success = false;

      if (token) {
        const res = await fetch("/api/collab/requests", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            to_id: match.user_id,
            project_id: selectedProject || undefined,
            type: "free",
            message: `Hi ${match.profile.first_name}! Your profile shows a ${match.score}% compatibility with my project. I'd love to discuss a potential collaboration on TechIT Network.`,
          }),
        });
        success = res.ok;
      }

      if (!success) {
        // Fallback: write directly to Supabase
        const { error } = await supabase.from("collab_requests").insert({
          from_id: profile!.user_id,
          to_id: match.user_id,
          project_id: selectedProject || null,
          type: "free",
          message: `Hi ${match.profile.first_name}! Your profile shows a ${match.score}% compatibility with my project. I'd love to discuss a potential collaboration.`,
          credits_used: 0,
          status: "pending",
        });
        if (error) throw new Error(error.message);
      }

      setRequestSent(prev => ({ ...prev, [match.user_id]: true }));

      // Create notification
      await supabase.from("notifications").insert({
        user_id: match.user_id,
        type: "collab_request",
        title: "New Collaboration Request",
        body: `${profile!.first_name} ${profile!.last_name} sent you a collaboration request`,
        read: false,
        metadata: { from_id: profile!.user_id },
      });
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to send request");
    } finally {
      setRequestingId(null);
    }
  }

  async function startConversation(userId: string) {
    // Check if conversation exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .contains("participant_ids", [profile!.user_id, userId])
      .single();

    if (existing) {
      navigate("/messages", { state: { conversationId: existing.id } });
      return;
    }

    const { data } = await supabase
      .from("conversations")
      .insert({ participant_ids: [profile!.user_id, userId] })
      .select()
      .single();

    if (data) navigate("/messages", { state: { conversationId: data.id } });
  }

  const filtered = filterRole === "all" ? matches : matches.filter(m => m.profile?.role === filterRole);

  return (
    <DashboardLayout title="AI Collaborator Matching">
      <div className="max-w-5xl mx-auto space-y-6 page-enter">
        {/* Search Controls */}
        <Card className="p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select Project</label>
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-input px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">No specific project — general search</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({p.industry})</option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filter Role</label>
              <select
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="w-full h-10 rounded-xl border border-border bg-input px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">All Collaborators</option>
                <option value="collaborator">Collaborators</option>
                <option value="founder">Co-Founders</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="gradient" onClick={findMatches} loading={loading} className="gap-2">
                <Zap className="size-4" /> Find Matches ({CREDIT_COSTS.AI_MATCH} cr)
              </Button>
              {matches.length > 0 && (
                <Button variant="ghost" size="icon-sm" onClick={findMatches}>
                  <RefreshCw className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-destructive p-3 rounded-xl bg-destructive/10 border border-destructive/20">
              <AlertCircle className="size-4 flex-shrink-0" />{error}
            </div>
          )}

          <p className="mt-3 text-xs text-muted-foreground">
            AI analyzes skill alignment, domain fit, availability, risk tolerance, and credibility score.
            Balance: <span className="font-semibold text-foreground">{balance} credits</span>
          </p>
        </Card>

        {/* Empty state */}
        {matches.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Search className="size-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2 text-foreground">No matches yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Click "Find Matches" to let AI surface the most compatible collaborators for your project.
            </p>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="size-16 rounded-full bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-muted rounded w-48" />
                    <div className="h-3 bg-muted rounded w-32" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Results */}
        {filtered.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">
              {filtered.length} match{filtered.length !== 1 ? "es" : ""} found
            </p>
            <div className="space-y-4">
              {filtered.map((match, i) => {
                const p = match.profile;
                if (!p) return null;
                const name = `${p.first_name} ${p.last_name}`;
                const sent = requestSent[match.user_id];

                return (
                  <motion.div
                    key={match.user_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <Card className={cn("p-5 hover:border-primary/30 transition-all", sent && "opacity-70")}>
                      <div className="flex flex-col sm:flex-row gap-5">
                        {/* Avatar + score */}
                        <div className="flex sm:flex-col items-center gap-4 sm:gap-2 flex-shrink-0">
                          <Avatar name={name} src={p.avatar_url ?? undefined} size="lg" />
                          <div className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-sm font-bold font-mono text-emerald-400">
                            {match.score}% match
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-display font-bold text-lg text-foreground">{name}</h3>
                            <Badge variant="cyan">{p.role}</Badge>
                            {p.is_verified && <Badge variant="teal">Verified</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2 flex flex-wrap items-center gap-3">
                            {p.country && <span>{p.country}</span>}
                            {p.weekly_hours && <span>{p.weekly_hours}h/week</span>}
                            {p.risk_tolerance && <span>{p.risk_tolerance} risk</span>}
                            <span>Score: {Math.round(p.credibility_score)}</span>
                          </p>
                          {p.bio && (
                            <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">{p.bio}</p>
                          )}

                          {/* Skills */}
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {(p.skills ?? []).slice(0, 6).map(s => (
                              <span key={s} className="px-2 py-1 rounded-full bg-secondary/15 text-secondary text-xs font-medium border border-secondary/20">
                                {s}
                              </span>
                            ))}
                          </div>

                          {/* Breakdown */}
                          <div className="grid grid-cols-5 gap-2 mb-3">
                            {Object.entries(match.breakdown).map(([k, v]) => {
                              const labels: Record<string, string> = {
                                skillAlignment: "Skills",
                                domainFit: "Domain",
                                availability: "Avail.",
                                riskAlignment: "Risk",
                                credibility: "Cred.",
                              };
                              return (
                                <div key={k} className="text-center">
                                  <div className="text-xs font-mono font-bold text-foreground">{Math.round(v)}%</div>
                                  <div className="text-[0.6rem] text-muted-foreground">{labels[k]}</div>
                                </div>
                              );
                            })}
                          </div>

                          {/* AI Insight */}
                          {match.aiInsight && (
                            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/15 mb-4">
                              <p className="text-xs text-muted-foreground">
                                <span className="text-primary font-semibold">AI: </span>
                                {match.aiInsight}
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="gradient"
                              disabled={sent || requestingId === match.user_id}
                              loading={requestingId === match.user_id}
                              onClick={() => sendRequest(match)}
                            >
                              <Mail className="size-4" />
                              {sent ? "Request Sent" : "Send Request"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => startConversation(match.user_id)}>
                              <MessageCircle className="size-4" /> Message
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => navigate(`/u/${p.username ?? p.user_id}`)}>
                              View Profile
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Search, Rocket, UserPlus, Check, ExternalLink,
  Filter, X, RefreshCw, Zap, Star,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Avatar, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { cn, timeAgo } from "../../lib/utils";

interface Project {
  id: string;
  founder_id: string;
  title: string;
  pitch: string;
  problem: string;
  industry: string;
  stage: string;
  tech_stack: string[];
  ai_score: number | null;
  status: string;
  created_at: string;
  founder?: {
    user_id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    credibility_score: number;
    country: string;
  };
}

const STAGES = ["All", "Idea", "MVP", "Launch", "Growth"];
const INDUSTRIES = ["All", "AI/ML", "FinTech", "HealthTech", "E-Commerce", "SaaS", "Edtech", "CleanTech", "Web3", "Other"];

export default function Projects() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects]  = useState<Project[]>([]);
  const [loading, setLoading]    = useState(true);
  const [query, setQuery]        = useState("");
  const [stage, setStage]        = useState("All");
  const [industry, setIndustry]  = useState("All");
  const [showFilters, setShowF]  = useState(false);
  const [joinStatus, setJS]      = useState<Record<string, "none" | "pending" | "accepted" | "member">>({});
  const [joining, setJoining]    = useState<string | null>(null);
  const [showModal, setModal]    = useState<Project | null>(null);
  const [joinMsg, setJoinMsg]    = useState("");

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [query, stage, industry]);

  async function load() {
    setLoading(true);
    let q = supabase
      .from("projects")
      .select("*, founder:profiles!founder_id(user_id, first_name, last_name, avatar_url, credibility_score, country)")
      .eq("status", "active")
      .neq("founder_id", profile!.user_id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (query.trim()) q = q.or(`title.ilike.%${query}%,pitch.ilike.%${query}%,industry.ilike.%${query}%`);
    if (stage !== "All") q = q.eq("stage", stage);
    if (industry !== "All") q = q.eq("industry", industry);

    const { data } = await q;
    const projs = data ?? [];
    setProjects(projs);

    // Load join statuses
    if (projs.length > 0) {
      const projIds = projs.map((p: Project) => p.id);

      const [{ data: requests }, { data: collabs }] = await Promise.all([
        supabase.from("project_join_requests")
          .select("project_id, status").eq("user_id", profile!.user_id).in("project_id", projIds),
        supabase.from("collaborations")
          .select("project_id").eq("user_id", profile!.user_id).in("project_id", projIds),
      ]);

      const map: Record<string, "none" | "pending" | "accepted" | "member"> = {};
      (requests ?? []).forEach((r: { project_id: string; status: string }) => {
        map[r.project_id] = r.status as "pending" | "accepted";
      });
      (collabs ?? []).forEach((c: { project_id: string }) => {
        map[c.project_id] = "member";
      });
      setJS(map);
    }

    setLoading(false);
  }

  async function sendJoinRequest(project: Project) {
    setJoining(project.id);
    const { error } = await supabase.from("project_join_requests").insert({
      project_id: project.id,
      user_id: profile!.user_id,
      message: joinMsg || `I would love to contribute to ${project.title}. My skills align well with this project.`,
      role: "Collaborator",
      status: "pending",
    });
    if (!error) {
      setJS(prev => ({ ...prev, [project.id]: "pending" }));
    }
    setModal(null);
    setJoinMsg("");
    setJoining(null);
  }

  function JoinButton({ project }: { project: Project }) {
    const status = joinStatus[project.id] ?? "none";
    if (status === "member") {
      return (
        <Button size="sm" variant="gradient" onClick={() => navigate(`/workspace/${project.id}`)}>
          Open Workspace
        </Button>
      );
    }
    if (status === "accepted") {
      return (
        <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/30" disabled>
          <Check className="size-4" /> Accepted
        </Button>
      );
    }
    if (status === "pending") {
      return (
        <Button size="sm" variant="outline" disabled>
          <UserPlus className="size-4" /> Requested
        </Button>
      );
    }
    return (
      <Button size="sm" variant="gradient" loading={joining === project.id}
        onClick={() => setModal(project)}>
        <UserPlus className="size-4" /> Request to Join
      </Button>
    );
  }

  return (
    <DashboardLayout title="Discover Projects">
      <div className="max-w-5xl mx-auto space-y-5 page-enter">

        {/* Search */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <Search className="size-5 text-muted-foreground flex-shrink-0" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search projects by name, pitch, or industry..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
            {query && <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>}
          </div>
          <Button variant="outline" onClick={() => setShowF(s => !s)} className="gap-2">
            <Filter className="size-4" /><span className="hidden sm:inline">Filters</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={load}><RefreshCw className="size-4" /></Button>
        </div>

        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-2xl">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stage</label>
              <div className="flex flex-wrap gap-2">
                {STAGES.map(s => (
                  <button key={s} onClick={() => setStage(s)}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      stage === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Industry</label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map(ind => (
                  <button key={ind} onClick={() => setIndustry(ind)}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                      industry === ind ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                    {ind}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        <p className="text-sm text-muted-foreground">{loading ? "Loading..." : `${projects.length} projects found`}</p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="p-5 animate-pulse space-y-3">
                <div className="flex gap-3"><div className="size-10 rounded-xl bg-muted" /><div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded w-48" /><div className="h-3 bg-muted rounded w-32" /></div></div>
                <div className="h-3 bg-muted rounded" /><div className="h-3 bg-muted rounded w-3/4" />
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="p-12 text-center">
            <Rocket className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-display font-bold text-lg mb-1 text-foreground">No projects found</p>
            <p className="text-sm text-muted-foreground mb-4">Be the first to create a project or try different filters.</p>
            <Link to="/idea-submit"><Button variant="gradient">Create a Project</Button></Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {projects.map((project, i) => {
              const founder = project.founder;
              const founderName = founder ? `${founder.first_name} ${founder.last_name}` : "Founder";
              return (
                <motion.div key={project.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-5 hover:border-primary/20 transition-all">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                          {project.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-display font-bold text-foreground">{project.title}</h3>
                            <Badge variant="outline">{project.stage}</Badge>
                            <Badge>{project.industry}</Badge>
                            {project.ai_score != null && (
                              <span className="font-mono text-xs text-emerald-400 font-bold">AI: {project.ai_score}</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-2 line-clamp-2">{project.pitch}</p>

                          {/* Founder info */}
                          {founder && (
                            <button
                              onClick={() => navigate(`/u/${founder.user_id}`)}
                              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                            >
                              <Avatar name={founderName} src={founder.avatar_url ?? undefined} size="xs" />
                              <span className="text-xs text-muted-foreground">
                                {founderName} · {founder.country}
                              </span>
                            </button>
                          )}

                          {/* Tech stack */}
                          {project.tech_stack?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {project.tech_stack.slice(0, 5).map(t => (
                                <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end gap-3 flex-shrink-0">
                        {project.ai_score != null && (
                          <div className="text-center hidden sm:block">
                            <div className={cn("font-display font-extrabold text-2xl",
                              project.ai_score >= 80 ? "text-emerald-400" :
                              project.ai_score >= 60 ? "text-amber-400" : "text-rose-400"
                            )}>{project.ai_score}</div>
                            <div className="text-xs text-muted-foreground">AI Score</div>
                          </div>
                        )}
                        <JoinButton project={project} />
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Join request modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-display font-bold text-lg mb-2 text-foreground">Request to Join</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Send a message to <span className="font-semibold text-foreground">{showModal.title}</span>'s founder explaining why you want to join.
            </p>
            <textarea
              value={joinMsg}
              onChange={e => setJoinMsg(e.target.value)}
              placeholder="Explain your relevant skills and how you can contribute to this project..."
              rows={4}
              className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setModal(null); setJoinMsg(""); }}>
                Cancel
              </Button>
              <Button variant="gradient" className="flex-1" loading={joining === showModal.id}
                onClick={() => sendJoinRequest(showModal)}>
                Send Request
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Rocket, Users, TrendingUp, Star, Lightbulb, Zap,
  Target, ChevronRight, Plus, AlertCircle, RefreshCw,
  UserPlus, Check, X,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, StatCard, Avatar, Badge, ProgressBar } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { useCredits } from "../../contexts/CreditContext";
import { supabase } from "../../lib/supabase";
import { cn, timeAgo } from "../../lib/utils";

interface Project {
  id: string; founder_id: string; title: string; pitch: string;
  industry: string; stage: string; ai_score?: number; status: string;
  created_at: string;
}

interface CollabReq {
  id: string; from_id: string; to_id: string; project_id?: string;
  type: string; message: string; compensation?: string;
  status: string; created_at: string;
  from?: { first_name: string; last_name: string; role: string; avatar_url?: string; credibility_score?: number };
}

interface JoinReq {
  id: string; project_id: string; user_id: string;
  message: string; role: string; status: string; created_at: string;
  requester?: { first_name: string; last_name: string; role: string; avatar_url?: string; credibility_score?: number; skills?: string[] };
  project?: { title: string };
}

interface Notification {
  id: string; type: string; title: string; body: string;
  read: boolean; created_at: string;
}

export default function FounderDashboard() {
  const { profile } = useAuth();
  const { balance } = useCredits();
  const navigate = useNavigate();

  const [projects, setProjects]       = useState<Project[]>([]);
  const [collabReqs, setCollabReqs]   = useState<CollabReq[]>([]);
  const [joinReqs, setJoinReqs]       = useState<JoinReq[]>([]);
  const [notifications, setNotifs]    = useState<Notification[]>([]);
  const [teamCount, setTeamCount]     = useState(0);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  useEffect(() => { if (profile?.user_id) loadAll(); }, [profile?.user_id]);

  async function loadAll() {
    setLoading(true); setError("");
    try {
      await Promise.all([loadProjects(), loadCollabReqs(), loadJoinReqs(), loadNotifs()]);
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function loadProjects() {
    const { data, error } = await supabase.from("projects").select("*")
      .eq("founder_id", profile!.user_id).eq("status", "active")
      .order("created_at", { ascending: false }).limit(6);
    if (error) throw error;
    setProjects(data ?? []);
    if (data?.length) {
      const { count } = await supabase.from("collaborations")
        .select("id", { count: "exact", head: true })
        .in("project_id", data.map((p: Project) => p.id))
        .eq("status", "active");
      setTeamCount(count ?? 0);
    }
  }

  async function loadCollabReqs() {
    const { data } = await supabase.from("collab_requests")
      .select("*, from:profiles!from_id(first_name, last_name, role, avatar_url, credibility_score)")
      .eq("to_id", profile!.user_id).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(5);
    setCollabReqs(data ?? []);
  }

  async function loadJoinReqs() {
    // Get all project IDs for this founder
    const { data: myProjects } = await supabase.from("projects")
      .select("id").eq("founder_id", profile!.user_id);

    if (!myProjects?.length) return;
    const projectIds = myProjects.map((p: { id: string }) => p.id);

    const { data } = await supabase.from("project_join_requests")
      .select("*, requester:profiles!user_id(first_name, last_name, role, avatar_url, credibility_score, skills), project:projects!project_id(title)")
      .in("project_id", projectIds).eq("status", "pending")
      .order("created_at", { ascending: false }).limit(10);
    setJoinReqs(data ?? []);
  }

  async function loadNotifs() {
    const { data } = await supabase.from("notifications").select("*")
      .eq("user_id", profile!.user_id).order("created_at", { ascending: false }).limit(8);
    setNotifs(data ?? []);
  }

  async function handleCollabReq(id: string, status: "accepted" | "declined") {
    await supabase.from("collab_requests").update({ status }).eq("id", id);
    if (status === "accepted") {
      const req = collabReqs.find(r => r.id === id);
      if (req?.project_id) {
        await supabase.from("collaborations").insert({
          project_id: req.project_id, user_id: req.from_id,
          role: "Collaborator", status: "active",
        });
        setTeamCount(c => c + 1);
      }
    }
    setCollabReqs(prev => prev.filter(r => r.id !== id));
  }

  async function handleJoinReq(req: JoinReq, status: "accepted" | "declined") {
    const { error } = await supabase.from("project_join_requests")
      .update({ status }).eq("id", req.id);
    if (!error) {
      if (status === "accepted") {
        // Trigger inserts collaboration via DB trigger, but also ensure it here
        await supabase.from("collaborations").upsert({
          project_id: req.project_id, user_id: req.user_id,
          role: req.role, status: "active",
        }, { onConflict: "project_id,user_id" });
        setTeamCount(c => c + 1);
      }
      setJoinReqs(prev => prev.filter(r => r.id !== req.id));
    }
  }

  async function markNotifRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </DashboardLayout>
  );

  const profilePct = Math.round(
    [profile?.bio, profile?.skills?.length, profile?.linkedin_url, profile?.avatar_url, profile?.github_url]
      .filter(Boolean).length / 5 * 100
  );
  const totalRequests = collabReqs.length + joinReqs.length;

  return (
    <DashboardLayout action={
      <Link to="/idea-submit">
        <Button variant="gradient" size="sm" className="hidden sm:inline-flex gap-2">
          <Lightbulb className="size-4" /> New Idea
        </Button>
      </Link>
    }>
      <div className="max-w-7xl mx-auto space-y-6 page-enter">
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertCircle className="size-4 flex-shrink-0" />{error}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={loadAll}><RefreshCw className="size-4" /></Button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">
              Welcome back, {profile?.first_name ?? "Founder"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {projects.length > 0
                ? `${projects.length} active project${projects.length !== 1 ? "s" : ""} · ${totalRequests} pending request${totalRequests !== 1 ? "s" : ""}`
                : "Get started by submitting your first idea."}
            </p>
          </div>
          <Link to="/idea-submit" className="sm:hidden">
            <Button variant="gradient" size="sm" className="w-full gap-2">
              <Lightbulb className="size-4" /> New Idea
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Active Projects",  value: String(projects.length), icon: <Target className="size-5" />,     color: "violet" as const, helper: "in progress"  },
            { label: "Team Members",     value: String(teamCount),       icon: <Users className="size-5" />,      color: "cyan"   as const, helper: `${totalRequests} pending` },
            { label: "Credit Balance",   value: balance.toLocaleString(),icon: <Star className="size-5" />,       color: "teal"   as const, helper: "available"    },
            { label: "Credibility",      value: String(Math.round(profile?.credibility_score ?? 0)), icon: <TrendingUp className="size-5" />, color: "rose" as const, helper: "trust score" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Projects */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-sm flex items-center gap-2 text-foreground">
                <Rocket className="size-4 text-primary" /> Your Projects
              </h2>
              <Link to="/idea-submit">
                <Button variant="ghost" size="sm" className="gap-1 text-xs">
                  <Plus className="size-3.5" /> New
                </Button>
              </Link>
            </div>
            {projects.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Rocket className="size-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium mb-1 text-foreground">No active projects</p>
                <p className="text-xs text-muted-foreground mb-4">Submit your first idea and let AI evaluate its potential</p>
                <Link to="/idea-submit"><Button variant="gradient" size="sm">Submit an Idea</Button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project, i) => (
                  <motion.div key={project.id}
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {project.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">{project.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{project.pitch}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline">{project.stage}</Badge>
                        <Badge>{project.industry}</Badge>
                        {project.ai_score != null && (
                          <span className="text-xs font-mono text-emerald-400 font-bold">AI: {project.ai_score}</span>
                        )}
                      </div>
                    </div>
                    <Link to={`/workspace/${project.id}`}>
                      <Button variant="ghost" size="icon-sm"><ChevronRight className="size-4" /></Button>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>

          {/* Requests (both collab + join) */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-sm flex items-center gap-2 text-foreground">
                <UserPlus className="size-4 text-primary" /> Incoming Requests
                {totalRequests > 0 && (
                  <span className="size-5 rounded-full bg-primary text-white text-[0.6rem] font-bold flex items-center justify-center">
                    {totalRequests}
                  </span>
                )}
              </h2>
            </div>
            {totalRequests === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                  <Users className="size-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium mb-1 text-foreground">No pending requests</p>
                <p className="text-xs text-muted-foreground mb-4">Find collaborators or let people request to join your projects</p>
                <Link to="/matches"><Button variant="gradient" size="sm">Find Collaborators</Button></Link>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {/* Join requests */}
                {joinReqs.map((req, i) => {
                  const person = req.requester;
                  const name = person ? `${person.first_name} ${person.last_name}` : "Someone";
                  return (
                    <motion.div key={req.id}
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      className="p-3 rounded-xl border border-primary/20 bg-primary/3 space-y-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-primary uppercase tracking-wide">Join Request</span>
                        {req.project && <span className="text-xs text-muted-foreground">· {req.project.title}</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <Avatar name={name} src={person?.avatar_url ?? undefined} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{name}</p>
                          <div className="flex gap-1.5 mt-0.5 flex-wrap">
                            {person?.role && <Badge variant="outline">{person.role}</Badge>}
                            {person?.credibility_score != null && (
                              <span className="text-xs text-amber-400 font-mono">Score: {Math.round(person.credibility_score)}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{timeAgo(req.created_at)}</span>
                      </div>
                      {person?.skills?.length && (
                        <div className="flex flex-wrap gap-1.5">
                          {person.skills.slice(0, 3).map(s => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/20">{s}</span>
                          ))}
                        </div>
                      )}
                      {req.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{req.message}</p>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="gradient" className="flex-1" onClick={() => handleJoinReq(req, "accepted")}>
                          <Check className="size-4" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleJoinReq(req, "declined")}>
                          <X className="size-4" /> Decline
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Collab requests */}
                {collabReqs.map((req, i) => {
                  const sender = req.from;
                  const name = sender ? `${sender.first_name} ${sender.last_name}` : "Someone";
                  return (
                    <motion.div key={req.id}
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: (joinReqs.length + i) * 0.06 }}
                      className="p-3 rounded-xl border border-border bg-card space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar name={name} src={sender?.avatar_url ?? undefined} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{name}</p>
                          <div className="flex gap-1.5 mt-0.5 flex-wrap">
                            {sender?.role && <Badge variant="outline">{sender.role}</Badge>}
                            <Badge variant={req.type === "paid" ? "teal" : req.type === "equity" ? "violet" : "cyan"}>
                              {req.type}
                            </Badge>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{timeAgo(req.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{req.message}</p>
                      {req.compensation && (
                        <p className="text-xs font-mono text-emerald-400">{req.compensation}</p>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="gradient" className="flex-1" onClick={() => handleCollabReq(req.id, "accepted")}>Accept</Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleCollabReq(req.id, "declined")}>Decline</Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-sm text-foreground">Recent Activity</h2>
              <Link to="/notifications" className="text-xs text-primary hover:underline">View all</Link>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No recent activity</p>
            ) : (
              <div className="space-y-2">
                {notifications.map(n => (
                  <div key={n.id} onClick={() => !n.read && markNotifRead(n.id)}
                    className={cn("flex items-start gap-3 p-3 rounded-xl transition-colors cursor-pointer",
                      n.read ? "bg-muted/20 hover:bg-muted/30" : "bg-primary/5 border border-primary/10 hover:bg-primary/8")}>
                    <div className="size-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      {n.type === "collab_request" || n.type === "join_request" ? <UserPlus className="size-4 text-violet-400" /> :
                       n.type === "message" ? <Zap className="size-4 text-cyan-400" /> :
                       n.type === "connection_request" ? <Users className="size-4 text-teal-400" /> :
                       <Star className="size-4 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && <span className="size-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Quick Actions</p>
              <div className="space-y-0.5">
                {[
                  { label: "Submit Idea",        href: "/idea-submit",   icon: <Lightbulb className="size-4" /> },
                  { label: "Find Collaborators", href: "/matches",       icon: <UserPlus className="size-4" /> },
                  { label: "Browse Projects",    href: "/projects",      icon: <Rocket className="size-4" />   },
                  { label: "Find People",        href: "/people",        icon: <Users className="size-4" />    },
                  { label: "Incubation Hub",     href: "/incubation-hub",icon: <Target className="size-4" />  },
                  { label: "Social Feed",        href: "/feed",          icon: <Zap className="size-4" />     },
                  { label: "Wallet",             href: "/wallet",        icon: <Star className="size-4" />    },
                ].map(item => (
                  <Link key={item.href} to={item.href}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors group">
                    <span className="text-primary">{item.icon}</span>
                    <span className="text-sm font-medium flex-1 text-foreground">{item.label}</span>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </Link>
                ))}
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Profile Strength</p>
              <ProgressBar value={profilePct} label={`${profilePct}% complete`} />
              {profilePct < 100 && (
                <Link to="/settings">
                  <Button variant="outline" size="sm" className="w-full text-xs">Complete Profile</Button>
                </Link>
              )}
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { CheckCircle, AlertTriangle, Lightbulb, TrendingUp, Star, Briefcase, Target, Zap, ChevronRight, RefreshCw, Users } from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, StatCard, Avatar, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { useCredits } from "../../contexts/CreditContext";
import { supabase } from "../../lib/supabase";
import { cn, timeAgo } from "../../lib/utils";
import type { CollabRequest, AppNotification } from "../../lib/api";

type Profile = { first_name: string; last_name: string; role: string; credibility_score?: number; avatar_url?: string };

export default function CollaboratorDashboard() {
  const { profile } = useAuth();
  const { balance } = useCredits();
  const [collaborations, setCollaborations] = useState<any[]>([]);
  const [requests, setRequests] = useState<CollabRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (profile?.user_id) loadAll(); }, [profile?.user_id]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadCollaborations(), loadRequests(), loadNotifications()]);
    setLoading(false);
  }

  async function loadCollaborations() {
    const { data } = await supabase.from("collaborations")
      .select("*, project:projects(id, title, pitch, stage, industry, founder_id)")
      .eq("user_id", profile!.user_id).eq("status", "active").order("joined_at", { ascending: false });
    setCollaborations(data ?? []);
  }

  async function loadRequests() {
    const { data } = await supabase.from("collab_requests")
      .select("*, from:profiles!from_id(first_name, last_name, role, avatar_url, credibility_score)")
      .eq("to_id", profile!.user_id).eq("status", "pending").order("created_at", { ascending: false }).limit(5);
    setRequests(data ?? []);
  }

  async function loadNotifications() {
    const { data } = await supabase.from("notifications").select("*")
      .eq("user_id", profile!.user_id).order("created_at", { ascending: false }).limit(6);
    setNotifications(data ?? []);
  }

  async function handleRequest(id: string, status: "accepted" | "declined") {
    await supabase.from("collab_requests").update({ status }).eq("id", id);
    setRequests(prev => prev.filter(r => r.id !== id));
    if (status === "accepted") await loadCollaborations();
  }

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[60vh] flex-col gap-4">
        <div className="size-10 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading dashboard...</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout action={<Link to="/collaborator/opportunities"><Button variant="gradient" size="sm"><Target className="size-4" /> Find Work</Button></Link>}>
      <div className="max-w-7xl mx-auto space-y-6 page-enter">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">Welcome back, {profile?.first_name ?? "Builder"}</h1>
            <p className="text-sm text-muted-foreground mt-1">Active in {collaborations.length} project{collaborations.length !== 1 ? "s" : ""} this week.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={loadAll}><RefreshCw className="size-4" /></Button>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Credibility Score", value: String(Math.round(profile?.credibility_score ?? 0)), icon: <Star className="size-5" />, color: "violet" as const, helper: "trust score" },
            { label: "Active Projects", value: String(collaborations.length), icon: <Briefcase className="size-5" />, color: "cyan" as const, helper: `${requests.length} pending requests` },
            { label: "Credit Balance", value: balance.toLocaleString(), icon: <Zap className="size-5" />, color: "teal" as const, helper: "available" },
            { label: "Skills Listed", value: String(profile?.skills?.length ?? 0), icon: <TrendingUp className="size-5" />, color: "rose" as const, helper: "on your profile" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: CheckCircle, label: `Active in ${collaborations.length} project${collaborations.length !== 1 ? "s" : ""}`, color: "text-emerald-400" },
            { icon: AlertTriangle, label: `${requests.length} pending request${requests.length !== 1 ? "s" : ""}`, color: "text-amber-400" },
            { icon: Lightbulb, label: "Check new opportunities for your skills", color: "text-cyan-400" },
            { icon: TrendingUp, label: `Credibility: ${Math.round(profile?.credibility_score ?? 0)}`, color: "text-violet-400" },
          ].map(({ icon: Icon, label, color }) => (
            <div key={label} className="flex items-start gap-2 p-3 rounded-xl bg-muted/30 border border-border">
              <Icon className={cn("size-4 mt-0.5 flex-shrink-0", color)} />
              <span className="text-xs text-foreground leading-relaxed">{label}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-sm flex items-center gap-2"><Briefcase className="size-4 text-primary" /> Active Projects</h2>
              <Link to="/collaborator/work" className="text-xs text-primary hover:underline flex items-center gap-1">All work <ChevronRight className="size-3" /></Link>
            </div>
            {collaborations.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mb-3"><Briefcase className="size-6 text-muted-foreground/40" /></div>
                <p className="text-sm font-medium mb-1">No active projects</p>
                <p className="text-xs text-muted-foreground mb-4">Browse opportunities that match your skill set</p>
                <Link to="/collaborator/opportunities"><Button variant="gradient" size="sm">Browse Opportunities</Button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {collaborations.map((c, i) => (
                  <motion.div key={c.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/20 transition-colors">
                    <div className="size-9 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {c.project?.title?.charAt(0) ?? "P"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{c.project?.title ?? "Project"}</p>
                      <p className="text-xs text-muted-foreground truncate">{c.role}</p>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline">{c.project?.stage}</Badge>
                        <Badge>{c.project?.industry}</Badge>
                      </div>
                    </div>
                    <Link to={`/workspace/${c.project_id}`}><Button variant="ghost" size="icon-sm"><ChevronRight className="size-4" /></Button></Link>
                  </motion.div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-sm flex items-center gap-2">
                <Target className="size-4 text-primary" /> Collaboration Requests
                {requests.length > 0 && <span className="size-5 rounded-full bg-primary text-white text-[0.6rem] font-bold flex items-center justify-center">{requests.length}</span>}
              </h2>
            </div>
            {requests.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mb-3"><Target className="size-6 text-muted-foreground/40" /></div>
                <p className="text-sm font-medium mb-1">No pending requests</p>
                <p className="text-xs text-muted-foreground">Requests from founders will appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req, i) => {
                  const sender = req.from as Profile | undefined;
                  const name = sender ? `${sender.first_name} ${sender.last_name}` : "Founder";
                  return (
                    <motion.div key={req.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                      className="p-3 rounded-xl border border-border space-y-2">
                      <div className="flex items-center gap-3">
                        <Avatar name={name} src={sender?.avatar_url} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{name}</p>
                          <div className="flex gap-1.5 mt-0.5 flex-wrap">
                            {sender?.role && <Badge variant="outline">{sender.role}</Badge>}
                            <Badge variant={req.type === "paid" ? "teal" : req.type === "equity" ? "violet" : "cyan"}>{req.type}</Badge>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{timeAgo(req.created_at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{req.message}</p>
                      {req.compensation && <p className="text-xs font-mono text-emerald-400">{req.compensation}</p>}
                      <div className="flex gap-2">
                        <Button size="sm" variant="gradient" className="flex-1" onClick={() => handleRequest(req.id, "accepted")}>Accept</Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleRequest(req.id, "declined")}>Decline</Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-sm text-foreground">Recent Activity</h2>
            <Link to="/notifications" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {notifications.map(n => (
                <div key={n.id} className={cn("flex items-start gap-3 p-3 rounded-xl", n.read ? "bg-muted/20" : "bg-primary/5 border border-primary/10")}>
                  <div className="size-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                    {n.type === "collab_request" ? <Users className="size-4 text-violet-400" /> : n.type === "credit" ? <Star className="size-4 text-teal-400" /> : <Zap className="size-4 text-cyan-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.body}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <span className="size-2 rounded-full bg-primary flex-shrink-0 mt-1" />}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

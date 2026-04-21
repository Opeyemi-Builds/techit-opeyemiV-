import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Star, TrendingUp, Briefcase, Zap,
  Award, CheckCircle, Clock, Target,
  ChevronRight, RefreshCw,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, StatCard, ProgressBar, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

const SCORE_COMPONENTS = [
  { key: "completed",  label: "Completed Projects", weight: 15, desc: "per completed project", Icon: CheckCircle, color: "text-emerald-400" },
  { key: "active",     label: "Active Projects",    weight: 5,  desc: "per active project",    Icon: Briefcase,  color: "text-cyan-400"   },
  { key: "posts",      label: "Community Posts",    weight: 1.5,desc: "per post (max 20)",     Icon: Zap,        color: "text-violet-400" },
  { key: "certs",      label: "Certifications",     weight: 8,  desc: "per certificate",       Icon: Award,      color: "text-amber-400"  },
  { key: "skills",     label: "Skills Listed",      weight: 1,  desc: "per skill (max 10)",    Icon: Target,     color: "text-teal-400"   },
  { key: "days",       label: "Days on Platform",   weight: 0.05,desc:"per day (max 365)",     Icon: Clock,      color: "text-rose-400"   },
];

export default function Performance() {
  const { profile, refreshProfile } = useAuth();
  const [stats, setStats]         = useState({ completed: 0, active: 0, total: 0, posts: 0, certs: 0, skills: 0, days: 0 });
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { if (profile?.user_id) load(); }, [profile?.user_id]);

  async function load() {
    setLoading(true);
    const [
      { data: collabs },
      { count: postCount },
      { data: profData },
    ] = await Promise.all([
      supabase.from("collaborations").select("status").eq("user_id", profile!.user_id),
      supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", profile!.user_id),
      supabase.from("profiles").select("certifications, created_at, skills").eq("user_id", profile!.user_id).single(),
    ]);

    const completed = (collabs ?? []).filter(c => c.status === "completed").length;
    const active    = (collabs ?? []).filter(c => c.status === "active").length;
    const certs     = Array.isArray(profData?.certifications) ? profData.certifications.length : 0;
    const skills    = profData?.skills?.length ?? 0;
    const days      = profData?.created_at
      ? Math.floor((Date.now() - new Date(profData.created_at).getTime()) / 86400000)
      : 0;

    setStats({ completed, active, total: (collabs ?? []).length, posts: postCount ?? 0, certs, skills, days });
    setLoading(false);
  }

  async function recalculate() {
    setRefreshing(true);
    // Trigger backend recalculation via analytics endpoint
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      await fetch("/api/analytics/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      await refreshProfile();
    } catch {}
    await load();
    setRefreshing(false);
  }

  const score = profile?.credibility_score ?? 0;
  const scoreLevel =
    score >= 80 ? { label: "Elite",    color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/25" } :
    score >= 60 ? { label: "Advanced", color: "text-cyan-400",    bg: "bg-cyan-500/15 border-cyan-500/25"     } :
    score >= 40 ? { label: "Growing",  color: "text-amber-400",   bg: "bg-amber-500/15 border-amber-500/25"   } :
                  { label: "Starter",  color: "text-muted-foreground", bg: "bg-muted border-border"             };

  const breakdown = [
    Math.min(stats.completed * 15, 45),
    Math.min(stats.active * 5, 25),
    Math.min(stats.posts * 1.5, 30),
    Math.min(stats.certs * 8, 40),
    Math.min(stats.skills, 10),
    Math.min(stats.days * 0.05, 18),
  ];

  return (
    <DashboardLayout title="Performance" action={
      <Button variant="outline" size="sm" onClick={recalculate} loading={refreshing} className="gap-2">
        <RefreshCw className="size-4" /> Recalculate
      </Button>
    }>
      <div className="max-w-4xl mx-auto space-y-6 page-enter">

        {/* Hero score card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-secondary/8 to-transparent border border-primary/20 p-8 relative overflow-hidden">
            <div className="orb orb-violet w-48 h-48 -top-12 -right-12 absolute opacity-40" />
            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Your Credibility Score</p>
                <div className="flex items-end gap-3 mb-2">
                  <span className="font-display font-extrabold text-7xl gradient-text">{Math.round(score)}</span>
                  <span className="text-2xl text-muted-foreground mb-2">/ 100</span>
                </div>
                <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold", scoreLevel.bg, scoreLevel.color)}>
                  <Star className="size-3.5" />
                  {scoreLevel.label} Collaborator
                </div>
              </div>
              <div className="w-full sm:w-48">
                <ProgressBar value={score} label="Overall score" color="from-primary to-secondary" />
                <div className="mt-4 space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Projects completed</span>
                    <span className="font-semibold text-foreground">{stats.completed}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Active collaborations</span>
                    <span className="font-semibold text-foreground">{stats.active}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Community posts</span>
                    <span className="font-semibold text-foreground">{stats.posts}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Total Collaborations", value: String(stats.total),     icon: <Briefcase className="size-5" />,     color: "violet" as const },
            { label: "Completed Projects",   value: String(stats.completed), icon: <CheckCircle className="size-5" />,   color: "teal"   as const },
            { label: "Active Now",           value: String(stats.active),    icon: <TrendingUp className="size-5" />,    color: "cyan"   as const },
            { label: "Certifications",       value: String(stats.certs),     icon: <Award className="size-5" />,         color: "amber"  as const },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>

        {/* Score breakdown */}
        <Card className="p-5">
          <h2 className="font-display font-bold text-sm text-foreground mb-5">Score Breakdown</h2>
          <div className="space-y-4">
            {SCORE_COMPONENTS.map((comp, i) => {
              const earned = Math.round(breakdown[i] * 10) / 10;
              const max = comp.key === "completed" ? 45 :
                          comp.key === "active"    ? 25 :
                          comp.key === "posts"     ? 30 :
                          comp.key === "certs"     ? 40 :
                          comp.key === "skills"    ? 10 : 18;
              const pct = max > 0 ? (earned / max) * 100 : 0;
              return (
                <motion.div key={comp.key} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.07 }}>
                  <div className="flex items-center gap-3 mb-1.5">
                    <comp.Icon className={cn("size-4 flex-shrink-0", comp.color)} />
                    <span className="text-sm font-medium text-foreground flex-1">{comp.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{earned} / {max} pts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-8 text-right">{Math.round(pct)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 ml-7">{comp.weight} pts {comp.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </Card>

        {/* How to improve */}
        <Card className="p-5">
          <h2 className="font-display font-bold text-sm text-foreground mb-4">How to Improve Your Score</h2>
          <div className="space-y-2">
            {[
              { action: "Complete active collaborations",  points: "+15 pts each", href: "/collaborator/work",         disabled: stats.active === 0           },
              { action: "Add verified certifications",     points: "+8 pts each",  href: "/settings",                  disabled: false                        },
              { action: "Post to the social feed",         points: "+1.5 pts each",href: "/feed",                      disabled: stats.posts >= 20            },
              { action: "List more skills on your profile",points: "+1 pt each",   href: "/settings",                  disabled: stats.skills >= 10           },
              { action: "Accept collaboration requests",   points: "+5 pts",       href: "/collaborator/opportunities", disabled: false                        },
            ].map(item => (
              <Link key={item.action} to={item.href}
                className={cn("flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group",
                  item.disabled && "opacity-50 pointer-events-none")}>
                <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="size-3.5 text-primary" />
                </div>
                <span className="text-sm text-foreground flex-1">{item.action}</span>
                <span className="text-xs font-mono text-emerald-400">{item.points}</span>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}

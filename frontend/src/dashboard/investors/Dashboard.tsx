import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Target, DollarSign, TrendingUp, Zap, ChevronRight, Search, RefreshCw, MessageCircle } from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, StatCard, Avatar, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { useCredits } from "../../contexts/CreditContext";
import { supabase } from "../../lib/supabase";
import { cn, timeAgo } from "../../lib/utils";
import type { Project } from "../../lib/api";

export default function InvestorDashboard() {
  const { profile } = useAuth();
  const { balance } = useCredits();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("projects")
      .select("*, founder:profiles!founder_id(first_name, last_name, country, credibility_score, avatar_url)")
      .eq("status", "active").order("ai_score", { ascending: false, nullsFirst: false }).limit(30);
    setProjects(data ?? []);
    setLoading(false);
  }

  async function contactFounder(founderId: string) {
    const { data } = await supabase.from("conversations").insert({ participant_ids: [profile!.user_id, founderId] }).select().single();
    if (data) navigate("/messages", { state: { conversationId: data.id } });
  }

  const filtered = projects.filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.industry.toLowerCase().includes(search.toLowerCase()));
  const highScore = projects.filter(p => (p.ai_score ?? 0) >= 80).length;

  return (
    <DashboardLayout action={<Link to="/investor/pipeline"><Button variant="gradient" size="sm"><Target className="size-4" /> Deal Pipeline</Button></Link>}>
      <div className="max-w-7xl mx-auto space-y-6 page-enter">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">Good to see you, {profile?.first_name ?? "Investor"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Discover AI-scored startup deals across the TechIT Network.</p>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Active Startups", value: String(projects.length), icon: <Target className="size-5" />, color: "violet" as const, helper: "available now" },
            { label: "High AI Score (80+)", value: String(highScore), icon: <Zap className="size-5" />, color: "teal" as const, helper: "top tier deals" },
            { label: "Credit Balance", value: balance.toLocaleString(), icon: <DollarSign className="size-5" />, color: "cyan" as const, helper: "available" },
            { label: "Your Credibility", value: String(Math.round(profile?.credibility_score ?? 0)), icon: <TrendingUp className="size-5" />, color: "rose" as const, helper: "trust score" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>

        <Card>
          <div className="p-5 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="font-display font-bold text-sm flex items-center gap-2"><Target className="size-4 text-primary" /> AI-Scored Deal Flow</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2">
                <Search className="size-4 text-muted-foreground" />
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search deals..." className="bg-transparent text-xs outline-none text-foreground placeholder:text-muted-foreground w-36" />
              </div>
              <Button variant="ghost" size="icon-sm" onClick={load}><RefreshCw className="size-4" /></Button>
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-border">
              {[1,2,3,4,5].map(i => <div key={i} className="p-5 animate-pulse flex gap-4"><div className="size-10 rounded-xl bg-muted" /><div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded w-48" /><div className="h-3 bg-muted rounded w-64" /></div></div>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center"><p className="font-semibold mb-1 text-foreground">No deals match</p><p className="text-sm text-muted-foreground">Try different keywords or clear the search</p></div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((project, i) => {
                const founder = project.founder;
                const founderName = founder ? `${founder.first_name} ${founder.last_name}` : "Founder";
                const score = project.ai_score ?? 0;
                return (
                  <motion.div key={project.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                    <Avatar name={founderName} src={founder?.avatar_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-foreground">{project.title}</span>
                        <Badge variant="outline">{project.stage}</Badge>
                        <Badge>{project.industry}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{project.pitch}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{founderName}{founder?.country ? ` · ${founder.country}` : ""}</p>
                    </div>
                    <div className="text-center flex-shrink-0 px-3">
                      <div className={cn("font-mono text-xl font-extrabold", score>=80?"text-emerald-400":score>=60?"text-amber-400":"text-rose-400")}>{score || "—"}</div>
                      <div className="text-xs text-muted-foreground">AI Score</div>
                    </div>
                    <Button size="sm" variant="gradient" onClick={() => contactFounder(founder?.user_id ?? project.founder_id)}>
                      <MessageCircle className="size-4" /> Contact
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

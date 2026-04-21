import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Target, Search, MessageCircle, RefreshCw } from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Avatar, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn, timeAgo } from "../../lib/utils";

const STAGES = ["All","Pre-Seed","Seed","MVP","Launch","Growth"];
const INDUSTRIES = ["All","AI/ML","FinTech","HealthTech","SaaS","Edtech","CleanTech","Web3"];

export default function Pipeline() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState("All");
  const [industry, setIndustry] = useState("All");
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(0);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("projects")
      .select("*, founder:profiles!founder_id(user_id, first_name, last_name, country, credibility_score, avatar_url, linkedin_url)")
      .eq("status", "active").order("ai_score", { ascending: false, nullsFirst: false });
    setProjects(data ?? []);
    setLoading(false);
  }

  async function contact(founderId: string) {
    const { data } = await supabase.from("conversations").insert({ participant_ids: [profile!.user_id, founderId] }).select().single();
    if (data) navigate("/messages", { state: { conversationId: data.id } });
  }

  const filtered = projects.filter(p => {
    if (stage !== "All" && p.stage !== stage) return false;
    if (industry !== "All" && p.industry !== industry) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (minScore > 0 && (p.ai_score ?? 0) < minScore) return false;
    return true;
  });

  return (
    <DashboardLayout title="Deal Pipeline">
      <div className="max-w-6xl mx-auto space-y-5 page-enter">
        <Card className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2">
              <Search className="size-4 text-muted-foreground" />
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search startups..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
            </div>
            <select value={stage} onChange={e=>setStage(e.target.value)} className="h-10 rounded-xl border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={industry} onChange={e=>setIndustry(e.target.value)} className="h-10 rounded-xl border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              {INDUSTRIES.map(s => <option key={s}>{s}</option>)}
            </select>
            <Button variant="ghost" size="icon-sm" onClick={load}><RefreshCw className="size-4" /></Button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium">Min AI Score:</span>
            <input type="range" min={0} max={100} value={minScore} onChange={e=>setMinScore(+e.target.value)} className="flex-1 max-w-xs accent-primary" />
            <span className="font-mono text-xs text-primary font-bold w-8">{minScore}</span>
          </div>
        </Card>

        <p className="text-sm text-muted-foreground">{filtered.length} deal{filtered.length !== 1 ? "s" : ""} found</p>

        {loading ? (
          <div className="space-y-4">{[1,2,3,4].map(i => <Card key={i} className="p-5 animate-pulse h-32" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center"><Target className="size-12 text-muted-foreground/30 mx-auto mb-4" /><p className="font-semibold text-foreground">No deals match your filters</p></Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((p, i) => {
              const founder = p.founder;
              const name = founder ? `${founder.first_name} ${founder.last_name}` : "Founder";
              const score = p.ai_score ?? 0;
              return (
                <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Card className="p-5 hover:border-primary/20 transition-all">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar name={name} src={founder?.avatar_url} size="md" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-display font-bold text-foreground">{p.title}</span>
                            <Badge variant="outline">{p.stage}</Badge>
                            <Badge>{p.industry}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2 leading-relaxed">{p.pitch}</p>
                          <p className="text-xs text-muted-foreground">{name}{founder?.country ? ` · ${founder.country}` : ""}{founder?.credibility_score != null ? ` · Score: ${Math.round(founder.credibility_score)}` : ""}</p>
                          {p.tech_stack?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {p.tech_stack.slice(0,4).map((t: string) => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{t}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 flex-shrink-0">
                        <div className="text-center"><div className={cn("font-display font-extrabold text-3xl",score>=80?"text-emerald-400":score>=60?"text-amber-400":"text-rose-400")}>{score||"—"}</div><div className="text-xs text-muted-foreground">AI Score</div></div>
                        <Button size="sm" variant="gradient" onClick={()=>contact(founder?.user_id ?? p.founder_id)}><MessageCircle className="size-4" /> Contact Founder</Button>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

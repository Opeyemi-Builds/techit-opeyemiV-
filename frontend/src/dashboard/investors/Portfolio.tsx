import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  PieChart, DollarSign, TrendingUp, Star,
  MessageCircle, ExternalLink, RefreshCw,
  ChevronRight, Zap, Award,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, StatCard, Avatar, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useCredits } from "../../contexts/CreditContext";
import { cn, timeAgo } from "../../lib/utils";

interface PortfolioProject {
  id: string;
  project_id: string;
  type?: string;
  compensation?: string;
  status?: string;
  created_at: string;
  project?: {
    id: string;
    title: string;
    pitch: string;
    industry: string;
    stage: string;
    ai_score?: number;
    founder_id: string;
    founder?: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
      country: string;
      credibility_score: number;
    };
  };
}

export default function Portfolio() {
  const { profile } = useAuth();
  const { balance } = useCredits();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<PortfolioProject[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"portfolio" | "watchlist">("portfolio");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    await Promise.all([loadPortfolio(), loadWatchlist()]);
    setLoading(false);
  }

  async function loadPortfolio() {
    // Investor portfolio = projects they've expressed interest in via collab requests
    const { data } = await supabase
      .from("collab_requests")
      .select(`
        id, project_id, type, compensation, status, created_at,
        project:projects(id, title, pitch, industry, stage, ai_score, founder_id,
          founder:profiles!founder_id(first_name, last_name, avatar_url, country, credibility_score))
      `)
      .eq("from_id", profile!.user_id)
      .eq("status", "accepted")
      .not("project_id", "is", null)
      .order("created_at", { ascending: false });
      
    // Force the cast to bypass Supabase's strict array inference on joins
    setPortfolio((data as any) ?? []);
  }

  async function loadWatchlist() {
    // Top scored projects the investor hasn't contacted yet
    const { data } = await supabase
      .from("projects")
      .select("*, founder:profiles!founder_id(first_name, last_name, avatar_url, country, credibility_score)")
      .eq("status", "active")
      .order("ai_score", { ascending: false, nullsFirst: false })
      .limit(10);
    setWatchlist(data ?? []);
  }

  async function startConversation(founderId: string) {
    const { data: existing } = await supabase.from("conversations")
      .select("id").contains("participant_ids", [profile!.user_id, founderId]).single();
    if (existing) {
      navigate("/messages", { state: { conversationId: existing.id } });
    } else {
      const { data } = await supabase.from("conversations")
        .insert({ participant_ids: [profile!.user_id, founderId] }).select().single();
      if (data) navigate("/messages", { state: { conversationId: data.id } });
    }
  }

  const totalDeployed = portfolio.reduce((sum, p) => {
    const amount = parseFloat(p.compensation?.replace(/[^0-9.]/g, "") ?? "0");
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  return (
    <DashboardLayout title="Portfolio">
      <div className="max-w-5xl mx-auto space-y-6 page-enter">

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Portfolio Companies", value: String(portfolio.length), icon: <PieChart className="size-5" />, color: "violet" as const, helper: "active deals" },
            { label: "Capital Deployed",    value: totalDeployed > 0 ? `$${totalDeployed.toLocaleString()}` : "$0", icon: <DollarSign className="size-5" />, color: "cyan" as const, helper: "total invested" },
            { label: "Credit Balance",      value: balance.toLocaleString(), icon: <Zap className="size-5" />, color: "teal" as const, helper: "available" },
            { label: "Credibility Score",   value: String(Math.round(profile?.credibility_score ?? 0)), icon: <Star className="size-5" />, color: "rose" as const, helper: "trust score" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {(["portfolio", "watchlist"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {t === "portfolio" ? `Portfolio (${portfolio.length})` : `Deal Watchlist (${watchlist.length})`}
            </button>
          ))}
        </div>

        {/* Portfolio tab */}
        {tab === "portfolio" && (
          loading ? (
            <div className="space-y-4">{[1,2,3].map(i => <Card key={i} className="p-5 animate-pulse h-28" />)}</div>
          ) : portfolio.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <PieChart className="size-7 text-muted-foreground/40" />
              </div>
              <h3 className="font-display font-bold text-lg mb-2 text-foreground">No investments yet</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                Browse the deal pipeline and send collaboration requests to founders you want to invest in.
              </p>
              <Button variant="gradient" onClick={() => navigate("/investor/pipeline")}>
                Browse Deal Pipeline
              </Button>
            </Card>
          ) : (
            <div className="space-y-4">
              {portfolio.map((item, i) => {
                const proj = item.project;
                const founder = proj?.founder;
                const founderName = founder ? `${founder.first_name} ${founder.last_name}` : "Founder";
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                    <Card className="p-5 hover:border-primary/20 transition-all">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="size-12 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                            {proj?.title?.[0]?.toUpperCase() ?? "P"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="font-display font-bold text-foreground">{proj?.title ?? "Project"}</h3>
                              <Badge>{proj?.industry}</Badge>
                              <Badge variant="teal">{item.type}</Badge>
                              {proj?.ai_score != null && (
                                <span className="font-mono text-xs text-emerald-400 font-bold">AI: {proj.ai_score}</span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{proj?.pitch}</p>
                            {founder && (
                              <div className="flex items-center gap-2">
                                <Avatar name={founderName} src={founder.avatar_url} size="xs" />
                                <span className="text-xs text-muted-foreground">{founderName} · {founder.country}</span>
                                <span className="text-xs font-mono text-amber-400">Score: {Math.round(founder.credibility_score)}</span>
                              </div>
                            )}
                            {item.compensation && (
                              <p className="text-xs font-mono text-emerald-400 mt-1">{item.compensation}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 items-start">
                          <Button size="sm" variant="outline" onClick={() => founder && startConversation(proj!.founder_id)}>
                            <MessageCircle className="size-4" /> Message
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )
        )}

        {/* Watchlist tab */}
        {tab === "watchlist" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Top-scored active projects on the platform — sorted by AI evaluation score.</p>
            {loading ? (
              <div className="space-y-4">{[1,2,3].map(i => <Card key={i} className="p-5 animate-pulse h-24" />)}</div>
            ) : watchlist.map((proj, i) => {
              const founder = proj.founder;
              const founderName = founder ? `${founder.first_name} ${founder.last_name}` : "Founder";
              return (
                <motion.div key={proj.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-4 hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold flex-shrink-0">
                        {proj.title?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-foreground">{proj.title}</span>
                          <Badge variant="outline">{proj.stage}</Badge>
                          <Badge>{proj.industry}</Badge>
                          {proj.ai_score != null && (
                            <span className={cn("font-mono text-xs font-bold",
                              proj.ai_score >= 80 ? "text-emerald-400" : proj.ai_score >= 60 ? "text-amber-400" : "text-rose-400")}>
                              AI: {proj.ai_score}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{proj.pitch}</p>
                        {founder && (
                          <p className="text-xs text-muted-foreground mt-0.5">{founderName} · {founder.country}</p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/u/${proj.founder_id}`)}>
                          View
                        </Button>
                        <Button size="sm" variant="gradient" onClick={() => founder && startConversation(proj.founder_id)}>
                          <MessageCircle className="size-4" /> Contact
                        </Button>
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
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  TrendingUp, TrendingDown, Zap, RefreshCw,
  ArrowDownLeft, ArrowUpRight, Gift, Star,
  CreditCard, Award,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, StatCard } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useCredits } from "../../contexts/CreditContext";
import { cn, timeAgo } from "../../lib/utils";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  action: string;
  description: string;
  created_at: string;
}

const ACTION_ICONS: Record<string, { Icon: React.ComponentType<{ className?: string }>; color: string }> = {
  ai_match:       { Icon: Zap,          color: "text-violet-400" },
  idea_eval:      { Icon: Zap,          color: "text-primary"    },
  collab_request: { Icon: CreditCard,   color: "text-cyan-400"   },
  purchase:       { Icon: CreditCard,   color: "text-emerald-400"},
  signup_bonus:   { Icon: Gift,         color: "text-teal-400"   },
  achievement:    { Icon: Award,        color: "text-amber-400"  },
  default:        { Icon: TrendingUp,   color: "text-muted-foreground" },
};

const FILTERS = ["All", "Earned", "Spent"];

export default function Earnings() {
  const { profile } = useAuth();
  const { balance, refresh } = useCredits();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState("All");

  useEffect(() => { if (profile?.user_id) load(); }, [profile?.user_id]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", profile!.user_id)
      .order("created_at", { ascending: false })
      .limit(100);
    setTransactions(data ?? []);
    refresh();
    setLoading(false);
  }

  const earned = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const spent  = Math.abs(transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  const filtered = transactions.filter(t => {
    if (filter === "Earned") return t.amount > 0;
    if (filter === "Spent")  return t.amount < 0;
    return true;
  });

  return (
    <DashboardLayout title="Credits & Earnings" action={
      <Button variant="ghost" size="sm" onClick={load} className="gap-2">
        <RefreshCw className="size-4" /> Refresh
      </Button>
    }>
      <div className="max-w-4xl mx-auto space-y-6 page-enter">

        {/* Balance hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-secondary/8 to-transparent border border-primary/20 p-8 relative overflow-hidden">
          <div className="orb orb-cyan w-48 h-48 -top-10 -right-10 absolute opacity-40" />
          <div className="relative z-10">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Credit Balance</p>
            <div className="font-display font-extrabold text-6xl gradient-text mb-1">{balance.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mb-6">credits available to spend</p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/wallet">
                <Button variant="gradient" size="lg"><CreditCard className="size-4" /> Buy Credits</Button>
              </Link>
              <Link to="/wallet#earn">
                <Button variant="outline" size="lg"><Gift className="size-4" /> Earn Free Credits</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Earned"  value={earned.toLocaleString()} icon={<TrendingUp className="size-5" />}  color="teal"   helper="all time" trend="up" />
          <StatCard label="Total Spent"   value={spent.toLocaleString()}  icon={<TrendingDown className="size-5" />} color="rose"   helper="all time" />
          <StatCard label="Credibility"   value={String(Math.round(profile?.credibility_score ?? 0))} icon={<Star className="size-5" />} color="amber" helper="trust score" />
        </div>

        {/* How to earn */}
        <Card className="p-5">
          <h3 className="font-display font-bold text-sm text-foreground mb-4 flex items-center gap-2">
            <Gift className="size-4 text-primary" /> Ways to Earn Credits
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { action: "Complete a project milestone",   earn: "+50",  how: "Mark projects as completed" },
              { action: "Receive a 5-star review",        earn: "+30",  how: "Deliver great work"         },
              { action: "Refer a friend who joins",       earn: "+100", how: "Share your referral link"   },
              { action: "Add a verified certification",   earn: "+40",  how: "Upload in Settings"         },
              { action: "7-day platform login streak",    earn: "+25",  how: "Log in every day"           },
              { action: "Post gets 50+ likes",            earn: "+20",  how: "Share quality content"      },
            ].map(item => (
              <div key={item.action} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                <div className="size-7 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="size-3.5 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{item.action}</p>
                  <p className="text-xs text-muted-foreground">{item.how}</p>
                </div>
                <span className="font-mono text-sm text-emerald-400 font-bold flex-shrink-0">{item.earn}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Transaction history */}
        <Card>
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h3 className="font-display font-bold text-sm text-foreground">Transaction History</h3>
            <div className="flex gap-1">
              {FILTERS.map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={cn("px-3 py-1 rounded-lg text-xs font-medium transition-all",
                    filter === f ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="size-9 rounded-xl bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-48" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                  <div className="h-4 bg-muted rounded w-16" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Zap className="size-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                {filter === "All" ? "No transactions yet" : `No ${filter.toLowerCase()} transactions`}
              </p>
              <p className="text-xs text-muted-foreground">
                Use AI features or buy credits to see transactions here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((tx, i) => {
                const isEarned = tx.amount > 0;
                const cfg = ACTION_ICONS[tx.action] ?? ACTION_ICONS.default;
                return (
                  <motion.div key={tx.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <div className={cn("size-9 rounded-xl flex items-center justify-center flex-shrink-0",
                      isEarned ? "bg-emerald-500/10" : "bg-rose-500/10")}>
                      {isEarned
                        ? <ArrowDownLeft className="size-4 text-emerald-400" />
                        : <ArrowUpRight className="size-4 text-rose-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <cfg.Icon className={cn("size-3", cfg.color)} />
                        <p className="text-xs text-muted-foreground">{tx.action.replace(/_/g, " ")} · {timeAgo(tx.created_at)}</p>
                      </div>
                    </div>
                    <span className={cn("font-mono text-sm font-bold flex-shrink-0",
                      isEarned ? "text-emerald-400" : "text-rose-400")}>
                      {isEarned ? "+" : ""}{tx.amount.toLocaleString()}
                    </span>
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

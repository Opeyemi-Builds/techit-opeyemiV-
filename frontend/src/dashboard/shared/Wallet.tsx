import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  TrendingUp, TrendingDown, Plus, Star,
  ArrowUpRight, ArrowDownLeft, CreditCard,
  Gift, RefreshCw, Brain, Zap, Rocket,
  Briefcase, BarChart, FileText, CheckCircle,
  Target, Award, Flame, Heart,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, StatCard } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useCredits } from "../../contexts/CreditContext";
import { cn, timeAgo } from "../../lib/utils";

const COSTS = [
  { action: "AI Collaborator Matching",      cost: 50,  Icon: Brain    },
  { action: "Idea AI Evaluation",            cost: 75,  Icon: Zap      },
  { action: "Incubation Hub (monthly)",      cost: 200, Icon: Rocket   },
  { action: "Paid Collaboration Request",    cost: 25,  Icon: Briefcase},
  { action: "Priority Profile Boost (week)", cost: 100, Icon: BarChart  },
  { action: "Export Project Report",         cost: 30,  Icon: FileText },
];

const EARN = [
  { action: "Complete a project milestone",   earn: 50,  Icon: CheckCircle },
  { action: "Receive a 5-star review",        earn: 30,  Icon: Star        },
  { action: "Refer a user who joins",         earn: 100, Icon: Target      },
  { action: "Post gets 50+ likes",            earn: 20,  Icon: Heart       },
  { action: "Add verified certification",     earn: 40,  Icon: Award       },
  { action: "7-day login streak",             earn: 25,  Icon: Flame       },
];

const PKGS = [
  { id: "starter", credits: 500,   price: 5,  label: "Starter" },
  { id: "builder", credits: 1500,  price: 12, label: "Builder", popular: true },
  { id: "pro",     credits: 5000,  price: 35, label: "Pro"     },
  { id: "elite",   credits: 15000, price: 90, label: "Elite"   },
];

export default function Wallet() {
  const { profile } = useAuth();
  const { balance, refresh } = useCredits();
  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "buy" | "earn">("overview");
  const [selectedPkg, setSelectedPkg] = useState(1);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from("credit_transactions")
      .select("*")
      .eq("user_id", profile!.user_id)
      .order("created_at", { ascending: false })
      .limit(30);
    setTxs(data ?? []);
    setLoading(false);
  }

  async function purchase() {
    setPurchasing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token
        ?? (await supabase.auth.refreshSession()).data.session?.access_token;

      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ packageId: PKGS[selectedPkg].id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Payment setup failed");
      }

      const { url } = await res.json();
      if (url) window.location.href = url;
      else throw new Error("No checkout URL returned");
    } catch (e: unknown) {
      alert((e as Error).message + "\n\nEnsure the backend is running and Stripe keys are set in backend/.env");
    }
    setPurchasing(false);
  }

  const earned = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const spent   = Math.abs(txs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  return (
    <DashboardLayout title="Wallet & Credits">
      <div className="max-w-4xl mx-auto space-y-6 page-enter">

        {/* Balance Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/8 to-transparent border border-primary/20 p-8 relative overflow-hidden">
          <div className="orb orb-violet w-64 h-64 -top-20 -right-20 opacity-40 absolute" />
          <div className="relative z-10">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Your Credit Balance</p>
            <div className="font-display font-extrabold text-6xl gradient-text mb-1">{balance.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mb-6">credits available</p>
            <div className="flex gap-3 flex-wrap">
              <Button variant="gradient" size="lg" onClick={() => setTab("buy")}>
                <Plus className="size-4" /> Buy Credits
              </Button>
              <Button variant="outline" size="lg" onClick={() => setTab("earn")}>
                <Gift className="size-4" /> Earn Free Credits
              </Button>
              <Button variant="ghost" size="lg" onClick={() => { refresh(); load(); }}>
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Earned" value={earned.toLocaleString()} icon={<TrendingUp className="size-5" />} color="teal" trend="up" helper="all time" />
          <StatCard label="Total Spent"  value={spent.toLocaleString()}  icon={<TrendingDown className="size-5" />} color="rose" helper="all time" />
          <StatCard label="Credibility"  value={String(Math.round(profile?.credibility_score ?? 0))} icon={<Star className="size-5" />} color="amber" helper="trust score" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {(["overview", "buy", "earn"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all capitalize",
                tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "buy" ? "Buy Credits" : t === "earn" ? "Earn Credits" : "Overview"}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="space-y-5">
            <Card>
              <div className="p-5 border-b border-border">
                <h3 className="font-display font-bold text-sm text-foreground">Credit Costs</h3>
              </div>
              <div className="divide-y divide-border">
                {COSTS.map(item => (
                  <div key={item.action} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.Icon className="size-4 text-primary" />
                    </div>
                    <span className="flex-1 text-sm text-foreground">{item.action}</span>
                    <span className="font-mono text-sm text-primary font-semibold">{item.cost} cr</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="font-display font-bold text-sm text-foreground">Transaction History</h3>
                <span className="text-xs text-muted-foreground">{txs.length} records</span>
              </div>
              {loading ? (
                <div className="p-5 text-center text-sm text-muted-foreground">Loading...</div>
              ) : txs.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm text-muted-foreground">No transactions yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {txs.map(tx => (
                    <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 transition-colors">
                      <div className={cn("size-9 rounded-xl flex items-center justify-center flex-shrink-0", tx.amount > 0 ? "bg-emerald-500/10" : "bg-rose-500/10")}>
                        {tx.amount > 0
                          ? <ArrowDownLeft className="size-4 text-emerald-400" />
                          : <ArrowUpRight className="size-4 text-rose-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{timeAgo(tx.created_at)}</p>
                      </div>
                      <span className={cn("font-mono text-sm font-bold", tx.amount > 0 ? "text-emerald-400" : "text-rose-400")}>
                        {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Buy */}
        {tab === "buy" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {PKGS.map((pkg, i) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPkg(i)}
                  className={cn(
                    "relative rounded-2xl border p-5 text-left transition-all",
                    selectedPkg === i
                      ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  )}
                >
                  {pkg.popular && (
                    <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-[0.6rem] font-bold uppercase">
                      Popular
                    </div>
                  )}
                  <div className="font-display font-bold text-2xl gradient-text mb-1">{pkg.credits.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground mb-3">credits</div>
                  <div className="font-semibold text-foreground">${pkg.price}</div>
                  <div className="text-xs text-muted-foreground">{pkg.label} Pack</div>
                </button>
              ))}
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-bold text-foreground">Complete Purchase</h3>
                  <p className="text-sm text-muted-foreground">
                    {PKGS[selectedPkg].credits.toLocaleString()} credits for ${PKGS[selectedPkg].price}
                  </p>
                </div>
                <div className="font-display font-bold text-3xl gradient-text">${PKGS[selectedPkg].price}</div>
              </div>
              <Button variant="gradient" size="lg" className="w-full" onClick={purchase} loading={purchasing}>
                <CreditCard className="size-4" /> Pay ${PKGS[selectedPkg].price} with Stripe
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-3">
                Secure payment · Credits added instantly · No subscription required
              </p>
            </Card>
          </div>
        )}

        {/* Earn */}
        {tab === "earn" && (
          <div className="space-y-4">
            <Card>
              <div className="p-5 border-b border-border">
                <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                  <Gift className="size-4 text-primary" /> Ways to Earn Credits
                </h3>
              </div>
              <div className="divide-y divide-border">
                {EARN.map(item => (
                  <div key={item.action} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                    <div className="size-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                      <item.Icon className="size-4 text-emerald-400" />
                    </div>
                    <span className="flex-1 text-sm text-foreground">{item.action}</span>
                    <span className="font-mono text-sm text-emerald-400 font-bold">+{item.earn}</span>
                  </div>
                ))}
              </div>
            </Card>

            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/15 text-center space-y-3">
              <p className="text-sm text-foreground font-medium">Share your referral link</p>
              <p className="text-sm text-muted-foreground">
                Earn <span className="text-primary font-semibold">100 credits</span> for every new user who joins with your link.
              </p>
              <div className="flex items-center gap-2 max-w-sm mx-auto bg-muted rounded-xl px-3 py-2 border border-border">
                <span className="text-xs font-mono text-muted-foreground flex-1 truncate">
                  {window.location.origin}/signup?ref={profile?.username ?? profile?.user_id?.slice(0, 8)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(
                    `${window.location.origin}/signup?ref=${profile?.username ?? profile?.user_id?.slice(0, 8)}`
                  )}
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

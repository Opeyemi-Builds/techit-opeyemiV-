import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, TrendingDown, Plus, Star,
  CreditCard, Gift, RefreshCw, Brain, Zap, Rocket,
  Briefcase, BarChart, FileText, CheckCircle,
  Target, Award, Flame, Heart, Globe
} from "lucide-react";

import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, StatCard } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useCredits } from "../../contexts/CreditContext";
import { cn } from "../../lib/utils";

// Static Data
const COSTS = [
  { action: "AI Collaborator Matching", cost: 50, Icon: Brain },
  { action: "Idea AI Evaluation", cost: 75, Icon: Zap },
  { action: "Incubation Hub (monthly)", cost: 200, Icon: Rocket },
  { action: "Paid Collaboration Request", cost: 25, Icon: Briefcase },
  { action: "Priority Profile Boost (week)", cost: 100, Icon: BarChart },
  { action: "Export Project Report", cost: 30, Icon: FileText },
];

const EARN = [
  { action: "Complete a project milestone", earn: 50, Icon: CheckCircle },
  { action: "Receive a 5-star review", earn: 30, Icon: Star },
  { action: "Refer a user who joins", earn: 100, Icon: Target },
  { action: "Post gets 50+ likes", earn: 20, Icon: Heart },
  { action: "Add verified certification", earn: 40, Icon: Award },
  { action: "7-day login streak", earn: 25, Icon: Flame },
];

// Display prices (The Edge Function handles the actual safe charging)
const PKGS = [
  { id: "starter", credits: 500, priceNGN: 1000, priceUSD: 1.00, label: "Starter" },
  { id: "builder", credits: 1500, priceNGN: 2500, priceUSD: 2.50, label: "Builder", popular: true },
  { id: "pro", credits: 5000, priceNGN: 5000, priceUSD: 5.00, label: "Pro" },
  { id: "elite", credits: 15000, priceNGN: 10000, priceUSD: 10.00, label: "Elite" },
];

export default function Wallet() {
  const { profile } = useAuth();
  const { balance, refresh } = useCredits();
  const navigate = useNavigate();

  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "buy" | "earn">("overview");
  const [selectedPkg, setSelectedPkg] = useState(1); // Default to "Builder"
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");

  useEffect(() => {
    if (profile?.user_id) {
      load();
    }
  }, [profile]);

  async function load() {
    try {
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", profile!.user_id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setTxs(data ?? []);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  }

  function purchase() {
    const pkg = PKGS[selectedPkg];
    // Navigate with both the package ID and the selected currency
    navigate(`/payment-method?package=${pkg.id}&currency=${currency}`);
  }

  const earned = txs.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const spent = Math.abs(txs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0));

  return (
    <DashboardLayout title="Wallet & Credits">
      <div className="max-w-4xl mx-auto space-y-6 page-enter">

        {/* BALANCE HERO */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/8 to-transparent border border-primary/20 p-8 relative overflow-hidden">
          <div className="orb orb-violet w-64 h-64 -top-20 -right-20 opacity-40 absolute" />

          <div className="relative z-10">
            <p className="font-mono text-xs text-muted-foreground uppercase mb-2">
              Your Credit Balance
            </p>

            <div className="font-display text-6xl gradient-text">
              {balance.toLocaleString()}
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              credits available
            </p>

            <div className="flex gap-3 flex-wrap">
              <Button onClick={() => setTab("buy")}>
                <Plus className="size-4 mr-2" /> Buy
              </Button>

              <Button variant="outline" onClick={() => setTab("earn")}>
                <Gift className="size-4 mr-2" /> Earn
              </Button>

              <Button variant="ghost" onClick={() => { refresh(); load(); }}>
                <RefreshCw className={cn("size-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Earned" value={earned.toLocaleString()} icon={<TrendingUp />} />
          <StatCard label="Spent" value={spent.toLocaleString()} icon={<TrendingDown />} />
          <StatCard label="Credibility" value={String(profile?.credibility_score ?? 0)} icon={<Star />} />
        </div>

        {/* TABS CONTROLS */}
        <div className="flex bg-muted p-1 rounded-xl">
          {(["overview", "buy", "earn"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn("flex-1 py-2 rounded-lg capitalize transition-colors font-medium", tab === t && "bg-card shadow-sm")}
            >
              {t}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <Card className="p-5">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <RefreshCw className="size-4" /> Recent Transactions
            </h3>

            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading...</div>
            ) : txs.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No transactions yet.</div>
            ) : (
              <div className="space-y-3">
                {txs.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <span className="text-sm">{tx.description}</span>
                    <span className={cn("font-bold", tx.amount > 0 ? "text-green-500" : "text-red-500")}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* BUY TAB */}
        {tab === "buy" && (
          <div className="space-y-5">
            
            {/* Currency Toggle */}
            <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Globe className="size-4 text-primary" />
                Select Currency
              </div>
              <div className="flex bg-muted p-1 rounded-lg">
                <button 
                  onClick={() => setCurrency("NGN")} 
                  className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", currency === "NGN" && "bg-background shadow text-primary")}
                >
                  ₦ NGN
                </button>
                <button 
                  onClick={() => setCurrency("USD")} 
                  className={cn("px-4 py-1.5 rounded-md text-sm font-bold transition-all", currency === "USD" && "bg-background shadow text-primary")}
                >
                  $ USD
                </button>
              </div>
            </div>

            {/* Packages Grid */}
            <div className="grid grid-cols-2 gap-4">
              {PKGS.map((pkg, i) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPkg(i)}
                  className={cn(
                    "border p-5 rounded-xl text-left transition-all relative overflow-hidden",
                    selectedPkg === i 
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-md" 
                      : "hover:border-primary/50 bg-card"
                  )}
                >
                  {pkg.popular && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-bl-lg uppercase tracking-wider">
                      Popular
                    </div>
                  )}
                  <div className="font-bold text-lg mb-1">{pkg.label}</div>
                  <div className="text-muted-foreground text-sm mb-3 font-medium">
                    {pkg.credits.toLocaleString()} credits
                  </div>
                  <div className="font-display text-2xl text-foreground">
                    {currency === "NGN" ? `₦${pkg.priceNGN.toLocaleString()}` : `$${pkg.priceUSD.toFixed(2)}`}
                  </div>
                </button>
              ))}
            </div>

            <Card className="p-5">
              <Button className="w-full font-bold text-lg h-12 shadow-md hover:shadow-lg transition-all" onClick={purchase}>
                <CreditCard className="size-5 mr-2" />
                Proceed to Payment
              </Button>
            </Card>
          </div>
        )}

        {/* EARN TAB */}
        {tab === "earn" && (
          <Card className="p-5 space-y-4">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Star className="size-4 text-yellow-500" /> Ways to Earn Free Credits
            </h3>
            {EARN.map(e => (
              <div key={e.action} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <e.Icon className="size-5 text-primary" />
                  <span className="font-medium text-sm">{e.action}</span>
                </div>
                <span className="font-bold text-green-500">+{e.earn}</span>
              </div>
            ))}
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

/* =========================
   PRICING (USD)
========================= */

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

const PKGS = [
  { id: "starter", credits: 500, price: 0.001, label: "Starter" },
  { id: "builder", credits: 1500, price: 0.001, label: "Builder", popular: true },
  { id: "pro", credits: 5000, price: 0.001, label: "Pro" },
  { id: "elite", credits: 15000, price: 0.001, label: "Elite" },
];

export default function Wallet() {
  const { profile } = useAuth();
  const { balance, refresh } = useCredits();
  const navigate = useNavigate();

  const [txs, setTxs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "buy" | "earn">("overview");
  const [selectedPkg, setSelectedPkg] = useState(1);

  useEffect(() => {
    load();
  }, []);

  /* =========================
     LOAD TRANSACTIONS
  ========================= */
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

  /* =========================
     PAYMENT FLOW (FIXED)
  ========================= */
  function purchase() {
    const pkg = PKGS[selectedPkg];

    // 👉 Send user to payment method selection page
    navigate(`/payment-method?package=${pkg.id}`);
  }

  const earned = txs
    .filter(t => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0);

  const spent = Math.abs(
    txs.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0)
  );

  return (
    <DashboardLayout title="Wallet & Credits">
      <div className="max-w-4xl mx-auto space-y-6 page-enter">

        {/* BALANCE */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/8 to-transparent border border-primary/20 p-8 relative overflow-hidden">
          <div className="orb orb-violet w-64 h-64 -top-20 -right-20 opacity-40 absolute" />

          <div className="relative z-10">
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">
              Your Credit Balance
            </p>

            <div className="font-display font-extrabold text-6xl gradient-text mb-1">
              {balance.toLocaleString()}
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              credits available
            </p>

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

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Total Earned" value={earned.toLocaleString()} icon={<TrendingUp className="size-5" />} color="teal" />
          <StatCard label="Total Spent" value={spent.toLocaleString()} icon={<TrendingDown className="size-5" />} color="rose" />
          <StatCard label="Credibility" value={String(Math.round(profile?.credibility_score ?? 0))} icon={<Star className="size-5" />} color="amber" />
        </div>

        {/* TABS */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          {(["overview", "buy", "earn"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium capitalize",
                tab === t
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* BUY SECTION */}
        {tab === "buy" && (
          <div className="space-y-5">

            {/* PACKAGES */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {PKGS.map((pkg, i) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPkg(i)}
                  className={cn(
                    "rounded-2xl border p-5 text-left transition-all",
                    selectedPkg === i
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card"
                  )}
                >
                  {pkg.popular && (
                    <div className="text-[10px] px-2 py-1 bg-primary text-white rounded-full w-fit mb-2">
                      Popular
                    </div>
                  )}

                  <div className="font-display text-2xl gradient-text">
                    {pkg.credits.toLocaleString()}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    credits
                  </div>

                  <div className="font-semibold">
                    ${pkg.price}
                  </div>
                </button>
              ))}
            </div>

            {/* PAYMENT CARD */}
            <Card className="p-6">
              <div className="flex justify-between mb-5">
                <div>
                  <h3 className="font-bold">Complete Purchase</h3>
                  <p className="text-sm text-muted-foreground">
                    {PKGS[selectedPkg].credits.toLocaleString()} credits
                  </p>
                </div>

                <div className="font-display text-3xl gradient-text">
                  ${PKGS[selectedPkg].price}
                </div>
              </div>

              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={purchase}
              >
                <CreditCard className="size-4" />
                Pay Now
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-3">
                You’ll choose Paystack or Flutterwave next
              </p>
            </Card>
          </div>
        )}

        {/* OTHER TABS (kept minimal) */}
        {tab === "overview" && (
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Overview coming soon...</p>
          </Card>
        )}

        {tab === "earn" && (
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">Earn system coming soon...</p>
          </Card>
        )}

      </div>
    </DashboardLayout>
  );
}
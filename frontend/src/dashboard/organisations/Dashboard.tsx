import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Trophy, Users, Search, Target, Zap, ChevronRight } from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, StatCard, Avatar, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useCredits } from "../../contexts/CreditContext";
import { timeAgo } from "../../lib/utils";

export default function OrgDashboard() {
  const { profile } = useAuth();
  const { balance } = useCredits();
  const navigate = useNavigate();
  const [talentCount, setTalentCount] = useState(0);
  const [recentTalent, setRecentTalent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { count, data } = await supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .eq("role", "collaborator")
        .order("credibility_score", { ascending: false })
        .limit(6);
      setTalentCount(count ?? 0);
      setRecentTalent(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  async function contactTalent(userId: string) {
    const { data } = await supabase
      .from("conversations")
      .insert({ participant_ids: [profile!.user_id, userId] })
      .select().single();
    if (data) navigate("/messages", { state: { conversationId: data.id } });
  }

  return (
    <DashboardLayout
      action={<Link to="/org/talent"><Button variant="gradient" size="sm"><Search className="size-4" /> Find Talent</Button></Link>}
    >
      <div className="max-w-7xl mx-auto space-y-6 page-enter">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">
            Welcome, {profile?.org_name ?? profile?.first_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Find talent, post challenges, and engage with the builder community.
          </p>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Available Talent",    value: talentCount.toLocaleString(), icon: <Users className="size-5" />,  color: "violet" as const, helper: "collaborators" },
            { label: "Credit Balance",      value: balance.toLocaleString(),     icon: <Zap className="size-5" />,    color: "cyan"   as const, helper: "available"     },
            { label: "Challenges Posted",   value: "0",                          icon: <Trophy className="size-5" />, color: "teal"   as const, helper: "active"        },
            { label: "Credibility Score",   value: String(Math.round(profile?.credibility_score ?? 0)), icon: <Target className="size-5" />, color: "rose" as const, helper: "trust score" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <StatCard {...s} />
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-bold text-sm flex items-center gap-2 text-foreground">
                <Users className="size-4 text-primary" /> Available Talent
              </h2>
              <Link to="/org/talent" className="text-xs text-primary hover:underline flex items-center gap-1">
                Browse all <ChevronRight className="size-3" />
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : recentTalent.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No collaborators yet</p>
            ) : (
              <div className="space-y-3">
                {recentTalent.map(t => (
                  <div key={t.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors">
                    <Avatar name={`${t.first_name} ${t.last_name}`} src={t.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">{t.first_name} {t.last_name}</p>
                      <p className="text-xs text-muted-foreground">{t.country} · Score: {Math.round(t.credibility_score ?? 0)}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => contactTalent(t.user_id)}>Contact</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-display font-bold text-sm mb-4 text-foreground flex items-center gap-2">
              <Target className="size-4 text-primary" /> Quick Actions
            </h2>
            <div className="space-y-3">
              {[
                { label: "Post a Challenge",   href: "/org/challenges", desc: "Invite builders to solve your problem",  Icon: Trophy  },
                { label: "Search Talent",      href: "/org/talent",     desc: "Find developers, designers and more",    Icon: Search  },
                { label: "Social Feed",        href: "/feed",           desc: "Engage with the builder community",      Icon: Zap     },
                { label: "Buy Credits",        href: "/wallet",         desc: "Unlock premium matching features",       Icon: Target  },
              ].map(a => (
                <Link key={a.href} to={a.href} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-all group">
                  <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <a.Icon className="size-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{a.label}</p>
                    <p className="text-xs text-muted-foreground">{a.desc}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

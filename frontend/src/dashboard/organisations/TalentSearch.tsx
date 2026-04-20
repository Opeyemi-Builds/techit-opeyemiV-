import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Search, MessageCircle, RefreshCw, SlidersHorizontal } from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Avatar, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";

const SKILL_FILTERS = [
  "All", "React", "Node.js", "Python", "UI/UX Design",
  "Marketing", "Data Science", "Machine Learning", "DevOps", "Mobile",
];

export default function TalentSearch() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [talent, setTalent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("All");
  const [minCred, setMinCred] = useState(0);
  const [contacting, setContacting] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, avatar_url, country, credibility_score, skills, bio, weekly_hours, is_verified, role")
      .eq("role", "collaborator")
      .order("credibility_score", { ascending: false })
      .limit(60);
    setTalent(data ?? []);
    setLoading(false);
  }

  async function startConversation(userId: string) {
    setContacting(userId);
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .contains("participant_ids", [profile!.user_id, userId])
      .single();

    if (existing) {
      navigate("/messages", { state: { conversationId: existing.id } });
    } else {
      const { data } = await supabase
        .from("conversations")
        .insert({ participant_ids: [profile!.user_id, userId] })
        .select().single();
      if (data) navigate("/messages", { state: { conversationId: data.id } });
    }
    setContacting(null);
  }

  const filtered = talent.filter(t => {
    const name = `${t.first_name} ${t.last_name}`.toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (skillFilter !== "All" && !(t.skills ?? []).includes(skillFilter)) return false;
    if (minCred > 0 && (t.credibility_score ?? 0) < minCred) return false;
    return true;
  });

  return (
    <DashboardLayout title="Talent Search">
      <div className="max-w-5xl mx-auto space-y-5 page-enter">
        {/* Filters */}
        <Card className="p-4 space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2">
              <Search className="size-4 text-muted-foreground flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name..."
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <Button variant="ghost" size="icon-sm" onClick={load}>
              <RefreshCw className="size-4" />
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {SKILL_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setSkillFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                  skillFilter === s
                    ? "bg-primary text-white border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium">Min Credibility:</span>
            <input
              type="range" min={0} max={100}
              value={minCred}
              onChange={e => setMinCred(+e.target.value)}
              className="flex-1 max-w-xs accent-primary"
            />
            <span className="font-mono text-xs text-primary font-bold w-8">{minCred}</span>
          </div>
        </Card>

        <p className="text-sm text-muted-foreground">
          {filtered.length} talent{filtered.length !== 1 ? "s" : ""} found
        </p>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="p-5 animate-pulse">
                <div className="flex gap-3 mb-3">
                  <div className="size-10 rounded-xl bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-32" />
                    <div className="h-3 bg-muted rounded w-24" />
                  </div>
                </div>
                <div className="h-3 bg-muted rounded mb-4" />
                <div className="h-8 bg-muted rounded-xl" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Search className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-semibold text-foreground mb-1">No talent found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((t, i) => {
              const name = `${t.first_name} ${t.last_name}`;
              return (
                <motion.div
                  key={t.user_id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className="p-4 hover:border-primary/20 transition-all">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar name={name} src={t.avatar_url} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-sm text-foreground">{name}</span>
                          {t.is_verified && <Badge variant="teal">Verified</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t.country && <>{t.country} · </>}
                          Score: {Math.round(t.credibility_score ?? 0)}
                          {t.weekly_hours && <> · {t.weekly_hours}h/wk</>}
                        </p>
                      </div>
                    </div>

                    {t.bio && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{t.bio}</p>
                    )}

                    {t.skills?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {t.skills.slice(0, 4).map((s: string) => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/20">
                            {s}
                          </span>
                        ))}
                        {t.skills.length > 4 && (
                          <span className="text-xs text-muted-foreground">+{t.skills.length - 4} more</span>
                        )}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="gradient"
                      className="w-full"
                      loading={contacting === t.user_id}
                      onClick={() => startConversation(t.user_id)}
                    >
                      <MessageCircle className="size-4" /> Contact
                    </Button>
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

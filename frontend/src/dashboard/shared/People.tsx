import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, UserPlus, UserCheck, MessageCircle,
  Filter, RefreshCw, Users, X, Check, AlertCircle
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Avatar, Badge, RoleBadge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";

interface Person {
  user_id: string;
  first_name: string;
  last_name: string;
  username: string | null;
  avatar_url: string | null;
  role: string;
  country: string;
  bio: string | null;
  skills: string[];
  credibility_score: number;
  is_verified: boolean;
  weekly_hours: number | null;
}

type ConnectionStatus = "none" | "pending_sent" | "pending_received" | "connected" | "self";

const ROLES = ["All", "founder", "collaborator", "investor", "organisation"];
const COUNTRIES = ["All", "Nigeria", "Ghana", "Kenya", "South Africa", "India", "United States", "United Kingdom", "Other"];

export default function People() {
  const { profile, loading: authLoading } = useAuth(); // Grab authLoading to prevent premature calls
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [people, setPeople]       = useState<Person[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState(searchParams.get("q") ?? "");
  const [roleFilter, setRole]     = useState("All");
  const [countryFilter, setCtry]  = useState("All");
  const [showFilters, setShowF]   = useState(false);
  const [connections, setConns]   = useState<Record<string, ConnectionStatus>>({});
  const [actionLoading, setAL]    = useState<string | null>(null);
  const [error, setError]         = useState("");

  // Memoized load function to handle safety checks
  const load = useCallback(async () => {
    // CRITICAL: Stop if Auth is still thinking or if we have no user
    if (authLoading || !profile?.user_id) {
      if (!authLoading && !profile) setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      let q = supabase
        .from("profiles")
        .select("user_id, first_name, last_name, username, avatar_url, role, country, bio, skills, credibility_score, is_verified, weekly_hours")
        .neq("user_id", profile.user_id) // Removed the dangerous '!'
        .order("credibility_score", { ascending: false })
        .limit(40);

      if (query.trim()) {
        q = q.or(
          `first_name.ilike.%${query}%,last_name.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%`
        );
      }
      if (roleFilter !== "All") q = q.eq("role", roleFilter);
      if (countryFilter !== "All") q = q.eq("country", countryFilter);

      const { data, error: fetchError } = await q;
      if (fetchError) throw fetchError;
      
      const peopleData = data ?? [];
      setPeople(peopleData);

      // Load connection statuses
      if (peopleData.length > 0) {
        const ids = peopleData.map(p => p.user_id);
        const [{ data: sent }, { data: received }] = await Promise.all([
          supabase.from("connections").select("to_id, status").eq("from_id", profile.user_id).in("to_id", ids),
          supabase.from("connections").select("from_id, status").eq("to_id", profile.user_id).in("from_id", ids)
        ]);

        const map: Record<string, ConnectionStatus> = {};
        (sent ?? []).forEach((c) => {
          map[c.to_id] = c.status === "accepted" ? "connected" : "pending_sent";
        });
        (received ?? []).forEach((c) => {
          if (!map[c.from_id]) {
            map[c.from_id] = c.status === "accepted" ? "connected" : "pending_received";
          }
        });
        setConns(map);
      }
    } catch (err: any) {
      console.error("[People] Load Error:", err.message);
      setError("Failed to load community members.");
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id, authLoading, query, roleFilter, countryFilter]);

  // Effect to trigger load when criteria or auth status changes
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [load]);

  async function sendConnectionRequest(toId: string) {
    if (!profile) return;
    setAL(toId);
    const { error } = await supabase.from("connections").insert({
      from_id: profile.user_id,
      to_id: toId,
      status: "pending",
    });
    if (!error) {
      setConns(prev => ({ ...prev, [toId]: "pending_sent" }));
    }
    setAL(null);
  }

  async function acceptRequest(fromId: string) {
    if (!profile) return;
    setAL(fromId);
    await supabase.from("connections")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("from_id", fromId)
      .eq("to_id", profile.user_id);
    
    setConns(prev => ({ ...prev, [fromId]: "connected" }));

    // Start conversation automatically
    const { data: existing } = await supabase.from("conversations")
      .select("id")
      .contains("participant_ids", [profile.user_id, fromId])
      .maybeSingle();
      
    if (!existing) {
      await supabase.from("conversations").insert({
        participant_ids: [profile.user_id, fromId],
      });
    }
    setAL(null);
  }

  async function startChat(userId: string) {
    if (!profile) return;
    const { data: existing } = await supabase.from("conversations")
      .select("id")
      .contains("participant_ids", [profile.user_id, userId])
      .maybeSingle();

    if (existing) {
      navigate("/messages", { state: { conversationId: existing.id } });
    } else {
      const { data } = await supabase.from("conversations")
        .insert({ participant_ids: [profile.user_id, userId] })
        .select().single();
      if (data) navigate("/messages", { state: { conversationId: data.id } });
    }
  }

  function ConnectButton({ person }: { person: Person }) {
    const status = connections[person.user_id] ?? "none";
    const isLoading = actionLoading === person.user_id;

    if (status === "connected") {
      return (
        <Button size="sm" variant="outline" className="gap-1.5 text-emerald-400 border-emerald-500/30" disabled>
          <UserCheck className="size-4" /> Connected
        </Button>
      );
    }
    if (status === "pending_sent") {
      return (
        <Button size="sm" variant="outline" className="gap-1.5" disabled>
          <UserPlus className="size-4" /> Requested
        </Button>
      );
    }
    if (status === "pending_received") {
      return (
        <Button size="sm" variant="gradient" className="gap-1.5" loading={isLoading} onClick={() => acceptRequest(person.user_id)}>
          <Check className="size-4" /> Accept
        </Button>
      );
    }
    return (
      <Button size="sm" variant="outline" className="gap-1.5" loading={isLoading} onClick={() => sendConnectionRequest(person.user_id)}>
        <UserPlus className="size-4" /> Connect
      </Button>
    );
  }

  return (
    <DashboardLayout title="People">
      <div className="max-w-5xl mx-auto space-y-5 page-enter">
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-xl flex items-center gap-3">
            <AlertCircle className="size-4" /> {error}
            <Button variant="ghost" size="sm" className="ml-auto" onClick={load}>Retry</Button>
          </div>
        )}

        {/* Search bar */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <Search className="size-5 text-muted-foreground flex-shrink-0" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setSearchParams(e.target.value ? { q: e.target.value } : {}); }}
              placeholder="Search by name, username, skills, or bio..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none"
              autoFocus
            />
            {query && (
              <button onClick={() => { setQuery(""); setSearchParams({}); }} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button variant="outline" onClick={() => setShowF(s => !s)} className="gap-2">
            <Filter className="size-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={load}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          </Button>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-2xl overflow-hidden">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Role</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(r => (
                    <button key={r} onClick={() => setRole(r)}
                      className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize",
                        roleFilter === r ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country</label>
                <select value={countryFilter} onChange={e => setCtry(e.target.value)}
                  className="w-full h-9 rounded-xl border border-border bg-input px-3 text-sm text-foreground focus:outline-none">
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="p-4 animate-pulse h-40 bg-muted/20" />
            ))}
          </div>
        ) : people.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Users className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-display font-bold text-lg mb-1 text-foreground">No people found</p>
            <p className="text-sm text-muted-foreground">Try different keywords or clear filters.</p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {people.map((person, i) => (
              <motion.div key={person.user_id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-4 hover:border-primary/20 transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <button onClick={() => navigate(`/u/${person.user_id}`)}>
                      <Avatar name={`${person.first_name} ${person.last_name}`} src={person.avatar_url ?? undefined} size="lg" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <button
                          onClick={() => navigate(`/u/${person.user_id}`)}
                          className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate"
                        >
                          {person.first_name} {person.last_name}
                        </button>
                        <RoleBadge role={person.role as any} />
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">@{person.username || "user"}</p>
                      <p className="text-xs text-muted-foreground">
                        {person.country} {person.credibility_score > 0 && `· Score: ${Math.round(person.credibility_score)}`}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 h-8">
                    {person.bio || "No bio added yet."}
                  </p>

                  <div className="flex gap-2">
                    <ConnectButton person={person} />
                    {(connections[person.user_id] === "connected" || connections[person.user_id] === "pending_received") && (
                      <Button size="sm" variant="gradient" className="flex-1 gap-1.5" onClick={() => startChat(person.user_id)}>
                        <MessageCircle className="size-4" /> Message
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => navigate(`/u/${person.user_id}`)}>
                      Profile
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
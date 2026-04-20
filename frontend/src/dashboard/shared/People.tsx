import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  Search, UserPlus, UserCheck, MessageCircle,
  Filter, RefreshCw, Users, X, Check,
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
  const { profile } = useAuth();
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

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(), 350);
    return () => clearTimeout(t);
  }, [query, roleFilter, countryFilter]);

  async function load() {
    setLoading(true);
    let q = supabase
      .from("profiles")
      .select("user_id, first_name, last_name, username, avatar_url, role, country, bio, skills, credibility_score, is_verified, weekly_hours")
      .neq("user_id", profile!.user_id)
      .order("credibility_score", { ascending: false })
      .limit(40);

    if (query.trim()) {
      q = q.or(
        `first_name.ilike.%${query}%,last_name.ilike.%${query}%,username.ilike.%${query}%,bio.ilike.%${query}%`
      );
    }
    if (roleFilter !== "All") q = q.eq("role", roleFilter);
    if (countryFilter !== "All") q = q.eq("country", countryFilter);

    const { data } = await q;
    const people = data ?? [];
    setPeople(people);

    // Load connection statuses
    if (people.length > 0) {
      const ids = people.map(p => p.user_id);
      const { data: sent } = await supabase
        .from("connections")
        .select("to_id, status")
        .eq("from_id", profile!.user_id)
        .in("to_id", ids);

      const { data: received } = await supabase
        .from("connections")
        .select("from_id, status")
        .eq("to_id", profile!.user_id)
        .in("from_id", ids);

      const map: Record<string, ConnectionStatus> = {};
      (sent ?? []).forEach((c: { to_id: string; status: string }) => {
        map[c.to_id] = c.status === "accepted" ? "connected" : "pending_sent";
      });
      (received ?? []).forEach((c: { from_id: string; status: string }) => {
        if (!map[c.from_id]) {
          map[c.from_id] = c.status === "accepted" ? "connected" : "pending_received";
        }
      });
      setConns(map);
    }

    setLoading(false);
  }

  async function sendConnectionRequest(toId: string) {
    setAL(toId);
    const { error } = await supabase.from("connections").insert({
      from_id: profile!.user_id,
      to_id: toId,
      status: "pending",
    });
    if (!error) {
      setConns(prev => ({ ...prev, [toId]: "pending_sent" }));
    }
    setAL(null);
  }

  async function acceptRequest(fromId: string) {
    setAL(fromId);
    await supabase.from("connections")
      .update({ status: "accepted", updated_at: new Date().toISOString() })
      .eq("from_id", fromId)
      .eq("to_id", profile!.user_id);
    setConns(prev => ({ ...prev, [fromId]: "connected" }));

    // Start conversation automatically
    const { data: existing } = await supabase.from("conversations")
      .select("id")
      .contains("participant_ids", [profile!.user_id, fromId])
      .single();
    if (!existing) {
      await supabase.from("conversations").insert({
        participant_ids: [profile!.user_id, fromId],
      });
    }
    setAL(null);
  }

  async function startChat(userId: string) {
    const { data: existing } = await supabase.from("conversations")
      .select("id")
      .contains("participant_ids", [profile!.user_id, userId])
      .single();

    if (existing) {
      navigate("/messages", { state: { conversationId: existing.id } });
    } else {
      const { data } = await supabase.from("conversations")
        .insert({ participant_ids: [profile!.user_id, userId] })
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
        {/* Search bar */}
        <div className="flex gap-3">
          <div className="flex-1 flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
            <Search className="size-5 text-muted-foreground flex-shrink-0" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setSearchParams(e.target.value ? { q: e.target.value } : {}); }}
              placeholder="Search by name, username, skills, or bio..."
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            {query && (
              <button onClick={() => { setQuery(""); setSearchParams({}); }} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button variant="outline" onClick={() => setShowF(s => !s)} className="gap-2">
            <Filter className="size-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={load}>
            <RefreshCw className="size-4" />
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-2xl">
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
                className="w-full h-9 rounded-xl border border-border bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {COUNTRIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </motion.div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {loading ? "Searching..." : `${people.length} people found`}
            {(roleFilter !== "All" || countryFilter !== "All" || query) && (
              <button onClick={() => { setRole("All"); setCtry("All"); setQuery(""); }}
                className="ml-2 text-primary hover:underline text-xs">Clear filters</button>
            )}
          </p>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="size-12 rounded-2xl bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-32" />
                    <div className="h-3 bg-muted rounded w-24" />
                    <div className="h-3 bg-muted rounded w-40" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : people.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-display font-bold text-lg mb-1 text-foreground">
              {query ? `No results for "${query}"` : "No people found"}
            </p>
            <p className="text-sm text-muted-foreground">
              {query ? "Try different keywords or clear filters." : "Be the first to explore the network!"}
            </p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {people.map((person, i) => (
              <motion.div key={person.user_id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="p-4 hover:border-primary/20 transition-all">
                  <div className="flex items-start gap-3 mb-3">
                    <button onClick={() => navigate(`/u/${person.username ?? person.user_id}`)}>
                      <Avatar name={`${person.first_name} ${person.last_name}`} src={person.avatar_url ?? undefined} size="lg" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <button
                          onClick={() => navigate(`/u/${person.username ?? person.user_id}`)}
                          className="font-semibold text-sm text-foreground hover:text-primary transition-colors"
                        >
                          {person.first_name} {person.last_name}
                        </button>
                        <RoleBadge role={person.role} />
                        {person.is_verified && <Badge variant="teal">Verified</Badge>}
                      </div>
                      {person.username && (
                        <p className="text-xs text-muted-foreground font-mono">@{person.username}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {person.country}
                        {person.credibility_score > 0 && ` · Score: ${Math.round(person.credibility_score)}`}
                        {person.weekly_hours && ` · ${person.weekly_hours}h/wk`}
                      </p>
                    </div>
                  </div>

                  {person.bio && (
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{person.bio}</p>
                  )}

                  {person.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {person.skills.slice(0, 4).map(s => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/20">{s}</span>
                      ))}
                      {person.skills.length > 4 && (
                        <span className="text-xs text-muted-foreground">+{person.skills.length - 4}</span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <ConnectButton person={person} />
                    {(connections[person.user_id] === "connected" || connections[person.user_id] === "pending_received") && (
                      <Button size="sm" variant="gradient" className="flex-1 gap-1.5" onClick={() => startChat(person.user_id)}>
                        <MessageCircle className="size-4" /> Message
                      </Button>
                    )}
                    {connections[person.user_id] !== "connected" && (
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/u/${person.username ?? person.user_id}`)}>
                        View Profile
                      </Button>
                    )}
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

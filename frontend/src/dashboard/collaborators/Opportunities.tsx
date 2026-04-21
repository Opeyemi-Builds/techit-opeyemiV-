import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Search, Zap, RefreshCw } from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Avatar, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { collabApi, type CollabRequest } from "../../lib/api";
import { useAuth } from "../../contexts/AuthContext";
import { cn, timeAgo } from "../../lib/utils";

type Profile = { first_name: string; last_name: string; role: string; avatar_url?: string; credibility_score?: number; country?: string; skills?: string[] };

export default function Opportunities() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<CollabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [responding, setResponding] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("collab_requests")
      .select("*, from:profiles!from_id(first_name, last_name, role, avatar_url, credibility_score, country, skills), project:projects(title, industry, stage)")
      .eq("to_id", profile!.user_id).order("created_at", { ascending: false });
    setRequests(data ?? []);
    setLoading(false);
  }

  async function respond(id: string, status: "accepted" | "declined") {
    setResponding(id);
    await collabApi.respond(id, status);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setResponding(null);
  }

  const filtered = requests.filter(r => {
    if (typeFilter !== "all" && r.type !== typeFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const sender = r.from as Profile | undefined;
      const name = sender ? `${sender.first_name} ${sender.last_name}` : "";
      if (!name.toLowerCase().includes(search.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <DashboardLayout title="Collaboration Opportunities">
      <div className="max-w-4xl mx-auto space-y-5 page-enter">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2">
            <Search className="size-4 text-muted-foreground flex-shrink-0" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by sender name..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
          </div>
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="h-10 rounded-xl border border-border bg-input px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">All Types</option>
            <option value="paid">Paid</option>
            <option value="free">Free</option>
            <option value="equity">Equity</option>
          </select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="h-10 rounded-xl border border-border bg-input px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
          </select>
          <Button variant="ghost" size="icon-sm" onClick={load}><RefreshCw className="size-4" /></Button>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <Card key={i} className="p-5 animate-pulse h-36" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="size-14 rounded-2xl bg-muted mx-auto flex items-center justify-center mb-4"><Zap className="size-7 text-muted-foreground/40" /></div>
            <p className="font-semibold mb-1">No opportunities yet</p>
            <p className="text-sm text-muted-foreground">Complete your profile to receive collaboration requests from founders</p>
            <Link to="/settings"><Button variant="gradient" size="sm" className="mt-4">Complete Profile</Button></Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {filtered.map((req, i) => {
              const sender = req.from as Profile | undefined;
              const name = sender ? `${sender.first_name} ${sender.last_name}` : "Founder";
              const isPending = req.status === "pending";
              return (
                <motion.div key={req.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
                  <Card className={cn("p-5 transition-all", !isPending && "opacity-60")}>
                    <div className="flex items-start gap-4">
                      <Avatar name={name} src={sender?.avatar_url} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-semibold text-foreground">{name}</span>
                          {sender?.role && <Badge variant="outline">{sender.role}</Badge>}
                          <Badge variant={req.type === "paid" ? "teal" : req.type === "equity" ? "violet" : "cyan"}>{req.type}</Badge>
                          {req.status !== "pending" && <Badge variant={req.status === "accepted" ? "emerald" : "rose"}>{req.status}</Badge>}
                        </div>
                        {sender && <p className="text-xs text-muted-foreground mb-2">{sender.country}{sender.credibility_score != null ? ` · Score: ${Math.round(sender.credibility_score)}` : ""}</p>}
                        {(req as any).project && <p className="text-xs text-muted-foreground mb-2">Project: <span className="text-foreground font-medium">{(req as any).project.title}</span> · {(req as any).project.industry}</p>}
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{req.message}</p>
                        {req.compensation && <p className="text-xs font-mono text-emerald-400 mb-3">Compensation: {req.compensation}</p>}
                        {sender?.skills && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {sender.skills.slice(0,5).map(s => <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-secondary/10 text-secondary border border-secondary/20">{s}</span>)}
                          </div>
                        )}
                        {isPending && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="gradient" onClick={() => respond(req.id, "accepted")} loading={responding === req.id}>Accept</Button>
                            <Button size="sm" variant="outline" onClick={() => respond(req.id, "declined")} loading={responding === req.id}>Decline</Button>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo(req.created_at)}</span>
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

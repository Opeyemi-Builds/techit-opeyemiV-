import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { cn, timeAgo } from "../../lib/utils";

export default function MyWork() {
  const { profile } = useAuth();
  const [collaborations, setCollaborations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");

  useEffect(() => { load(); }, [filter]);

  async function load() {
    setLoading(true);
    let q = supabase.from("collaborations").select("*, project:projects(id, title, pitch, stage, industry, created_at, founder:profiles!founder_id(first_name, last_name))").eq("user_id", profile!.user_id).order("joined_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setCollaborations(data ?? []);
    setLoading(false);
  }

  return (
    <DashboardLayout title="My Work">
      <div className="max-w-4xl mx-auto space-y-5 page-enter">
        <div className="flex gap-2 flex-wrap">
          {["active","completed","paused","all"].map(f => (
            <button key={f} onClick={()=>setFilter(f)} className={cn("px-4 py-1.5 rounded-full text-xs font-medium border transition-all capitalize",filter===f?"bg-primary text-white border-primary":"border-border text-muted-foreground hover:border-primary/40")}>{f}</button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Card key={i} className="p-5 animate-pulse h-24" />)}</div>
        ) : collaborations.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="font-semibold mb-1">No {filter !== "all" ? filter : ""} projects</p>
            <p className="text-sm text-muted-foreground mb-4">Your collaboration history will appear here</p>
            <Link to="/collaborator/opportunities"><Button variant="gradient" size="sm">Browse Opportunities</Button></Link>
          </Card>
        ) : (
          <div className="space-y-4">
            {collaborations.map(c => {
              const founder = c.project?.founder;
              const founderName = founder ? `${founder.first_name} ${founder.last_name}` : "Founder";
              return (
                <Card key={c.id} className="p-5 hover:border-primary/20 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="size-10 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-white font-bold flex-shrink-0">
                      {c.project?.title?.[0]?.toUpperCase() ?? "P"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-foreground">{c.project?.title ?? "Project"}</span>
                        <Badge variant="outline">{c.project?.stage}</Badge>
                        <Badge>{c.project?.industry}</Badge>
                        <Badge variant={c.status === "active" ? "teal" : c.status === "completed" ? "emerald" : "amber"}>{c.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Role: <span className="text-foreground">{c.role}</span> · Founder: {founderName}</p>
                      <p className="text-xs text-muted-foreground">Joined {timeAgo(c.joined_at)}</p>
                    </div>
                    <Link to={`/workspace/${c.project_id}`}><Button variant="gradient" size="sm">Open Workspace</Button></Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react"; 
import { 
  Plus, Search, LayoutGrid, List, MoreVertical, 
  Code2, Users, FolderOpen, Filter, Globe, 
  FilterX, Clock, ChevronRight
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { cn, timeAgo } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import DashboardLayout from "../../components/shared/DashboardLayout";

export default function Workspaces() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadWorkspaces = useCallback(async () => {
    if (!profile?.user_id) return;
    setLoading(true);

    try {
      const { data: collabData } = await supabase
        .from("project_collaborators")
        .select("project_id, last_viewed_at")
        .eq("user_id", profile.user_id);
        
      const collabMap = new Map(collabData?.map(c => [c.project_id, c.last_viewed_at]) || []);
      const collabIds = Array.from(collabMap.keys());

      let query = supabase
        .from("projects")
        .select(`
          id, title, description, industry, stage, updated_at, founder_id, last_viewed_at,
          workspace_files(updated_at)
        `);

      if (collabIds.length > 0) {
        query = query.or(`founder_id.eq.${profile.user_id},id.in.(${collabIds.join(',')})`);
      } else {
        query = query.eq('founder_id', profile.user_id);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });
      if (error) throw error;

      const projectsWithRealData = data.map(proj => {
        const isOwner = proj.founder_id === profile.user_id;
        const lastViewed = isOwner ? proj.last_viewed_at : collabMap.get(proj.id);
        
        const newActivityCount = proj.workspace_files?.filter((f: any) => 
          new Date(f.updated_at) > new Date(lastViewed || 0)
        ).length || 0;

        return { ...proj, unreadCount: newActivityCount };
      });

      setProjects(projectsWithRealData);
    } catch (err: any) {
      console.error("Hub Load Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [profile?.user_id]);

  useEffect(() => {
    if (!authLoading) loadWorkspaces();
  }, [authLoading, loadWorkspaces]);

  const filtered = projects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading) return null;

  return (
    <DashboardLayout title="Workspaces">
      <div className="max-w-[1400px] mx-auto space-y-8 pb-20 px-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight uppercase">Workspaces</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium italic">
              Active projects and technical builds.
            </p>
          </div>
          {/* Added type="button" to prevent form submission refresh */}
          <Button 
            type="button" 
            onClick={() => navigate("/workspaces/new")} 
            variant="gradient" 
            className="font-semibold text-xs h-10 px-5"
          >
            <Plus className="size-4 mr-2" /> New Project
          </Button>
        </div>

        <div className="bg-[#0a0a0a] border border-white/5 rounded-2xl p-3">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <input 
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search projects..." 
              className="w-full bg-black/40 border border-white/5 rounded-xl pl-12 pr-4 py-2 text-sm outline-none focus:border-primary/30 transition-all text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-60 rounded-2xl bg-[#0a0a0a] animate-pulse border border-white/5" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {filtered.map((project) => {
              const isOwner = project.founder_id === profile?.user_id;

              return (
                <motion.div layout key={project.id} className="h-full">
                  <Card className="group relative overflow-hidden transition-all hover:border-primary/40 rounded-3xl bg-[#0a0a0a] border-white/5 p-6 flex flex-col h-full">
                    <div className="flex gap-4 items-start">
                      <div className="size-12 rounded-xl bg-white/[0.03] flex items-center justify-center text-primary border border-white/5 flex-shrink-0">
                        <Code2 className="size-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                            {/* Card grows to fit full title */}
                            <h3 className="font-bold text-lg text-foreground leading-snug break-words pr-2">
                              {project.title}
                            </h3>
                            <div className="flex flex-wrap gap-2 items-center">
                              {isOwner ? (
                                <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-bold uppercase">Owner</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-[10px] font-bold uppercase">Member</span>
                              )}
                              {project.unreadCount > 0 && (
                                <span className="px-2 py-0.5 bg-rose-500 text-white rounded text-[10px] font-bold animate-pulse">
                                  +{project.unreadCount} NEW
                                </span>
                              )}
                            </div>
                          </div>
                          <button type="button" className="text-white/10 hover:text-white transition-colors flex-shrink-0 pt-1"><MoreVertical className="size-4" /></button>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mt-4 leading-relaxed flex-1">
                      {project.description || "No description provided."}
                    </p>
                    
                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                       <div className="text-[11px] font-medium text-muted-foreground/50 flex items-center gap-1.5">
                         <Clock className="size-3" /> {timeAgo(project.updated_at)}
                       </div>
                       <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/60"><Globe className="size-3.5" /> {project.industry}</span>
                    </div>

                    <div className="mt-6">
                      {/* FIX: Using e.preventDefault() and navigate() ensures 
                        the app handles the route change without refreshing. 
                      */}
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/workspace/${project.id}`);
                        }}
                        className="w-full h-10 text-xs font-bold uppercase gap-2 bg-white/[0.02] border-white/5 hover:bg-primary hover:text-black transition-all"
                      >
                        Enter Workspace <ChevronRight className="size-4" />
                      </Button>
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
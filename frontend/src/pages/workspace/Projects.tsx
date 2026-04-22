import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, Code2, Users, Settings, Activity, 
  Rocket, Edit3, X, Save, Loader2, Globe, Clock
} from "lucide-react";

import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { timeAgo, cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Card, Avatar } from "../../components/ui/card";
import DashboardLayout from "../../components/shared/DashboardLayout";

interface ActivityLog { 
  id: string; 
  type: string; 
  text: string; 
  user_name: string; 
  date: string; 
}

export default function ProjectOffice() {
  const { projectId } = useParams<{ projectId: string }>();
  // FIXED: Added 'loading: authLoading' here
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // --- DATA STATE ---
  const [project, setProject] = useState<any>(null);
  const [founderProfile, setFounderProfile] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- SETTINGS STATE ---
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "" });
  const [isUpdating, setIsUpdating] = useState(false);

  const loadProjectData = async () => {
    if (!projectId || !profile?.user_id) return;

    try {
      // 1. Fetch project info
      const { data: proj, error: projErr } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      
      if (projErr || !proj) return navigate("/workspaces");

      setProject(proj);
      setEditForm({ title: proj.title, description: proj.description || "" });

      // 2. Clear notification badges
      if (proj.founder_id === profile.user_id) {
        await supabase.from("projects").update({ last_viewed_at: new Date().toISOString() }).eq("id", projectId);
      }

      // 3. Fetch Founder & Team
      const { data: fp } = await supabase.from("profiles").select("*").eq("user_id", proj.founder_id).single();
      if (fp) setFounderProfile(fp);

      const { data: collabs } = await supabase
        .from("project_collaborators")
        .select("user_id, role, profiles(first_name, last_name, avatar_url)")
        .eq("project_id", projectId);
      
      setTeam(collabs || []);

      // 4. Map names and build the activity feed
      const userMap: Record<string, string> = {};
      if (fp) userMap[proj.founder_id] = `${fp.first_name} ${fp.last_name}`;
      collabs?.forEach(c => {
        const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        if (p) userMap[c.user_id] = `${p.first_name} ${p.last_name}`;
      });

      const { data: files } = await supabase
        .from("workspace_files")
        .select("*")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(10);
      
      const feed: ActivityLog[] = [];
      files?.forEach(f => {
        feed.push({ 
          id: f.id + f.updated_at, 
          type: f.created_at === f.updated_at ? 'create' : 'edit', 
          text: `${f.created_at === f.updated_at ? 'created' : 'updated'} file: ${f.name}`, 
          user_name: userMap[f.last_updated_by] || 'Member', 
          date: f.updated_at 
        });
      });

      setActivityFeed(feed.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (err) {
      console.error("Load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (!authLoading) loadProjectData(); 
  }, [projectId, profile?.user_id, authLoading]);

  const handleUpdateProject = async () => {
    if (!projectId || !editForm.title.trim()) return;
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          updated_at: new Date().toISOString()
        })
        .eq("id", projectId);

      if (error) throw error;
      setProject({ ...project, title: editForm.title, description: editForm.description });
      setIsSettingsOpen(false);
    } catch (err: any) {
      console.error(err.message);
      alert("Save failed. Check permissions.");
    } finally {
      setIsUpdating(false); 
    }
  };

  if (loading || authLoading) return null;
  const isOwner = project?.founder_id === profile?.user_id;

  return (
    <DashboardLayout title={project?.title || "Office"} noPadding>
      <div className="flex flex-col min-h-[calc(100vh-57px)] bg-background relative">
        
        {/* SETTINGS MODAL */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-bold text-white">Project Settings</h2>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-xl"><X className="size-5" /></button>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</label>
                    <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full bg-[#111] border border-white/5 rounded-xl p-4 text-white outline-none focus:border-primary/50" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Description</label>
                    <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={4} className="w-full bg-[#111] border border-white/5 rounded-xl p-4 text-white outline-none focus:border-primary/50 resize-none" />
                  </div>
                  <Button onClick={handleUpdateProject} disabled={isUpdating} variant="gradient" className="w-full h-12 rounded-xl font-bold">
                    {isUpdating ? <Loader2 className="size-5 animate-spin" /> : <><Save className="size-4 mr-2" /> Save Changes</>}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* HEADER */}
        <header className="border-b border-border bg-[#0a0a0a] px-6 py-10">
          <div className="max-w-6xl mx-auto">
            <Link to="/workspaces" className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground mb-8 hover:text-white transition-colors">
              <ArrowLeft className="size-3.5" /> Back
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground tracking-tight break-words pr-4">{project?.title}</h1>
                <p className="text-sm text-muted-foreground mt-4 max-w-2xl italic">{project?.description || "No description provided."}</p>
                <div className="flex items-center gap-4 mt-6">
                   <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/60"><Globe className="size-3.5" /> {project?.industry}</div>
                   <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground/60"><Clock className="size-3.5" /> Updated {timeAgo(project?.updated_at)}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isOwner && (
                  <Button onClick={() => setIsSettingsOpen(true)} variant="outline" className="h-11 px-5 font-bold text-xs border-white/10 bg-white/[0.02]">
                    <Settings className="size-4 mr-2" /> Settings
                  </Button>
                )}
                <Link to={`/workspace/${projectId}/ide`}>
                  <Button variant="gradient" className="h-11 px-8 font-bold text-xs uppercase tracking-widest">
                    <Code2 className="size-4 mr-2" /> Open Lab
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <div className="lg:col-span-2 space-y-6">
              <Card className="p-8 rounded-3xl bg-[#111] border-white/5 shadow-xl min-h-[400px]">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-8 flex items-center gap-3">
                   <Activity className="size-4 text-primary" /> Activity Feed
                </h3>
                
                <div className="space-y-4">
                  {activityFeed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
                      <Rocket className="size-12 mb-4" />
                      <p className="text-sm">No activity yet. Start coding in the Lab.</p>
                    </div>
                  ) : (
                    activityFeed.map((log) => (
                      <div key={log.id} className="flex gap-4 p-5 bg-[#0a0a0a] rounded-2xl border border-white/5">
                        <div className="mt-1 size-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                          {log.type === 'create' ? <Rocket className="size-4" /> : <Edit3 className="size-4" />}
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground"><span className="font-bold text-foreground">{log.user_name}</span> {log.text}</p>
                          <p className="text-[10px] text-muted-foreground/40 mt-1 uppercase font-bold">{timeAgo(log.date)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="p-8 rounded-3xl bg-[#111] border-white/5 shadow-xl">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-8 flex items-center gap-3">
                  <Users className="size-4 text-primary" /> Team
                </h3>
                
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <Avatar name={founderProfile?.first_name || "F"} src={founderProfile?.avatar_url} className="size-10 border border-primary/20" />
                    <div>
                      <p className="text-sm font-bold text-white">{founderProfile ? `${founderProfile.first_name} ${founderProfile.last_name}` : "Founder"}</p>
                      <p className="text-[9px] text-primary font-black uppercase">Lead</p>
                    </div>
                  </div>
                  {team.map(m => {
                    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
                    return (
                      <div key={m.user_id} className="flex items-center gap-4">
                        <Avatar name={p?.first_name} src={p?.avatar_url} className="size-10 border border-white/5" />
                        <div>
                          <p className="text-sm font-bold text-white">{p?.first_name} {p?.last_name}</p>
                          <p className="text-[9px] text-muted-foreground font-black uppercase">{m.role}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
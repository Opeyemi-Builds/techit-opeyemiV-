import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Code2, Rocket, Users, Plus, ChevronRight, 
  Terminal, Search, UserPlus, AlertCircle 
} from "lucide-react";

import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

interface ProjectWorkspace {
  id: string;
  title: string;
  pitch: string;
  stage: string;
  industry: string;
  workspaces: { id: string }[];
  collaborations: { count: number }[];
}

export default function Workspaces() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  
  const [projects, setProjects] = useState<ProjectWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    if (profile?.user_id) loadWorkspaces();
  }, [profile]);

  async function loadWorkspaces() {
    try {
      // Fetch projects, check if they have a workspace attached, and count collaborators
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id, title, pitch, stage, industry,
          workspaces ( id ),
          collaborations ( count )
        `)
        .eq("founder_id", profile!.user_id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data as any);
    } catch (error) {
      console.error("Error loading workspaces:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail || !inviteModalOpen) return;
    
    alert(`Invitation sent to ${inviteEmail} for project ID: ${inviteModalOpen}. They will receive a notification to join the workspace!`);
    
    // Here you will later add the Supabase insert to your collab_requests table
    setInviteEmail("");
    setInviteModalOpen(null);
  }

  return (
    <DashboardLayout title="Development Workspaces">
      <div className="max-w-5xl mx-auto space-y-6 page-enter">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm relative overflow-hidden">
          <div className="orb orb-cyan w-64 h-64 -top-20 -right-20 opacity-20 absolute pointer-events-none" />
          <div className="relative z-10">
            <h1 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
              <Terminal className="size-6 text-primary" /> Project Workspaces
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your code, collaborate in real-time, and invite developers to build your ideas.
            </p>
          </div>
          <Link to="/idea-submit" className="relative z-10">
            <Button variant="gradient" className="gap-2">
              <Plus className="size-4" /> New Project
            </Button>
          </Link>
        </div>

        {/* Workspace Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border rounded-2xl bg-card/50">
            <Code2 className="size-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-bold text-lg mb-1">No Workspaces Found</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              You need to submit an idea and create a project before you can access a development workspace.
            </p>
            <Link to="/idea-submit">
              <Button variant="outline">Submit an Idea</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projects.map((project, i) => {
              const hasWorkspace = project.workspaces && project.workspaces.length > 0;
              // Safely extract count since Supabase returns it in an array
              const teamSize = project.collaborations?.[0]?.count ?? 0;

              return (
                <motion.div 
                  key={project.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="p-5 flex flex-col h-full hover:border-primary/40 transition-colors group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="size-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold text-lg">
                        {project.title.charAt(0).toUpperCase()}
                      </div>
                      <Badge variant={hasWorkspace ? "teal" : "outline"} className="text-[0.65rem]">
                        {hasWorkspace ? "Active Workspace" : "Not Initialized"}
                      </Badge>
                    </div>
                    
                    <h3 className="font-bold text-lg text-foreground mb-1 line-clamp-1">{project.title}</h3>
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2 flex-1">{project.pitch}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-5 border-y border-border py-3">
                      <div className="flex items-center gap-1.5">
                        <Users className="size-3.5" />
                        <span className="font-medium">{teamSize + 1} Member{teamSize !== 0 && "s"}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Rocket className="size-3.5" />
                        <span className="font-medium">{project.stage}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-auto">
                      <Link to={`/workspace/${project.id}`} className="flex-1">
                        <Button variant={hasWorkspace ? "gradient" : "outline"} className="w-full gap-2 shadow-sm">
                          <Code2 className="size-4" /> 
                          {hasWorkspace ? "Open IDE" : "Initialize IDE"}
                        </Button>
                      </Link>
                      
                      <Button 
                        variant="secondary" 
                        title="Invite Collaborators"
                        onClick={() => setInviteModalOpen(project.id)}
                        className="px-3 hover:bg-secondary hover:text-white transition-colors"
                      >
                        <UserPlus className="size-4" />
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Invite Modal Stub */}
        {inviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border border-border shadow-2xl rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                <UserPlus className="size-5 text-primary" /> Invite to Workspace
              </h3>
              <p className="text-sm text-muted-foreground mb-5">
                Send an invitation to a developer or collaborator to join this project's code workspace.
              </p>
              
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5 block">
                    User Email or TechIT ID
                  </label>
                  <input 
                    type="email" 
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="developer@example.com" 
                    className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="ghost" className="flex-1" onClick={() => setInviteModalOpen(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="gradient" className="flex-1">
                    Send Invite
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
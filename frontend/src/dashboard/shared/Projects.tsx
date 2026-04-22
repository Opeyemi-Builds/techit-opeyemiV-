import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  Rocket, Code2, Users, Plus, 
  ExternalLink, Sparkles, FolderKanban
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";

interface Project {
  id: string;
  founder_id: string;
  title: string;
  pitch: string;
  industry: string;
  stage: string;
  ai_score: number | null;
  workspaces?: { id: string }[];
  collaborations?: { count: number }[];
}

export default function Projects() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [foundedProjects, setFoundedProjects] = useState<Project[]>([]);
  const [collabProjects, setCollabProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"founded" | "contributing">("founded");

  useEffect(() => {
    if (profile === undefined) return; // Fix for the infinite loading back-button bug!
    if (profile?.user_id) {
      loadMyProjects();
    } else {
      setLoading(false);
    }
  }, [profile]);

  async function loadMyProjects() {
    setLoading(true);
    try {
      // 1. Fetch projects the user founded
      const { data: founded } = await supabase
        .from("projects")
        .select(`
          id, founder_id, title, pitch, industry, stage, ai_score,
          workspaces ( id ),
          collaborations ( count )
        `)
        .eq("founder_id", profile!.user_id)
        .order("created_at", { ascending: false });

      // 2. Fetch projects the user is collaborating on
      const { data: collabs } = await supabase
        .from("collaborations")
        .select(`
          project_id,
          projects (
            id, founder_id, title, pitch, industry, stage, ai_score,
            workspaces ( id ),
            collaborations ( count )
          )
        `)
        .eq("user_id", profile!.user_id)
        .eq("status", "active");

      setFoundedProjects((founded as any) || []);
      
      // Clean up the nested collab data and ensure we don't duplicate founded projects
      const contributingTo = (collabs || [])
        .map((c: any) => c.projects)
        .filter((p: any) => p && p.founder_id !== profile!.user_id);
        
      setCollabProjects(contributingTo);
      
      // Auto-switch tab if they are only a collaborator
      if (founded?.length === 0 && contributingTo.length > 0) {
        setActiveTab("contributing");
      }

    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoading(false);
    }
  }

  const currentList = activeTab === "founded" ? foundedProjects : collabProjects;

  return (
    <DashboardLayout title="My Projects">
      <div className="max-w-5xl mx-auto space-y-6 page-enter">

        {/* Header Hero */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm relative overflow-hidden">
          <div className="orb orb-violet w-64 h-64 -top-20 -right-20 opacity-20 absolute pointer-events-none" />
          <div className="relative z-10">
            <h1 className="font-display font-bold text-2xl text-foreground flex items-center gap-2">
              <FolderKanban className="size-6 text-primary" /> My Portfolio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your startups, access your development workspaces, and track your collaborations.
            </p>
          </div>
          <Link to="/idea-submit" className="relative z-10">
            <Button variant="gradient" className="gap-2">
              <Plus className="size-4" /> Submit Idea
            </Button>
          </Link>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-muted/50 p-1 rounded-xl w-full sm:w-fit border border-border/50">
          <button
            onClick={() => setActiveTab("founded")}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === "founded" 
                ? "bg-card text-foreground shadow-sm border border-border/50" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Founded by Me <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{foundedProjects.length}</span>
          </button>
          <button
            onClick={() => setActiveTab("contributing")}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === "contributing" 
                ? "bg-card text-foreground shadow-sm border border-border/50" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Contributing To <span className="ml-2 text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">{collabProjects.length}</span>
          </button>
        </div>

        {/* Project Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="p-6 animate-pulse space-y-4">
                <div className="flex gap-4">
                  <div className="size-12 rounded-xl bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-5/6" />
              </Card>
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <Card className="p-12 text-center border-dashed bg-card/50">
            <Rocket className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-display font-bold text-lg mb-2 text-foreground">
              {activeTab === "founded" ? "No Startups Yet" : "Not Contributing Yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {activeTab === "founded" 
                ? "You haven't submitted any project ideas yet. Share your vision with the world to start building your team." 
                : "You aren't collaborating on any external projects right now. Head over to the Incubation Hub to find ideas to build!"}
            </p>
            <Link to={activeTab === "founded" ? "/idea-submit" : "/incubation-hub"}>
              <Button variant="gradient">
                {activeTab === "founded" ? "Submit an Idea" : "Explore Incubation Hub"}
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {currentList.map((project, i) => {
              const hasWorkspace = project.workspaces && project.workspaces.length > 0;
              const teamSize = project.collaborations?.[0]?.count ?? 0;

              return (
                <motion.div 
                  key={project.id} 
                  initial={{ opacity: 0, y: 16 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="p-6 flex flex-col h-full hover:border-primary/30 transition-all group">
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="size-12 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold text-xl border border-primary/10">
                          {project.title.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-display font-bold text-lg text-foreground line-clamp-1">{project.title}</h3>
                          <div className="flex gap-2 mt-1 text-xs">
                            <Badge variant="outline" className="text-muted-foreground">{project.industry}</Badge>
                            <Badge variant="outline" className="text-muted-foreground">{project.stage}</Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-6 line-clamp-3 flex-1">
                      {project.pitch}
                    </p>

                    <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground mb-6 bg-muted/30 p-3 rounded-lg">
                      <div className="flex items-center gap-1.5">
                        <Users className="size-4 text-primary" />
                        <span>{teamSize + 1} Team</span>
                      </div>
                      <div className="w-px h-4 bg-border" />
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="size-4 text-emerald-400" />
                        <span>AI: {project.ai_score ?? "N/A"}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-auto">
                      <Link to={`/workspace/${project.id}`} className="flex-1">
                        <Button 
                          variant={hasWorkspace ? "gradient" : "outline"} 
                          className="w-full gap-2 shadow-sm font-bold"
                        >
                          <Code2 className="size-4" /> 
                          {hasWorkspace ? "Enter IDE" : "Initialize IDE"}
                        </Button>
                      </Link>
                      
                      <Link to={`/projects/${project.id}`}>
                        <Button variant="secondary" title="View Details" className="px-4">
                          <ExternalLink className="size-4" />
                        </Button>
                      </Link>
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
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Rocket, Star, TrendingUp, Users, Lightbulb, 
  ChevronRight, Lock, CheckCircle, Zap, Target, 
  Search, Filter, X, RefreshCw, UserPlus, Check 
} from "lucide-react";

import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, StatCard, Badge, ProgressBar } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Avatar, RoleBadge } from "../../components/ui/card";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useCredits } from "../../contexts/CreditContext";
import { cn } from "../../lib/utils";

// --- CONSTANTS ---
const INCUBATION_STEPS = [
  { id: 1, title: "Idea Validation", desc: "Validate your problem-solution fit with AI analysis and market research.", tasks: ["AI idea evaluation","Problem clarity review","Target market analysis","Competitor landscape mapping"], credits: 75, icon: Lightbulb },
  { id: 2, title: "Team Building", desc: "Find and onboard the right collaborators for your vision.", tasks: ["Workspace setup","AI collaborator matching","Define roles and equity","Team agreements"], credits: 50, icon: Users },
  { id: 3, title: "MVP Planning", desc: "Build your roadmap and define the minimum viable product.", tasks: ["Feature prioritization","Tech stack selection","Sprint planning","Launch timeline"], credits: 0, icon: Target },
  { id: 4, title: "Build and Ship", desc: "Execute your MVP with your team in the collaborative workspace.", tasks: ["Active workspace","Weekly milestones","Beta user testing","Rapid iteration"], credits: 0, icon: Zap },
  { id: 5, title: "Investor Ready", desc: "Prepare your pitch and connect with TechIT Network investors.", tasks: ["Pitch deck creation","Investor introductions","Demo day preparation","Term sheet basics"], credits: 100, icon: Star },
];

const RESOURCES = [
  { title: "AI Idea Evaluator", desc: "Score your startup idea across 5 dimensions using AI", href: "/idea-submit", cost: 75, icon: Lightbulb },
  { title: "Collaborator Matching", desc: "Find your perfect team members with AI-powered matching", href: "/matches", cost: 50, icon: Users },
  { title: "Project Workspace", desc: "Code and collaborate with your team in real-time", href: "/workspaces", cost: 0, icon: Zap },
  { title: "Investor Network", desc: "Connect with investors actively seeking deals on TechIT", href: "/feed", cost: 0, icon: Star },
];

const FILTER_STAGES = ["All", "Idea", "MVP", "Launch", "Growth"];
const FILTER_INDUSTRIES = ["All", "AI/ML", "FinTech", "HealthTech", "E-Commerce", "SaaS", "Edtech", "CleanTech", "Web3", "Other"];

// --- TYPES ---
interface Project {
  id: string;
  founder_id: string;
  title: string;
  pitch: string;
  industry: string;
  stage: string;
  tech_stack?: string[];
  ai_score: number | null;
  status: string;
  created_at: string;
  founder?: {
    user_id: string;
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    credibility_score: number;
    country: string;
  };
}

export default function IncubationHub() {
  const { profile } = useAuth();
  const { balance } = useCredits();
  const navigate = useNavigate();

  // --- TABS STATE ---
  const [activeTab, setActiveTab] = useState<"track" | "explore">("track");

  // --- TRACK STATE (My Incubation) ---
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [selectedMyProject, setSelectedMyProject] = useState<Project | null>(null);
  const [activeStep, setActiveStep] = useState(1);
  const [loadingTrack, setLoadingTrack] = useState(true);

  // --- EXPLORE STATE (Discovery Feed) ---
  const [exploreProjects, setExploreProjects] = useState<Project[]>([]);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  
  // --- JOIN LOGIC STATE ---
  const [joinStatus, setJoinStatus] = useState<Record<string, "none" | "pending" | "accepted" | "member">>({});
  const [joining, setJoining] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState<Project | null>(null);
  const [joinMsg, setJoinMsg] = useState("");

  // ==========================================
  // DATA FETCHING
  // ==========================================

  // Load User's Incubation Track
  useEffect(() => {
    if (profile === undefined) return; 
    if (profile?.user_id) {
      loadMyTrack();
    } else {
      setLoadingTrack(false);
    }
  }, [profile]);

  // Load Explore Feed (with debounced search)
  useEffect(() => {
    if (profile === undefined) return;
    const timer = setTimeout(() => {
      if (profile?.user_id) loadExploreFeed();
    }, 350);
    return () => clearTimeout(timer);
  }, [profile, query, stageFilter, industryFilter]);

  async function loadMyTrack() {
    setLoadingTrack(true);
    try {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("founder_id", profile!.user_id)
        .order("created_at", { ascending: false });
        
      setMyProjects(data ?? []);
      if (data?.length) setSelectedMyProject(data[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTrack(false);
    }
  }

  async function loadExploreFeed() {
    setLoadingExplore(true);
    try {
      let q = supabase
        .from("projects")
        .select("*, founder:profiles!founder_id(user_id, first_name, last_name, avatar_url, credibility_score, country)")
        .eq("status", "active") 
        // ⚠️ TEMPORARILY COMMENTED OUT SO YOU CAN TEST WITH YOUR OWN PROJECTS!
        // .neq("founder_id", profile!.user_id) 
        .order("created_at", { ascending: false })
        .limit(30);

      if (query.trim()) q = q.or(`title.ilike.%${query}%,pitch.ilike.%${query}%,industry.ilike.%${query}%`);
      if (stageFilter !== "All") q = q.eq("stage", stageFilter);
      if (industryFilter !== "All") q = q.eq("industry", industryFilter);

      const { data, error } = await q;
      
      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }

      const projs = data ?? [];
      setExploreProjects(projs);

      // Load join statuses so we know what buttons to show
      if (projs.length > 0) {
        const projIds = projs.map((p: Project) => p.id);

        const [{ data: requests }, { data: collabs }] = await Promise.all([
          supabase.from("project_join_requests").select("project_id, status").eq("user_id", profile!.user_id).in("project_id", projIds),
          supabase.from("collaborations").select("project_id").eq("user_id", profile!.user_id).in("project_id", projIds),
        ]);

        const map: Record<string, "none" | "pending" | "accepted" | "member"> = {};
        (requests ?? []).forEach((r: { project_id: string; status: string }) => {
          map[r.project_id] = r.status as "pending" | "accepted";
        });
        (collabs ?? []).forEach((c: { project_id: string }) => {
          map[c.project_id] = "member";
        });
        setJoinStatus(map);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingExplore(false);
    }
  }

  // ==========================================
  // HELPERS & ACTIONS
  // ==========================================

  function getStepNum(p: Project) {
    const s = p.stage?.toLowerCase();
    if (s === "idea") return 1;
    if (s === "mvp") return 3;
    if (s === "launch") return 4;
    if (s === "growth") return 5;
    return 1;
  }

  async function sendJoinRequest(project: Project) {
    setJoining(project.id);
    const { error } = await supabase.from("project_join_requests").insert({
      project_id: project.id,
      user_id: profile!.user_id,
      message: joinMsg || `I would love to contribute to ${project.title}. My skills align well with this project.`,
      role: "Collaborator",
      status: "pending",
    });
    
    if (!error) {
      setJoinStatus(prev => ({ ...prev, [project.id]: "pending" }));
    } else {
      alert("Failed to send request.");
    }
    
    setShowJoinModal(null);
    setJoinMsg("");
    setJoining(null);
  }

  function JoinButton({ project }: { project: Project }) {
    const status = joinStatus[project.id] ?? "none";
    
    if (status === "member") {
      return (
        <Button size="sm" variant="gradient" onClick={() => navigate(`/workspace/${project.id}`)}>
          Open Workspace
        </Button>
      );
    }
    if (status === "accepted") {
      return (
        <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/30" disabled>
          <Check className="size-4 mr-1" /> Accepted
        </Button>
      );
    }
    if (status === "pending") {
      return (
        <Button size="sm" variant="outline" disabled>
          <UserPlus className="size-4 mr-1" /> Requested
        </Button>
      );
    }
    return (
      <Button size="sm" variant="gradient" loading={joining === project.id} onClick={() => setShowJoinModal(project)}>
        <UserPlus className="size-4 mr-1" /> Request to Join
      </Button>
    );
  }

  const currentStep = selectedMyProject ? getStepNum(selectedMyProject) : 1;
  const progress = Math.round((currentStep / 5) * 100);

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <DashboardLayout title="Incubation Hub">
      <div className="max-w-6xl mx-auto space-y-6 page-enter">
        
        {/* HERO BANNER */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-500/15 via-primary/8 to-transparent border border-primary/20 p-6 relative overflow-hidden">
          <div className="orb orb-violet w-48 h-48 -top-10 -right-10 absolute opacity-30" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-primary uppercase tracking-widest mb-2">TechIT Innovation Ecosystem</div>
              <h1 className="font-display font-bold text-2xl mb-1 text-foreground">The Incubation Hub</h1>
              <p className="text-sm text-muted-foreground">Track your startup's growth or discover innovative projects looking for collaborators.</p>
            </div>
            <Link to="/idea-submit">
              <Button variant="gradient" size="lg"><Lightbulb className="size-4 mr-2" /> Submit an Idea</Button>
            </Link>
          </div>
        </div>

        {/* TAB SWITCHER */}
        <div className="flex bg-muted/50 p-1 rounded-xl w-full sm:w-fit border border-border/50">
          <button
            onClick={() => setActiveTab("track")}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === "track" ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
            )}
          >
            My Incubation Track
          </button>
          <button
            onClick={() => setActiveTab("explore")}
            className={cn(
              "flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab === "explore" ? "bg-card text-foreground shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Explore Startups
          </button>
        </div>

        {/* ==================================================== */}
        {/* TAB 1: MY INCUBATION TRACK */}
        {/* ==================================================== */}
        {activeTab === "track" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {loadingTrack ? (
               <div className="flex justify-center py-10"><RefreshCw className="size-6 animate-spin text-primary" /></div>
            ) : myProjects.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Rocket className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display font-bold text-lg mb-2 text-foreground">Start Your Journey</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                  Submit an idea to unlock the 5-stage incubation tracker and start building your startup.
                </p>
                <Link to="/idea-submit"><Button variant="gradient">Submit First Idea</Button></Link>
              </Card>
            ) : (
              <>
                {/* Project Selector */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-muted-foreground font-medium">Tracking:</span>
                  {myProjects.map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => setSelectedMyProject(p)} 
                      className={cn(
                        "px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                        selectedMyProject?.id === p.id ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {p.title}{p.ai_score != null && <span className="ml-2 font-mono text-xs text-emerald-400">{p.ai_score}</span>}
                    </button>
                  ))}
                </div>

                {/* Progress HUD */}
                {selectedMyProject && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard label="Current Stage" value={`${currentStep}/5`} icon={<Target className="size-5" />} color="violet" helper={INCUBATION_STEPS[currentStep-1]?.title} />
                    <StatCard label="AI Score" value={selectedMyProject.ai_score != null ? String(selectedMyProject.ai_score) : "—"} icon={<Star className="size-5" />} color="teal" helper="market readiness" />
                    <StatCard label="Progress" value={`${progress}%`} icon={<TrendingUp className="size-5" />} color="cyan" helper="program completion" />
                    <StatCard label="Credits" value={balance.toLocaleString()} icon={<Zap className="size-5" />} color="rose" helper="available" />
                  </div>
                )}

                {/* Progress Bar */}
                {selectedMyProject && (
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-display font-bold text-sm text-foreground">{selectedMyProject.title} — Incubation Progress</h3>
                      <span className="font-mono text-sm text-primary font-bold">{progress}%</span>
                    </div>
                    <ProgressBar value={progress} color="from-primary to-secondary" />
                    <div className="flex justify-between mt-3">
                      {INCUBATION_STEPS.map(s => (
                        <div key={s.id} className={cn("flex flex-col items-center gap-1 flex-1", s.id === currentStep ? "opacity-100" : s.id < currentStep ? "opacity-70" : "opacity-30")}>
                          <div className={cn("size-6 rounded-full flex items-center justify-center text-xs border transition-all", s.id < currentStep ? "bg-emerald-500 border-emerald-500 text-white" : s.id === currentStep ? "bg-primary border-primary text-white" : "border-border text-muted-foreground")}>
                            {s.id < currentStep ? "✓" : s.id}
                          </div>
                          <span className="text-[0.6rem] text-muted-foreground hidden sm:block text-center leading-tight">{s.title.split(" ")[0]}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Steps Details UI */}
                <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
                  {/* Left Sidebar Steps */}
                  <div className="space-y-2">
                    {INCUBATION_STEPS.map(step => {
                      const isComplete = selectedMyProject ? step.id < getStepNum(selectedMyProject) : false;
                      const isCurrent = selectedMyProject ? step.id === getStepNum(selectedMyProject) : step.id === 1;
                      const isLocked = selectedMyProject ? step.id > getStepNum(selectedMyProject) + 1 : step.id > 2;
                      
                      return (
                        <button 
                          key={step.id} 
                          onClick={() => setActiveStep(step.id)} 
                          className={cn(
                            "w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all",
                            activeStep === step.id ? "border-primary bg-primary/8" : 
                            isComplete ? "border-emerald-500/30 bg-emerald-500/5" : 
                            isCurrent ? "border-primary/30 bg-primary/5" : 
                            "border-border bg-card hover:border-primary/20"
                          )}
                        >
                          <div className={cn("size-10 rounded-xl flex items-center justify-center flex-shrink-0", isComplete ? "bg-emerald-500/20" : isCurrent ? "bg-primary/20" : "bg-muted")}>
                            {isComplete ? <CheckCircle className="size-5 text-emerald-400" /> : <step.icon className={cn("size-5", isCurrent ? "text-primary" : "text-muted-foreground")} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-foreground">{step.title}</span>
                              {isComplete && <Badge variant="emerald">Complete</Badge>}
                              {isCurrent && <Badge variant="violet">Active</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{step.desc}</p>
                          </div>
                          {isLocked && <Lock className="size-4 text-muted-foreground/40 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Detail Panel */}
                  <Card className="p-6">
                    {(() => {
                      const step = INCUBATION_STEPS.find(s => s.id === activeStep)!;
                      const isComplete = selectedMyProject ? activeStep < getStepNum(selectedMyProject) : false;
                      
                      return (
                        <motion.div key={activeStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                          <div className="flex items-start gap-4">
                            <div className="size-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
                              <step.icon className="size-7 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h2 className="font-display font-bold text-xl text-foreground">Stage {step.id}: {step.title}</h2>
                                {isComplete && <Badge variant="emerald">Complete</Badge>}
                              </div>
                              <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="font-display font-bold text-sm mb-3 text-foreground">Stage Checklist</h3>
                            <div className="space-y-2">
                              {step.tasks.map((task, i) => (
                                <div key={i} className={cn("flex items-center gap-3 p-3 rounded-xl border", isComplete ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-muted/20")}>
                                  <div className={cn("size-5 rounded-full border flex items-center justify-center flex-shrink-0", isComplete ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30")}>
                                    {isComplete && <span className="text-white text-xs font-bold">✓</span>}
                                  </div>
                                  <span className={cn("text-sm", isComplete ? "text-muted-foreground line-through" : "text-foreground")}>{task}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {step.credits > 0 && (
                            <div className="p-4 rounded-xl bg-amber-500/8 border border-amber-500/20">
                              <p className="text-sm text-muted-foreground">
                                <span className="text-amber-400 font-semibold">{step.credits} credits</span> required to unlock AI features for this stage.
                                {balance < step.credits && <> <Link to="/wallet" className="text-primary underline font-medium ml-1">Buy more credits.</Link></>}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex gap-3">
                            {activeStep === 1 && <Link to="/idea-submit" className="flex-1"><Button variant="gradient" className="w-full"><Lightbulb className="size-4 mr-2" /> Evaluate Idea</Button></Link>}
                            {activeStep === 2 && <Link to="/matches" className="flex-1"><Button variant="gradient" className="w-full"><Users className="size-4 mr-2" /> Find Collaborators</Button></Link>}
                            {activeStep >= 3 && selectedMyProject && <Link to={`/workspace/${selectedMyProject.id}`} className="flex-1"><Button variant="gradient" className="w-full"><Rocket className="size-4 mr-2" /> Open Workspace</Button></Link>}
                            {activeStep === 5 && <Link to="/feed" className="flex-1"><Button variant="outline" className="w-full"><Star className="size-4 mr-2" /> Post Your Pitch</Button></Link>}
                          </div>
                        </motion.div>
                      );
                    })()}
                  </Card>
                </div>

                {/* Resources Grid */}
                <div>
                  <h2 className="font-display font-bold text-sm mb-4 text-foreground">Platform Resources</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {RESOURCES.map((res, i) => (
                      <motion.div key={res.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                        <Link to={res.href}>
                          <Card className="p-4 hover:border-primary/30 transition-all group cursor-pointer h-full">
                            <div className="flex items-start gap-3">
                              <div className="size-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/15 transition-colors">
                                <res.icon className="size-4 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{res.title}</p>
                                  {res.cost > 0 ? <span className="text-xs font-mono text-amber-400">{res.cost}cr</span> : <Badge variant="emerald">Free</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{res.desc}</p>
                              </div>
                            </div>
                          </Card>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* TAB 2: EXPLORE STARTUPS (Discovery Feed) */}
        {/* ==================================================== */}
        {activeTab === "explore" && (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Search & Filters Bar */}
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-3 bg-card border border-border rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                <Search className="size-5 text-muted-foreground flex-shrink-0" />
                <input 
                  value={query} 
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search public projects by name, pitch, or industry..."
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" 
                />
                {query && <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>}
              </div>
              <Button variant="outline" onClick={() => setShowFilters(s => !s)} className="gap-2">
                <Filter className="size-4" /><span className="hidden sm:inline">Filters</span>
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={loadExploreFeed}><RefreshCw className="size-4" /></Button>
            </div>

            {/* Filter Dropdowns */}
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row gap-4 p-4 bg-card border border-border rounded-2xl mb-2">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stage</label>
                      <div className="flex flex-wrap gap-2">
                        {FILTER_STAGES.map(s => (
                          <button key={s} onClick={() => setStageFilter(s)}
                            className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                              stageFilter === s ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Industry</label>
                      <div className="flex flex-wrap gap-2">
                        {FILTER_INDUSTRIES.map(ind => (
                          <button key={ind} onClick={() => setIndustryFilter(ind)}
                            className={cn("px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                              industryFilter === ind ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                            {ind}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-sm text-muted-foreground px-1">{loadingExplore ? "Loading feed..." : `${exploreProjects.length} open projects found`}</p>

            {/* Results Grid */}
            {loadingExplore ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <Card key={i} className="p-5 animate-pulse space-y-3">
                    <div className="flex gap-3"><div className="size-10 rounded-xl bg-muted" /><div className="flex-1 space-y-2"><div className="h-4 bg-muted rounded w-48" /><div className="h-3 bg-muted rounded w-32" /></div></div>
                    <div className="h-3 bg-muted rounded" /><div className="h-3 bg-muted rounded w-3/4" />
                  </Card>
                ))}
              </div>
            ) : exploreProjects.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Rocket className="size-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="font-display font-bold text-lg mb-1 text-foreground">No open projects found</p>
                <p className="text-sm text-muted-foreground mb-4">Try adjusting your filters or search keywords.</p>
                <Button variant="outline" onClick={() => { setQuery(""); setStageFilter("All"); setIndustryFilter("All"); }}>Clear Filters</Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {exploreProjects.map((project, i) => {
                  const founder = project.founder;
                  const founderName = founder ? `${founder.first_name} ${founder.last_name}` : "Founder";
                  
                  return (
                    <motion.div key={project.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="p-5 hover:border-primary/20 transition-all shadow-sm">
                        <div className="flex flex-col sm:flex-row gap-4">
                          
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="size-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                              {project.title.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="font-display font-bold text-foreground">{project.title}</h3>
                                <Badge variant="outline">{project.stage}</Badge>
                                <Badge>{project.industry}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed mb-3 line-clamp-2">{project.pitch}</p>

                              {/* Founder Info */}
                              {founder && (
                                <button
                                  onClick={() => navigate(`/u/${founder.user_id}`)}
                                  className="flex items-center gap-2 hover:opacity-80 transition-opacity bg-muted/30 px-2 py-1.5 rounded-lg border border-border/50 inline-flex"
                                >
                                  <Avatar name={founderName} src={founder.avatar_url ?? undefined} size="xs" />
                                  <span className="text-xs text-muted-foreground font-medium">
                                    Led by {founderName}
                                  </span>
                                </button>
                              )}

                              {/* Tech Stack */}
                              {project.tech_stack && project.tech_stack.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                  {project.tech_stack.slice(0, 5).map(t => (
                                    <span key={t} className="text-[0.65rem] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end gap-3 flex-shrink-0">
                            {project.ai_score != null && (
                              <div className="text-center hidden sm:block bg-muted/20 p-2 rounded-xl border border-border/50">
                                <div className={cn("font-display font-extrabold text-2xl",
                                  project.ai_score >= 80 ? "text-emerald-400" :
                                  project.ai_score >= 60 ? "text-amber-400" : "text-rose-400"
                                )}>{project.ai_score}</div>
                                <div className="text-[0.65rem] text-muted-foreground uppercase tracking-wider font-semibold">AI Score</div>
                              </div>
                            )}
                            <JoinButton project={project} />
                          </div>

                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* JOIN REQUEST MODAL */}
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="font-display font-bold text-lg mb-2 text-foreground flex items-center gap-2">
                <UserPlus className="size-5 text-primary" /> Request to Join
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Send a message to the founder of <span className="font-semibold text-foreground">{showJoinModal.title}</span> explaining why you want to join.
              </p>
              <textarea
                value={joinMsg}
                onChange={e => setJoinMsg(e.target.value)}
                placeholder="Explain your relevant skills and how you can contribute to this project..."
                rows={4}
                className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary resize-none mb-4"
              />
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => { setShowJoinModal(null); setJoinMsg(""); }}>
                  Cancel
                </Button>
                <Button variant="gradient" className="flex-1" loading={joining === showJoinModal.id} onClick={() => sendJoinRequest(showJoinModal)}>
                  Send Request
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
}
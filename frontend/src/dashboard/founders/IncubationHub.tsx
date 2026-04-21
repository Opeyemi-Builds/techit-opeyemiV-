import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Rocket, Star, TrendingUp, Users, Lightbulb, ChevronRight, Lock, CheckCircle, Zap, Target, ArrowRight } from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, StatCard, Badge, ProgressBar } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useCredits, CREDIT_COSTS } from "../../contexts/CreditContext";
import { cn } from "../../lib/utils";
import type { Project } from "../../lib/api";

const STAGES = [
  { id: 1, title: "Idea Validation", desc: "Validate your problem-solution fit with AI analysis and market research.", tasks: ["AI idea evaluation","Problem clarity review","Target market analysis","Competitor landscape mapping"], credits: 75, icon: Lightbulb },
  { id: 2, title: "Team Building", desc: "Find and onboard the right collaborators for your vision.", tasks: ["Workspace setup","AI collaborator matching","Define roles and equity","Team agreements"], credits: 50, icon: Users },
  { id: 3, title: "MVP Planning", desc: "Build your roadmap and define the minimum viable product.", tasks: ["Feature prioritization","Tech stack selection","Sprint planning","Launch timeline"], credits: 0, icon: Target },
  { id: 4, title: "Build and Ship", desc: "Execute your MVP with your team in the collaborative workspace.", tasks: ["Active workspace","Weekly milestones","Beta user testing","Rapid iteration"], credits: 0, icon: Zap },
  { id: 5, title: "Investor Ready", desc: "Prepare your pitch and connect with TechIT Network investors.", tasks: ["Pitch deck creation","Investor introductions","Demo day preparation","Term sheet basics"], credits: 100, icon: Star },
];

const RESOURCES = [
  { title: "AI Idea Evaluator", desc: "Score your startup idea across 5 dimensions using Claude AI", href: "/idea-submit", cost: 75, icon: Lightbulb },
  { title: "Collaborator Matching", desc: "Find your perfect team members with AI-powered matching", href: "/matches", cost: 50, icon: Users },
  { title: "Project Workspace", desc: "Code and collaborate with your team in real-time", href: "/dashboard", cost: 0, icon: Zap },
  { title: "Investor Network", desc: "Connect with investors actively seeking deals on TechIT", href: "/feed", cost: 0, icon: Star },
  { title: "Social Feed", desc: "Build in public, get feedback, and attract collaborators", href: "/feed", cost: 0, icon: TrendingUp },
  { title: "Wallet and Credits", desc: "Manage credits to unlock premium AI-powered features", href: "/wallet", cost: 0, icon: Target },
];

export default function IncubationHub() {
  const { profile } = useAuth();
  const { balance } = useCredits();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selected, setSelected] = useState<Project | null>(null);
  const [activeStage, setActiveStage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety check added to prevent null profile crash
    if (profile?.user_id) {
      supabase.from("projects")
        .select("*")
        .eq("founder_id", profile.user_id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setProjects(data ?? []);
          if (data?.length) setSelected(data[0]);
          setLoading(false);
        });
    }
  }, [profile?.user_id]);

  function getStageNum(p: Project) {
    const s = p.stage?.toLowerCase();
    if (s === "idea") return 1;
    if (s === "mvp") return 3;
    if (s === "launch") return 4;
    if (s === "growth") return 5;
    return 1;
  }

  const currentStage = selected ? getStageNum(selected) : 1;
  const progress = Math.round((currentStage / 5) * 100);

  return (
    <DashboardLayout title="Incubation Hub">
      <div className="max-w-6xl mx-auto space-y-6 page-enter">
        <div className="rounded-2xl bg-gradient-to-br from-violet-500/15 via-primary/8 to-transparent border border-primary/20 p-6 relative overflow-hidden">
          <div className="orb orb-violet w-48 h-48 -top-10 -right-10 absolute opacity-30" />
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="font-mono text-xs text-primary uppercase tracking-widest mb-2">TechIT Incubation Program</div>
              <h1 className="font-display font-bold text-2xl mb-1 text-foreground">Turn Your Idea Into a Funded Startup</h1>
              <p className="text-sm text-muted-foreground">A 5-stage structured program with AI tools, team matching, and direct investor access.</p>
            </div>
            {!loading && projects.length === 0 && <Link to="/idea-submit"><Button variant="gradient" size="lg"><Lightbulb className="size-4 mr-2" /> Submit First Idea</Button></Link>}
          </div>
        </div>

        {projects.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground font-medium">Tracking:</span>
            {projects.map(p => (
              <button 
                key={p.id} 
                onClick={() => setSelected(p)} 
                className={cn(
                  "px-4 py-2 rounded-xl border text-sm font-medium transition-all",
                  selected?.id === p.id ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-primary/30"
                )}
              >
                {p.title}{p.ai_score != null && <span className="ml-2 font-mono text-xs text-emerald-400">{p.ai_score}</span>}
              </button>
            ))}
            <Link to="/idea-submit"><Button variant="outline" size="sm"><Lightbulb className="size-4 mr-2" /> New Idea</Button></Link>
          </div>
        )}

        {selected && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Current Stage" value={`${currentStage}/5`} icon={<Target className="size-5" />} color="violet" helper={STAGES[currentStage-1]?.title} />
            <StatCard label="AI Score" value={selected.ai_score != null ? String(selected.ai_score) : "—"} icon={<Star className="size-5" />} color="teal" helper="market readiness" />
            <StatCard label="Progress" value={`${progress}%`} icon={<TrendingUp className="size-5" />} color="cyan" helper="program completion" />
            <StatCard label="Credits" value={balance.toLocaleString()} icon={<Zap className="size-5" />} color="rose" helper="available" />
          </div>
        )}

        {selected && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-sm text-foreground">{selected.title} — Incubation Progress</h3>
              <span className="font-mono text-sm text-primary font-bold">{progress}%</span>
            </div>
            <ProgressBar value={progress} color="from-primary to-secondary" />
            <div className="flex justify-between mt-3">
              {STAGES.map(s => (
                <div key={s.id} className={cn("flex flex-col items-center gap-1 flex-1", s.id === currentStage ? "opacity-100" : s.id < currentStage ? "opacity-70" : "opacity-30")}>
                  <div className={cn("size-6 rounded-full flex items-center justify-center text-xs border transition-all", s.id < currentStage ? "bg-emerald-500 border-emerald-500 text-white" : s.id === currentStage ? "bg-primary border-primary text-white" : "border-border text-muted-foreground")}>
                    {s.id < currentStage ? "✓" : s.id}
                  </div>
                  <span className="text-[0.6rem] text-muted-foreground hidden sm:block text-center leading-tight">{s.title.split(" ")[0]}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <div className="space-y-2">
            {STAGES.map(stage => {
              const isComplete = selected ? stage.id < getStageNum(selected) : false;
              const isCurrent = selected ? stage.id === getStageNum(selected) : stage.id === 1;
              const isLocked = selected ? stage.id > getStageNum(selected) + 1 : stage.id > 2;
              
              return (
                <button 
                  key={stage.id} 
                  onClick={() => setActiveStage(stage.id)} 
                  // FIXED: The ternary operators here were previously broken by a string literal
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all",
                    activeStage === stage.id ? "border-primary bg-primary/8" : 
                    isComplete ? "border-emerald-500/30 bg-emerald-500/5" : 
                    isCurrent ? "border-primary/30 bg-primary/5" : 
                    "border-border bg-card hover:border-primary/20"
                  )}
                >
                  <div className={cn("size-10 rounded-xl flex items-center justify-center flex-shrink-0", isComplete ? "bg-emerald-500/20" : isCurrent ? "bg-primary/20" : "bg-muted")}>
                    {isComplete ? <CheckCircle className="size-5 text-emerald-400" /> : <stage.icon className={cn("size-5", isCurrent ? "text-primary" : "text-muted-foreground")} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{stage.title}</span>
                      {isComplete && <Badge variant="emerald">Complete</Badge>}
                      {isCurrent && <Badge variant="violet">Active</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{stage.desc}</p>
                  </div>
                  {isLocked && <Lock className="size-4 text-muted-foreground/40 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          <Card className="p-6">
            {(() => {
              const stage = STAGES.find(s => s.id === activeStage)!;
              const isComplete = selected ? activeStage < getStageNum(selected) : false;
              
              return (
                <motion.div key={activeStage} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="size-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/20 flex items-center justify-center flex-shrink-0">
                      <stage.icon className="size-7 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="font-display font-bold text-xl text-foreground">Stage {stage.id}: {stage.title}</h2>
                        {isComplete && <Badge variant="emerald">Complete</Badge>}
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed">{stage.desc}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm mb-3 text-foreground">Stage Checklist</h3>
                    <div className="space-y-2">
                      {stage.tasks.map((task, i) => (
                        <div key={i} className={cn("flex items-center gap-3 p-3 rounded-xl border", isComplete ? "border-emerald-500/20 bg-emerald-500/5" : "border-border bg-muted/20")}>
                          <div className={cn("size-5 rounded-full border flex items-center justify-center flex-shrink-0", isComplete ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/30")}>
                            {isComplete && <span className="text-white text-xs font-bold">✓</span>}
                          </div>
                          <span className={cn("text-sm", isComplete ? "text-muted-foreground line-through" : "text-foreground")}>{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {stage.credits > 0 && (
                    <div className="p-4 rounded-xl bg-amber-500/8 border border-amber-500/20">
                      <p className="text-sm text-muted-foreground">
                        <span className="text-amber-400 font-semibold">{stage.credits} credits</span> required to unlock AI features for this stage.
                        {balance < stage.credits && <> <Link to="/wallet" className="text-primary underline font-medium ml-1">Buy more credits.</Link></>}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-3">
                    {activeStage === 1 && <Link to="/idea-submit" className="flex-1"><Button variant="gradient" className="w-full"><Lightbulb className="size-4 mr-2" /> Evaluate Idea</Button></Link>}
                    {activeStage === 2 && <Link to="/matches" className="flex-1"><Button variant="gradient" className="w-full"><Users className="size-4 mr-2" /> Find Collaborators</Button></Link>}
                    {activeStage >= 3 && selected && <Link to={`/workspace/${selected.id}`} className="flex-1"><Button variant="gradient" className="w-full"><Rocket className="size-4 mr-2" /> Open Workspace</Button></Link>}
                    {activeStage === 5 && <Link to="/feed" className="flex-1"><Button variant="outline" className="w-full"><Star className="size-4 mr-2" /> Post Your Pitch</Button></Link>}
                  </div>
                </motion.div>
              );
            })()}
          </Card>
        </div>

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
                      <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                    </div>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
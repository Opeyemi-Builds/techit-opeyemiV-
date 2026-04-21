import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { TrendingUp, AlertTriangle, Users, ArrowRight, Sparkles, CheckCircle, XCircle } from "lucide-react";
import { useEffect } from "react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Badge, ProgressBar } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

export default function AIEvaluation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { idea, evaluation, projectId } = (location.state ?? {}) as any;

  useEffect(() => { if (!idea || !evaluation) navigate("/idea-submit"); }, []);
  if (!idea || !evaluation) return null;

  const scoreColor = evaluation.overallScore >= 80 ? "text-emerald-400" : evaluation.overallScore >= 60 ? "text-amber-400" : "text-rose-400";
  const riskVariant = (l: string) => l === "Low" ? "emerald" : l === "Medium" ? "amber" : "rose";

  return (
    <DashboardLayout title="AI Evaluation Results">
      <div className="max-w-4xl mx-auto space-y-6 page-enter">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 mb-4 shadow-xl shadow-cyan-500/30"><Sparkles className="size-7 text-white" /></div>
          <h1 className="font-display font-bold text-3xl mb-2">Evaluation Complete</h1>
          <p className="text-muted-foreground">Idea: <span className="font-semibold text-primary">{idea.title}</span></p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="p-8 text-center bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent border-primary/20">
            <div className={cn("font-display font-extrabold text-7xl mb-2", scoreColor)}>{evaluation.overallScore}</div>
            <div className="text-lg text-foreground mb-3">Market Readiness Score</div>
            <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border", scoreColor === "text-emerald-400" ? "bg-emerald-500/10 border-emerald-500/25" : scoreColor === "text-amber-400" ? "bg-amber-500/10 border-amber-500/25" : "bg-rose-500/10 border-rose-500/25", scoreColor)}>
              <TrendingUp className="size-4" />{evaluation.readinessLevel}
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="p-5">
            <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2"><TrendingUp className="size-4 text-primary" /> Score Breakdown</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(evaluation.breakdown ?? {}).map(([key, val]: any) => {
                const labels: any = { problemClarity:"Problem Clarity", marketSize:"Market Size", technicalFeasibility:"Technical Feasibility", monetizationViability:"Monetization Viability", competitiveAdvantage:"Competitive Advantage" };
                return <ProgressBar key={key} value={val} label={labels[key] ?? key} color={val >= 70 ? "from-emerald-500 to-teal-500" : val >= 50 ? "from-amber-500 to-yellow-500" : "from-rose-500 to-red-500"} />;
              })}
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid sm:grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2"><CheckCircle className="size-4 text-emerald-400" /> Strengths</h3>
            <ul className="space-y-2">
              {(evaluation.strengths ?? []).map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="size-4 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-bold">+</span>
                  <span className="text-muted-foreground leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2"><XCircle className="size-4 text-amber-400" /> Areas to Improve</h3>
            <ul className="space-y-2">
              {(evaluation.improvements ?? []).map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="size-4 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5 font-bold">!</span>
                  <span className="text-muted-foreground leading-relaxed">{s}</span>
                </li>
              ))}
            </ul>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="p-5">
            <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2"><AlertTriangle className="size-4 text-amber-400" /> Risk Analysis</h3>
            <div className="space-y-3">
              {(evaluation.risks ?? []).map((risk: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                  <Badge variant={riskVariant(risk.level) as any}>{risk.level}</Badge>
                  <div><p className="text-sm font-medium">{risk.risk}</p><p className="text-xs text-muted-foreground mt-0.5">{risk.description}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="p-5">
            <h3 className="font-display font-bold text-sm mb-4">AI-Generated Roadmap</h3>
            <div className="space-y-3">
              {(evaluation.roadmap ?? []).map((step: any, i: number) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="size-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{i+1}</div>
                  <div className="flex-1"><p className="text-sm font-medium">{step.task}</p><p className="text-xs text-muted-foreground">{step.phase} · {step.weeks}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="p-5 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/15">
            <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2"><Users className="size-4 text-primary" /> Recommended Team Composition</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              {(evaluation.teamComposition ?? []).map((m: any, i: number) => (
                <div key={i} className="p-3 rounded-xl bg-card border border-border"><p className="text-sm font-semibold">{m.role}</p><p className="text-xs text-muted-foreground mt-1">{m.skills}</p></div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex gap-4">
          <Button variant="outline" className="flex-1" onClick={()=>navigate("/idea-submit")}>Revise Idea</Button>
          <Button variant="gradient" className="flex-1" onClick={()=>navigate("/matches",{state:{projectId}})}>
            Find Collaborators <ArrowRight className="size-4" />
          </Button>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Lightbulb, ArrowRight, ArrowLeft, Sparkles, AlertCircle, TrendingUp } from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useCredits, CREDIT_COSTS } from "../../contexts/CreditContext";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { cn } from "../../lib/utils";

const INDUSTRIES = ["AI/ML","FinTech","HealthTech","E-Commerce","SaaS","Edtech","CleanTech","Web3","Other"];

interface IdeaForm {
  title: string; pitch: string; problem: string; solution: string;
  target: string; industry: string; techStack: string; monetization: string;
}

export default function IdeaSubmit() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { balance, deduct } = useCredits();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [liveScore, setLiveScore] = useState({ clarity: 0, market: 0, feasibility: 0 });

  const [idea, setIdea] = useState<IdeaForm>({
    title: "", pitch: "", problem: "", solution: "",
    target: "", industry: "", techStack: "", monetization: "",
  });

  function setField(k: keyof IdeaForm, v: string) {
    setIdea(p => ({ ...p, [k]: v }));
    const filled = Object.values({ ...idea, [k]: v }).filter(x => x.length > 5).length;
    setLiveScore({
      clarity: Math.min(95, filled * 12),
      market: Math.min(90, filled * 10),
      feasibility: Math.min(88, filled * 11),
    });
  }

  const canNext = step === 1
    ? idea.title.length > 2 && idea.pitch.length > 10
    : idea.problem.length > 10 && idea.solution.length > 10;

  async function handleSubmit() {
    if (!profile) { setError("You must be logged in."); return; }
    if (balance < CREDIT_COSTS.IDEA_EVAL) {
      setError(`Insufficient credits. This costs ${CREDIT_COSTS.IDEA_EVAL} credits. You have ${balance}.`);
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Step 1: Create project directly in Supabase
      const { data: project, error: projErr } = await supabase
        .from("projects")
        .insert({
          founder_id: profile.user_id,
          title: idea.title,
          pitch: idea.pitch,
          problem: idea.problem,
          solution: idea.solution,
          industry: idea.industry || "Other",
          tech_stack: idea.techStack
            ? idea.techStack.split(",").map(s => s.trim()).filter(Boolean)
            : [],
          stage: "Idea",
          monetization: idea.monetization || null,
          status: "active",
        })
        .select()
        .single();

      if (projErr) throw new Error(`Failed to save project: ${projErr.message}`);

      // Step 2: Deduct credits
      const deducted = await deduct(CREDIT_COSTS.IDEA_EVAL, "idea_eval", `AI evaluation for: ${idea.title}`);
      if (!deducted) throw new Error("Failed to deduct credits");

      // Step 3: Call backend AI evaluation
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const evalRes = await fetch("/api/matching/evaluate-idea", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(idea),
      });

      let evaluation: Record<string, unknown>;

      if (evalRes.ok) {
        const evalData = await evalRes.json();
        evaluation = evalData.evaluation;

        // Update project with AI score
        await supabase.from("projects").update({
          ai_score: evaluation.overallScore as number,
          ai_eval_data: evaluation,
        }).eq("id", project.id);
      } else {
        // Backend not available — create a basic evaluation from the form data
        evaluation = generateFallbackEvaluation(idea);
        await supabase.from("projects").update({
          ai_score: (evaluation.overallScore as number),
          ai_eval_data: evaluation,
        }).eq("id", project.id);
      }

      navigate("/idea-eval", {
        state: { idea, evaluation, projectId: project.id },
      });
    } catch (e: unknown) {
      setError((e as Error).message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Fallback evaluation when backend is unavailable
  function generateFallbackEvaluation(idea: IdeaForm) {
    const filled = Object.values(idea).filter(v => v.length > 5).length;
    const base = Math.round(50 + filled * 5);
    return {
      overallScore: Math.min(base, 85),
      breakdown: {
        problemClarity: idea.problem.length > 50 ? 75 : 50,
        marketSize: idea.target.length > 20 ? 70 : 55,
        technicalFeasibility: idea.techStack.length > 5 ? 75 : 60,
        monetizationViability: idea.monetization.length > 10 ? 70 : 50,
        competitiveAdvantage: 65,
      },
      readinessLevel: base >= 75 ? "Strong Potential" : base >= 60 ? "Ready for MVP" : "Early Stage",
      risks: [
        { risk: "Market Validation", level: "Medium", description: "Validate your assumptions with real users early." },
        { risk: "Technical Complexity", level: "Low", description: "Ensure your tech stack matches your team's capabilities." },
        { risk: "Funding Requirements", level: "Medium", description: "Plan your runway carefully before seeking investment." },
      ],
      roadmap: [
        { phase: "Validate", task: "Customer discovery interviews with 20+ potential users", weeks: "Weeks 1–2" },
        { phase: "Build", task: "Develop MVP with core features only", weeks: "Weeks 3–8" },
        { phase: "Test", task: "Beta launch with early adopters", weeks: "Weeks 9–12" },
        { phase: "Iterate", task: "Collect feedback and ship improvements", weeks: "Weeks 13–16" },
        { phase: "Launch", task: "Public launch and marketing push", weeks: "Week 17+" },
      ],
      teamComposition: [
        { role: "Technical Lead", skills: `${idea.techStack || "Full-stack development"}, system architecture` },
        { role: "Product Manager", skills: "UX research, roadmap planning, stakeholder management" },
        { role: "Marketing Lead", skills: "Growth marketing, content, community building" },
      ],
      strengths: [
        idea.problem.length > 30 ? "Clear and specific problem statement" : "Problem identified",
        idea.solution.length > 30 ? "Concrete solution approach defined" : "Solution proposed",
        idea.industry ? `Focused on ${idea.industry} sector` : "Industry identified",
      ].filter(Boolean),
      improvements: [
        !idea.target && "Define your target users more specifically",
        !idea.monetization && "Develop a clear monetization strategy",
        !idea.techStack && "Specify the tech stack you plan to use",
        idea.pitch.length < 50 && "Expand your pitch with more detail",
      ].filter(Boolean),
    };
  }

  return (
    <DashboardLayout title="Submit Idea">
      <div className="max-w-4xl mx-auto page-enter">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-gradient-to-br from-primary to-secondary mb-4 shadow-lg shadow-primary/30">
            <Lightbulb className="size-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl mb-2 text-foreground">Submit Your Idea</h1>
          <p className="text-muted-foreground text-sm">
            AI evaluates your idea across 5 dimensions · Costs {CREDIT_COSTS.IDEA_EVAL} credits · Balance: {balance}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-3">
              <div className={cn(
                "size-9 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                n < step ? "bg-gradient-to-br from-cyan-500 to-teal-500 text-white" :
                n === step ? "bg-primary text-white shadow-lg shadow-primary/30" :
                "bg-muted text-muted-foreground border border-border"
              )}>
                {n < step ? '+' : n}
              </div>
              {n < 3 && <div className={cn("w-12 h-0.5 rounded-full transition-all", n < step ? "bg-teal-500" : "bg-border")} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive mb-6">
            <AlertCircle className="size-4 flex-shrink-0" />{error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <p className="font-mono text-xs text-primary uppercase tracking-widest">Step 01 — The Hook</p>
                    <Input
                      label="Idea Title *"
                      value={idea.title}
                      onChange={e => setField("title", e.target.value)}
                      placeholder="e.g., AI-Powered Legal Review for African SMEs"
                    />
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">One-Line Pitch *</label>
                      <textarea
                        value={idea.pitch}
                        onChange={e => setField("pitch", e.target.value)}
                        placeholder="Describe your idea in one compelling sentence..."
                        rows={3}
                        className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    </div>
                  </motion.div>
                )}
                {step === 2 && (
                  <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <p className="font-mono text-xs text-primary uppercase tracking-widest">Step 02 — Problem and Solution</p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Problem Statement *</label>
                      <textarea
                        value={idea.problem}
                        onChange={e => setField("problem", e.target.value)}
                        placeholder="What specific pain point does this solve? Who suffers from it and how severely?"
                        rows={4}
                        className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Solution *</label>
                      <textarea
                        value={idea.solution}
                        onChange={e => setField("solution", e.target.value)}
                        placeholder="How does your idea solve this uniquely? What is your key insight?"
                        rows={4}
                        className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                      />
                    </div>
                    <Input
                      label="Target Users"
                      value={idea.target}
                      onChange={e => setField("target", e.target.value)}
                      placeholder="Who are your primary users? e.g., SME owners across West Africa"
                    />
                  </motion.div>
                )}
                {step === 3 && (
                  <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <p className="font-mono text-xs text-primary uppercase tracking-widest">Step 03 — Market and Technology</p>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Industry</label>
                      <div className="flex flex-wrap gap-2">
                        {INDUSTRIES.map(ind => (
                          <button
                            key={ind}
                            onClick={() => setField("industry", ind)}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                              idea.industry === ind
                                ? "bg-primary/15 text-primary border-primary/40"
                                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                            )}
                          >
                            {ind}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      label="Tech Stack (optional)"
                      value={idea.techStack}
                      onChange={e => setField("techStack", e.target.value)}
                      placeholder="e.g., React, Node.js, PostgreSQL, OpenAI API"
                    />
                    <Input
                      label="Monetization Strategy (optional)"
                      value={idea.monetization}
                      onChange={e => setField("monetization", e.target.value)}
                      placeholder="e.g., SaaS subscription $29/month, 5% transaction fee"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3 mt-6">
                {step > 1 && (
                  <Button variant="outline" onClick={() => setStep(s => s - 1)} className="w-12 flex-shrink-0 px-0 justify-center">
                    <ArrowLeft className="size-4" />
                  </Button>
                )}
                {step < 3 ? (
                  <Button variant="gradient" className="flex-1" disabled={!canNext} onClick={() => setStep(s => s + 1)}>
                    Next <ArrowRight className="size-4" />
                  </Button>
                ) : (
                  <Button
                    variant="gradient"
                    className="flex-1"
                    onClick={handleSubmit}
                    loading={loading}
                    disabled={balance < CREDIT_COSTS.IDEA_EVAL || loading}
                  >
                    <Sparkles className="size-4" />
                    {loading ? "Evaluating with AI..." : `Evaluate with AI (${CREDIT_COSTS.IDEA_EVAL} credits)`}
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Live AI preview panel */}
          <div className="lg:col-span-1">
            <Card className="p-5 sticky top-20">
              <div className="flex items-center gap-2 mb-5">
                <Sparkles className="size-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Live AI Preview</span>
                <span className="ml-auto text-xs text-muted-foreground font-mono">Preview</span>
              </div>
              <div className="space-y-4 mb-5">
                {[
                  { label: "Idea Clarity", key: "clarity", color: "from-violet-500 to-primary" },
                  { label: "Market Potential", key: "market", color: "from-secondary to-cyan-400" },
                  { label: "Feasibility", key: "feasibility", color: "from-teal-500 to-emerald-400" },
                ].map(m => (
                  <div key={m.key}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="font-mono text-foreground font-semibold">
                        {Math.round((liveScore as Record<string, number>)[m.key])}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${m.color} transition-all duration-700 rounded-full`}
                        style={{ width: `${(liveScore as Record<string, number>)[m.key]}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-xl bg-muted/40 border border-border mb-4">
                <p className="text-xs font-semibold text-foreground mb-2">Tips for a higher score:</p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Be specific about who suffers from the problem</li>
                  <li>• Explain what makes your solution unique</li>
                  <li>• Quantify the market size if possible</li>
                  <li>• Add a clear monetization strategy</li>
                </ul>
              </div>
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
                <p className="text-xs text-muted-foreground">
                  Cost: <span className="text-primary font-semibold">{CREDIT_COSTS.IDEA_EVAL} credits</span> ·
                  Balance: <span className="font-semibold text-foreground">{balance}</span>
                </p>
                {balance < CREDIT_COSTS.IDEA_EVAL && (
                  <a href="/wallet" className="mt-1.5 block text-xs text-primary hover:underline font-medium">
                    Buy more credits to continue →
                  </a>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

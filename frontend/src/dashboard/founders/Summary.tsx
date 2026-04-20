import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "motion/react";
import { Check, ArrowRight, Zap } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, Badge } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";
import { cn, avatarGradient, initials } from "../../lib/utils";

export default function FounderSummary() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { state } = useLocation();
  const data = state?.profile ?? { stage: profile?.startup_stage ?? "Idea", industries: profile?.industries ?? [], experience: profile?.experience ?? "First Time Founder", hours: profile?.weekly_hours ?? 30 };
  const name = profile ? `${profile.first_name} ${profile.last_name}` : "You";
  const aiScore = 80 + Math.min(15, (data.industries?.length ?? 1) * 3);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center gap-2.5 px-6 py-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2"><div className="size-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center"><Zap className="size-4 text-white" /></div><span className="font-display font-bold text-sm text-foreground">TECHIT NETWORK</span></Link>
      </nav>
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <div className="mx-auto size-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-xl shadow-cyan-500/30"><Check className="size-8 text-white" /></div>
            <h1 className="font-display font-bold text-3xl text-foreground">Profile Complete</h1>
            <p className="text-muted-foreground">Your AI-generated founder profile is ready. Here is your summary.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn("size-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-base", avatarGradient(name))}>{initials(name)}</div>
                  <div><div className="flex items-center gap-2"><span className="font-display font-bold text-foreground">{name}</span><Badge variant="violet">Founder</Badge></div><p className="text-xs text-muted-foreground mt-0.5">{data.experience}</p></div>
                </div>
                <div className="text-right"><div className="font-display font-bold text-3xl gradient-text">{aiScore}%</div><div className="text-xs text-muted-foreground">AI Match Score</div></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[["Industries", data.industries?.join(", ") || "—"], ["Commitment", `${data.hours}h / week`], ["Experience", data.experience], ["Stage", data.stage]].map(([k,v]) => (
                  <div key={k} className="rounded-xl bg-muted/30 border border-border px-4 py-3"><p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{k}</p><p className="text-sm font-medium text-foreground truncate">{v}</p></div>
                ))}
              </div>
              <div className="rounded-xl bg-primary/5 border border-primary/15 p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">AI Matching Criteria</p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>Collaborators with expertise in <span className="text-foreground font-medium">{data.industries?.slice(0,2).join(", ") || "your industry"}</span></li>
                  <li>Team members available for <span className="text-foreground font-medium">{data.hours} hours per week</span></li>
                  <li>Investors focused on <span className="text-foreground font-medium">{data.stage} stage</span> startups</li>
                </ul>
              </div>
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-3">
            <Button variant="outline" className="w-40" onClick={() => navigate("/founder/setup")}>Edit Profile</Button>
            <Button variant="gradient" className="flex-1" onClick={() => navigate("/dashboard")}>Enter Dashboard <ArrowRight className="size-4" /></Button>
          </motion.div>
          <p className="text-center text-xs text-muted-foreground">You start with <span className="text-primary font-semibold">250 free credits</span>. No credit card required.</p>
        </div>
      </div>
    </div>
  );
}

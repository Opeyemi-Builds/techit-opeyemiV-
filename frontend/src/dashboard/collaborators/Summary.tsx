import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "motion/react";
import { Check, ArrowRight, Zap } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, Badge } from "../../components/ui/card";
import { useAuth } from "../../contexts/AuthContext";
import { cn, avatarGradient, initials } from "../../lib/utils";

export default function CollaboratorSummary() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { state } = useLocation();
  const data = state?.profile ?? { skills: profile?.skills ?? [], hours: profile?.weekly_hours ?? 20, riskTolerance: profile?.risk_tolerance ?? "Medium" };
  const name = profile ? `${profile.first_name} ${profile.last_name}` : "You";
  const aiScore = 70 + Math.min(20, (data.skills?.length ?? 1) * 3);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center gap-2.5 px-6 py-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2"><div className="size-8 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center"><Zap className="size-4 text-white" /></div><span className="font-display font-bold text-sm text-foreground">TECHIT NETWORK</span></Link>
      </nav>
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl space-y-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
            <div className="mx-auto size-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center shadow-xl"><Check className="size-8 text-white" /></div>
            <h1 className="font-display font-bold text-3xl text-foreground">Profile Complete</h1>
            <p className="text-muted-foreground">Your collaborator profile is live. The AI engine will start matching you with relevant projects.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="p-6 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn("size-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold", avatarGradient(name))}>{initials(name)}</div>
                  <div><div className="flex items-center gap-2"><span className="font-display font-bold text-foreground">{name}</span><Badge variant="cyan">Collaborator</Badge></div><p className="text-xs text-muted-foreground mt-0.5">{data.hours}h/week · {data.riskTolerance} risk</p></div>
                </div>
                <div className="text-right"><div className="font-display font-bold text-3xl gradient-text">{aiScore}%</div><div className="text-xs text-muted-foreground">AI Match Score</div></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[["Skills", data.skills?.slice(0,4).join(", ") || "—"], ["Availability", `${data.hours}h / week`], ["Risk Tolerance", data.riskTolerance], ["Account Type", "Collaborator"]].map(([k,v]) => (
                  <div key={k} className="rounded-xl bg-muted/30 border border-border px-4 py-3"><p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{k}</p><p className="text-sm font-medium text-foreground truncate">{v}</p></div>
                ))}
              </div>
              {data.skills?.length > 0 && (
                <div className="pt-2 border-t border-border flex flex-wrap gap-1.5">
                  {data.skills.map((s: string) => <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/25">{s}</span>)}
                </div>
              )}
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-3">
            <Button variant="outline" className="w-40" onClick={() => navigate("/collaborator/setup")}>Edit Profile</Button>
            <Button variant="gradient" className="flex-1" onClick={() => navigate("/collaborator/dashboard")}>Enter Dashboard <ArrowRight className="size-4" /></Button>
          </motion.div>
          <p className="text-center text-xs text-muted-foreground">You start with <span className="text-primary font-semibold">250 free credits</span>. No credit card required.</p>
        </div>
      </div>
    </div>
  );
}

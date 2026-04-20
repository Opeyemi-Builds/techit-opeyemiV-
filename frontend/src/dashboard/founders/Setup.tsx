import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";

const STAGES = ["Idea","MVP","Launch","Growth"];
const INDUSTRIES = ["AI/ML","FinTech","HealthTech","E-Commerce","SaaS","Edtech","CleanTech","Web3","Other"];
const EXPERIENCE = ["First Time Founder","Some Experience","Serial Entrepreneur"];

export default function FounderSetup() {
  const { updateProfile } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState("Idea");
  const [industries, setIndustries] = useState<string[]>([]);
  const [experience, setExperience] = useState("First Time Founder");
  const [hours, setHours] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toggle = (ind: string) => setIndustries(p => p.includes(ind) ? p.filter(x=>x!==ind) : [...p,ind]);
  const pct = (stage?25:0)+(industries.length>0?25:0)+(experience?25:0)+(hours>=5?25:0);

  async function handleContinue() {
    if (!industries.length) { setError("Select at least one industry."); return; }
    setLoading(true); setError("");
    const { error: err } = await updateProfile({ startup_stage: stage, industries, experience, weekly_hours: hours, is_onboarded: true } as any);
    if (err) { setError(err.message); setLoading(false); return; }
    navigate("/founder/summary", { state: { profile: { stage, industries, experience, hours } } });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2"><div className="size-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center"><Zap className="size-4 text-white" /></div><span className="font-display font-bold text-sm text-foreground">TECHIT NETWORK</span></Link>
        <span className="text-xs text-muted-foreground font-mono">Founder Onboarding</span>
      </nav>
      <div className="flex-1 flex justify-center px-6 py-12">
        <div className="w-full max-w-4xl space-y-8">
          <div>
            <div className="font-mono text-xs text-primary uppercase tracking-widest mb-2">Founder Profile Setup</div>
            <h1 className="font-display font-bold text-3xl text-foreground">Tell us about your startup journey</h1>
            <p className="text-sm text-muted-foreground mt-2">This information powers the AI matching engine to find you the best collaborators and investors.</p>
          </div>
          {error && <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            <div className="space-y-5">
              <div className="rounded-2xl bg-card border border-border p-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Current Stage</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {STAGES.map(s => <button key={s} onClick={()=>setStage(s)} className={cn("rounded-xl border py-3 text-sm font-medium transition-all text-center",stage===s?"border-primary bg-primary/10 text-primary":"border-border bg-background hover:border-primary/40 text-foreground")}>{s}</button>)}
                </div>
              </div>
              <div className="rounded-2xl bg-card border border-border p-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Industry Focus</p>
                <p className="text-xs text-muted-foreground mb-4">Select all that apply</p>
                <div className="flex flex-wrap gap-2">
                  {INDUSTRIES.map(ind => <button key={ind} onClick={()=>toggle(ind)} className={cn("rounded-full border px-4 py-2 text-sm transition-all",industries.includes(ind)?"border-secondary bg-secondary/10 text-secondary":"border-border hover:border-secondary/40 text-muted-foreground")}>{ind}</button>)}
                </div>
              </div>
              <div className="rounded-2xl bg-card border border-border p-6 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Founder Experience</p>
                {EXPERIENCE.map(e => <label key={e} className={cn("flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all",experience===e?"border-accent bg-accent/10":"border-border hover:border-accent/40")}><input type="radio" checked={experience===e} onChange={()=>setExperience(e)} className="accent-primary" /><span className="text-sm text-foreground">{e}</span></label>)}
              </div>
              <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
                <div className="flex justify-between items-center"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Weekly Time Commitment</p><span className="text-sm font-bold text-primary font-mono">{hours}h / week</span></div>
                <input type="range" min={5} max={60} value={hours} onChange={e=>setHours(+e.target.value)} className="w-full accent-primary" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>Part-time (5h)</span><span>Full-time (60h)</span></div>
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border p-5 h-fit sticky top-6 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Profile Strength</p>
              <div className="text-3xl font-display font-bold gradient-text">{pct}%</div>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style={{width:`${pct}%`}} /></div>
              <p className="text-xs text-muted-foreground">A complete profile increases your match quality by 3x.</p>
              <Button variant="gradient" className="w-full" onClick={handleContinue} loading={loading} disabled={!industries.length}>Continue <ArrowRight className="size-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

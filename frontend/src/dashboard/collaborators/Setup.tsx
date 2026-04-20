import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Zap, Search } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";

const ALL_SKILLS = ["React","Vue","Angular","Node.js","Python","Django","FastAPI","Go","TypeScript","JavaScript","Java","Kotlin","Swift","Flutter","React Native","AWS","GCP","Azure","Docker","Kubernetes","PostgreSQL","MongoDB","Redis","GraphQL","UI/UX Design","Figma","Marketing","Growth","Product Management","Data Science","Machine Learning","DevOps","Blockchain","SEO","Content Strategy"];
const RISK = ["Low","Medium","High"] as const;

export default function CollaboratorSetup() {
  const { updateProfile } = useAuth();
  const navigate = useNavigate();
  const [skills, setSkills] = useState<string[]>([]);
  const [hours, setHours] = useState(20);
  const [risk, setRisk] = useState<"Low"|"Medium"|"High">("Medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const toggle = (s: string) => setSkills(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s]);
  const filtered = ALL_SKILLS.filter(s => s.toLowerCase().includes(search.toLowerCase()));
  const pct = (skills.length>0?40:0)+(hours>=5?30:0)+(risk?30:0);

  async function handleContinue() {
    if (!skills.length) { setError("Select at least one skill."); return; }
    setLoading(true); setError("");
    const { error: err } = await updateProfile({ skills, weekly_hours: hours, risk_tolerance: risk, is_onboarded: true } as any);
    if (err) { setError(err.message); setLoading(false); return; }
    navigate("/collaborator/summary", { state: { profile: { skills, hours, riskTolerance: risk } } });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2"><div className="size-8 rounded-lg bg-gradient-to-br from-secondary to-accent flex items-center justify-center"><Zap className="size-4 text-white" /></div><span className="font-display font-bold text-sm text-foreground">TECHIT NETWORK</span></Link>
        <span className="text-xs text-muted-foreground font-mono">Collaborator Onboarding</span>
      </nav>
      <div className="flex-1 flex justify-center px-6 py-12">
        <div className="w-full max-w-4xl space-y-8">
          <div>
            <div className="font-mono text-xs text-secondary uppercase tracking-widest mb-2">Collaborator Profile Setup</div>
            <h1 className="font-display font-bold text-3xl text-foreground">Define your skills and availability</h1>
            <p className="text-sm text-muted-foreground mt-2">The AI matching engine uses this to connect you with projects that need exactly what you bring.</p>
          </div>
          {error && <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            <div className="space-y-5">
              <div className="rounded-2xl bg-card border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Your Skills</p>
                  {skills.length > 0 && <span className="text-xs font-mono text-primary">{skills.length} selected</span>}
                </div>
                <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2 mb-4">
                  <Search className="size-4 text-muted-foreground flex-shrink-0" />
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search skills..." className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground" />
                </div>
                <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
                  {filtered.map(s => <button key={s} onClick={()=>toggle(s)} className={cn("rounded-full border px-3 py-1.5 text-sm transition-all flex-shrink-0",skills.includes(s)?"border-secondary bg-secondary/10 text-secondary":"border-border hover:border-secondary/40 text-muted-foreground")}>{s}</button>)}
                </div>
                {skills.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Selected skills:</p>
                    <div className="flex flex-wrap gap-1.5">{skills.map(s => <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-secondary/15 text-secondary border border-secondary/25">{s}</span>)}</div>
                  </div>
                )}
              </div>
              <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
                <div className="flex justify-between items-center"><p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Weekly Availability</p><span className="text-sm font-bold text-secondary font-mono">{hours}h / week</span></div>
                <input type="range" min={5} max={60} value={hours} onChange={e=>setHours(+e.target.value)} className="w-full accent-secondary" />
                <div className="flex justify-between text-xs text-muted-foreground"><span>Part-time (5h)</span><span>Full-time (60h)</span></div>
              </div>
              <div className="rounded-2xl bg-card border border-border p-6">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">Risk Tolerance</p>
                <p className="text-xs text-muted-foreground mb-4">Low — stable equity deals. High — early-stage startups with greater upside.</p>
                <div className="grid grid-cols-3 gap-3">{RISK.map(r => <button key={r} onClick={()=>setRisk(r)} className={cn("rounded-xl border py-3 text-sm font-medium transition-all",risk===r?"border-accent bg-accent/10 text-accent":"border-border hover:border-accent/40 text-muted-foreground")}>{r}</button>)}</div>
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border p-5 h-fit sticky top-6 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Profile Strength</p>
              <div className="text-3xl font-display font-bold gradient-text">{pct}%</div>
              <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-secondary to-accent transition-all duration-500" style={{width:`${pct}%`}} /></div>
              <p className="text-xs text-muted-foreground">More skills and accurate availability = better project matches.</p>
              <Button variant="gradient" className="w-full" onClick={handleContinue} loading={loading} disabled={!skills.length}>Continue <ArrowRight className="size-4" /></Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

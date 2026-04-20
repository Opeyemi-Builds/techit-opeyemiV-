import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";

const FOCUSES = ["AI/ML","FinTech","HealthTech","E-Commerce","SaaS","Edtech","CleanTech","Web3","Other"];
const STAGES = ["Pre-Seed","Seed","Series A","Series B+","Any Stage"];
const SIZES = ["Under $10K","$10K – $50K","$50K – $150K","$150K – $500K","$500K+"];

export default function InvestorSetup() {
  const { updateProfile } = useAuth();
  const navigate = useNavigate();
  const [focuses, setFocuses] = useState<string[]>([]);
  const [stage, setStage] = useState("Seed");
  const [ticketSize, setTicketSize] = useState("$50K – $150K");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const toggle = (f: string) => setFocuses(p => p.includes(f) ? p.filter(x=>x!==f) : [...p,f]);

  async function handleContinue() {
    if (!focuses.length) { setError("Select at least one investment focus."); return; }
    setLoading(true); setError("");
    const { error: err } = await updateProfile({ investment_focus: focuses, ticket_size: ticketSize, is_onboarded: true } as any);
    if (err) { setError(err.message); setLoading(false); return; }
    navigate("/investor/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2"><div className="size-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center"><Zap className="size-4 text-white" /></div><span className="font-display font-bold text-sm text-foreground">TECHIT NETWORK</span></Link>
        <span className="text-xs text-muted-foreground font-mono">Investor Onboarding</span>
      </nav>
      <div className="flex-1 flex justify-center px-6 py-12">
        <div className="w-full max-w-2xl space-y-8">
          <div>
            <div className="font-mono text-xs text-teal-400 uppercase tracking-widest mb-2">Investor Profile Setup</div>
            <h1 className="font-display font-bold text-3xl text-foreground">Define your investment thesis</h1>
            <p className="text-sm text-muted-foreground mt-2">This helps us surface the most relevant deal flow for your portfolio strategy.</p>
          </div>
          {error && <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>}
          <div className="space-y-5">
            <div className="rounded-2xl bg-card border border-border p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Investment Focus Areas</p>
              <div className="flex flex-wrap gap-2">
                {FOCUSES.map(f => <button key={f} onClick={()=>toggle(f)} className={cn("rounded-full border px-4 py-2 text-sm transition-all",focuses.includes(f)?"border-teal-500 bg-teal-500/10 text-teal-400":"border-border hover:border-teal-500/40 text-muted-foreground")}>{f}</button>)}
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Preferred Startup Stage</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {STAGES.map(s => <button key={s} onClick={()=>setStage(s)} className={cn("rounded-xl border py-3 text-sm font-medium transition-all",stage===s?"border-teal-500 bg-teal-500/10 text-teal-400":"border-border hover:border-teal-500/40 text-muted-foreground")}>{s}</button>)}
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Typical Ticket Size</p>
              <div className="grid grid-cols-2 gap-3">
                {SIZES.map(s => <button key={s} onClick={()=>setTicketSize(s)} className={cn("rounded-xl border py-3 text-sm font-medium transition-all",ticketSize===s?"border-teal-500 bg-teal-500/10 text-teal-400":"border-border hover:border-teal-500/40 text-muted-foreground")}>{s}</button>)}
              </div>
            </div>
            <Button variant="gradient" className="w-full" onClick={handleContinue} loading={loading} disabled={!focuses.length}>
              Go to Dashboard <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

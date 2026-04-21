import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowRight, Zap } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";

const ORG_TYPES = ["Startup Accelerator","Corporate Innovation","University","Government Body","NGO","Research Institute","Venture Capital","Other"];

export default function OrgSetup() {
  const { updateProfile } = useAuth();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("Corporate Innovation");
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleContinue() {
    if (!orgName.trim()) { setError("Enter your organisation name."); return; }
    setLoading(true); setError("");
    const { error: err } = await updateProfile({ org_name: orgName, org_type: orgType, website: website || null, is_onboarded: true } as any);
    if (err) { setError(err.message); setLoading(false); return; }
    navigate("/org/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2"><div className="size-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center"><Zap className="size-4 text-white" /></div><span className="font-display font-bold text-sm text-foreground">TECHIT NETWORK</span></Link>
        <span className="text-xs text-muted-foreground font-mono">Organisation Onboarding</span>
      </nav>
      <div className="flex-1 flex justify-center px-6 py-12">
        <div className="w-full max-w-xl space-y-8">
          <div>
            <div className="font-mono text-xs text-rose-400 uppercase tracking-widest mb-2">Organisation Profile Setup</div>
            <h1 className="font-display font-bold text-3xl text-foreground">Tell us about your organisation</h1>
            <p className="text-sm text-muted-foreground mt-2">This helps builders, founders, and collaborators understand who you are and what you offer.</p>
          </div>
          {error && <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>}
          <div className="space-y-5">
            <Input label="Organisation Name" value={orgName} onChange={e=>setOrgName(e.target.value)} placeholder="Acme Innovation Lab" />
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-muted-foreground tracking-wide uppercase">Organisation Type</label>
              <div className="grid grid-cols-2 gap-2">
                {ORG_TYPES.map(t => <button key={t} onClick={()=>setOrgType(t)} className={cn("rounded-xl border py-2.5 px-4 text-sm font-medium text-left transition-all",orgType===t?"border-rose-500 bg-rose-500/10 text-rose-400":"border-border hover:border-rose-500/40 text-muted-foreground")}>{t}</button>)}
              </div>
            </div>
            <Input label="Website (optional)" value={website} onChange={e=>setWebsite(e.target.value)} placeholder="https://yourorganisation.com" />
            <Button variant="gradient" className="w-full" onClick={handleContinue} loading={loading} disabled={!orgName.trim()}>
              Go to Dashboard <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Lock, Eye, EyeOff, Zap, CheckCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) setError(err.message);
    else { setDone(true); setTimeout(() => navigate("/login"), 2000); }
    setLoading(false);
  }

  if (done) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
        <div className="size-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <CheckCircle className="size-8 text-emerald-400" />
        </div>
        <h2 className="font-display font-bold text-2xl">Password updated!</h2>
        <p className="text-muted-foreground">Redirecting to sign in...</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="orb orb-violet w-96 h-96 -top-20 -left-20 opacity-30 fixed" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10 space-y-8">
        <div className="flex items-center gap-2.5 justify-center">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Zap className="size-5 text-white" />
          </div>
          <div>
            <div className="font-display font-bold leading-none">TECHIT</div>
            <div className="font-mono text-[0.6rem] text-primary tracking-widest">NETWORK</div>
          </div>
        </div>
        <div className="rounded-3xl bg-card border border-border p-8 shadow-2xl shadow-primary/5 space-y-6">
          <div className="text-center">
            <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="size-7 text-primary" />
            </div>
            <h1 className="font-display font-bold text-2xl">Set new password</h1>
            <p className="text-sm text-muted-foreground mt-2">Must be at least 8 characters.</p>
          </div>
          {error && <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="New Password" type={showPwd ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
              rightElement={<button type="button" onClick={() => setShowPwd(s => !s)} className="text-muted-foreground hover:text-foreground">{showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>}
            />
            <Input label="Confirm Password" type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              error={confirm && password !== confirm ? "Passwords don't match" : undefined}
            />
            <Button type="submit" variant="gradient" size="lg" className="w-full" loading={loading}>Update Password</Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, ArrowLeft, Zap, CheckCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) { setError("Enter a valid email"); return; }
    setLoading(true); setError("");
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) setError(err.message);
    else setSent(true);
    setLoading(false);
  }

  if (sent) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center space-y-6">
        <div className="size-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto">
          <CheckCircle className="size-8 text-emerald-400" />
        </div>
        <h1 className="font-display font-bold text-2xl">Check your email</h1>
        <p className="text-muted-foreground">We sent a password reset link to <strong className="text-foreground">{email}</strong>. Check your inbox.</p>
        <Link to="/login"><Button variant="outline" className="w-full"><ArrowLeft className="size-4" /> Back to Sign In</Button></Link>
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
              <Mail className="size-7 text-primary" />
            </div>
            <h1 className="font-display font-bold text-2xl">Reset your password</h1>
            <p className="text-sm text-muted-foreground mt-2">Enter your email and we'll send you a reset link.</p>
          </div>
          {error && <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            <Button type="submit" variant="gradient" size="lg" className="w-full" loading={loading}>Send Reset Link</Button>
          </form>
          <div className="text-center">
            <Link to="/login" className="text-sm text-primary hover:underline flex items-center gap-1.5 justify-center">
              <ArrowLeft className="size-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

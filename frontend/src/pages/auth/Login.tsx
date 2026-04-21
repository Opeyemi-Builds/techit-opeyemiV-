import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Eye, EyeOff, Zap, ArrowRight, Mail, Lock } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const ROLE_ROUTES: Record<string, string> = {
  founder: "/dashboard",
  collaborator: "/collaborator/dashboard",
  investor: "/investor/dashboard",
  organisation: "/org/dashboard",
};

const ROLE_SETUP_ROUTES: Record<string, string> = {
  founder: "/founder/setup",
  collaborator: "/collaborator/setup",
  investor: "/investor/setup",
  organisation: "/org/setup",
};

export default function Login() {
  const { signIn, profile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      const dest = from ?? (
        !profile.is_onboarded
          ? (ROLE_SETUP_ROUTES[profile.role] ?? "/founder/setup")
          : (ROLE_ROUTES[profile.role] ?? "/dashboard")
      );
      navigate(dest, { replace: true });
    }
  }, [user, profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err.message.includes("Invalid") ? "Invalid email or password." : err.message);
      setLoading(false);
    }
    // redirect handled by useEffect above once profile loads
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-primary/20 via-secondary/10 to-background overflow-hidden flex-col justify-between p-12">
        <div className="orb orb-violet w-[400px] h-[400px] -top-20 -left-20 absolute" />
        <div className="orb orb-cyan w-[300px] h-[300px] bottom-0 right-0 absolute" />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5 mb-16">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <Zap className="size-5 text-white" />
            </div>
            <div>
              <div className="font-display font-bold leading-none text-foreground">TECHIT</div>
              <div className="font-mono text-[0.6rem] text-primary tracking-widest">NETWORK</div>
            </div>
          </Link>
          <h2 className="font-display font-extrabold text-4xl leading-tight tracking-tight mb-4 text-foreground">Welcome<br/>Back.</h2>
          <p className="text-muted-foreground text-base leading-relaxed max-w-sm">Your projects, your team, your investors — all waiting for you.</p>
        </div>
        <div className="relative z-10 space-y-4">
          {[
            { value: "94%", label: "AI Match Success Rate" },
            { value: "12K+", label: "Active Builders" },
            { value: "60+", label: "Countries" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-4 p-4 rounded-xl bg-card/50 border border-border">
              <div className="font-display font-bold text-2xl gradient-text">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Zap className="size-4 text-white" />
            </div>
            <span className="font-display font-bold text-sm">TECHIT NETWORK</span>
          </Link>

          <div className="mb-8">
            <h1 className="font-display font-extrabold text-3xl tracking-tight text-foreground">Sign In</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary font-medium hover:underline">Create one free</Link>
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              leftIcon={<Mail className="size-4" />}
              required
              autoComplete="email"
            />
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-muted-foreground tracking-wide uppercase">Password</label>
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
              </div>
              <Input
                type={showPwd ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Your password"
                leftIcon={<Lock className="size-4" />}
                rightElement={
                  <button type="button" onClick={() => setShowPwd(s => !s)} className="text-muted-foreground hover:text-foreground transition-colors">
                    {showPwd ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
                required
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" variant="gradient" size="lg" className="w-full" loading={loading}>
              Sign In <ArrowRight className="size-4" />
            </Button>
          </form>

          <div className="mt-6 p-4 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground text-center">
            You'll be redirected to your dashboard based on your role (Founder / Collaborator / Investor / Organisation).
          </div>
        </motion.div>
      </div>
    </div>
  );
}

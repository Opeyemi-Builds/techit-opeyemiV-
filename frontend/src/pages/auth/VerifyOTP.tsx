import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Mail, ArrowRight, RefreshCw, CheckCircle, Zap } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const email: string = state?.email ?? "";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) navigate("/signup");
  }, [email]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handleInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[index] = value.slice(-1);
    setOtp(next);
    setError("");
    if (value && index < 5) refs.current[index + 1]?.focus();
    if (next.every(d => d !== "") && !next.includes("")) {
      verify(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) refs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) refs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split("");
      setOtp(next);
      refs.current[5]?.focus();
      verify(pasted);
    }
  }

  async function verify(code: string) {
    setLoading(true);
    setError("");
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    if (err) {
      setError("Invalid or expired code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } else {
      setVerified(true);
      setTimeout(() => {
        const role = state?.role ?? "founder";
        const routes: Record<string, string> = {
          founder: "/founder/setup",
          collaborator: "/collaborator/setup",
          investor: "/investor/setup",
          organisation: "/org/setup",
        };
        navigate(routes[role] ?? "/dashboard");
      }, 1500);
    }
    setLoading(false);
  }

  async function resend() {
    setResending(true);
    setError("");
    const { error: err } = await supabase.auth.resend({ type: "signup", email });
    if (err) setError(err.message);
    else setCountdown(60);
    setResending(false);
  }

  if (verified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4">
          <div className="size-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle className="size-10 text-emerald-400" />
          </div>
          <h2 className="font-display font-bold text-2xl">Email Verified!</h2>
          <p className="text-muted-foreground">Redirecting you to setup...</p>
          <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="orb orb-violet w-96 h-96 -top-20 -left-20 opacity-30 fixed" />
      <div className="orb orb-cyan w-80 h-80 bottom-0 right-0 opacity-20 fixed" />

      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10 space-y-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center">
          <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Zap className="size-5 text-white" />
          </div>
          <div>
            <div className="font-display font-bold leading-none">TECHIT</div>
            <div className="font-mono text-[0.6rem] text-primary tracking-widest">NETWORK</div>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-card border border-border p-8 shadow-2xl shadow-primary/5 space-y-6">
          <div className="text-center space-y-3">
            <div className="size-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Mail className="size-7 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-2xl">Check your email</h1>
              <p className="text-sm text-muted-foreground mt-2">
                We sent a 6-digit verification code to
              </p>
              <p className="text-sm font-semibold text-foreground">{email}</p>
            </div>
          </div>

          {/* OTP inputs */}
          <div className="flex gap-3 justify-center" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { refs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleInput(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                autoFocus={i === 0}
                className={cn(
                  "w-12 h-14 text-center text-xl font-display font-bold rounded-xl border-2 bg-input text-foreground",
                  "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all",
                  digit ? "border-primary bg-primary/5" : "border-border",
                  error && "border-destructive focus:border-destructive"
                )}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              Verifying...
            </div>
          )}

          {/* Manual verify button */}
          <Button
            variant="gradient"
            size="lg"
            className="w-full"
            onClick={() => verify(otp.join(""))}
            disabled={otp.some(d => !d) || loading}
            loading={loading}
          >
            Verify Email <ArrowRight className="size-4" />
          </Button>

          {/* Resend */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">Didn't receive the code?</p>
            {countdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Resend in <span className="text-primary font-mono font-semibold">{countdown}s</span>
              </p>
            ) : (
              <button
                onClick={resend}
                disabled={resending}
                className="text-sm text-primary hover:underline font-medium flex items-center gap-1.5 mx-auto disabled:opacity-50"
              >
                {resending ? <><RefreshCw className="size-3.5 animate-spin" /> Sending...</> : <><RefreshCw className="size-3.5" /> Resend code</>}
              </button>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Wrong email?{" "}
            <button onClick={() => navigate("/signup")} className="text-primary hover:underline font-medium">
              Go back
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Eye, EyeOff, Zap, ArrowRight, ArrowLeft,
  Check, User, Mail, Lock,
  Rocket, Zap as ZapIcon, TrendingUp, Building2,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import type { Role } from "../../contexts/AuthContext";

const ROLES: {
  id: Role;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  desc: string;
}[] = [
  { id: "founder",      label: "Founder",      Icon: Rocket,    desc: "Launch startups and find your team"   },
  { id: "collaborator", label: "Collaborator", Icon: ZapIcon,   desc: "Join projects and earn credits"       },
  { id: "investor",     label: "Investor",     Icon: TrendingUp, desc: "Discover and fund startups"          },
  { id: "organisation", label: "Organisation", Icon: Building2, desc: "Find talent and post challenges"      },
];

const ROLE_SETUP: Record<Role, string> = {
  founder:      "/founder/setup",
  collaborator: "/collaborator/setup",
  investor:     "/investor/setup",
  organisation: "/org/setup",
};

const COUNTRIES = [
  { code: "NG", name: "Nigeria",             dial: "+234" },
  { code: "GH", name: "Ghana",               dial: "+233" },
  { code: "ZA", name: "South Africa",        dial: "+27"  },
  { code: "KE", name: "Kenya",               dial: "+254" },
  { code: "ET", name: "Ethiopia",            dial: "+251" },
  { code: "RW", name: "Rwanda",              dial: "+250" },
  { code: "SN", name: "Senegal",             dial: "+221" },
  { code: "TZ", name: "Tanzania",            dial: "+255" },
  { code: "CI", name: "Côte d'Ivoire",       dial: "+225" },
  { code: "UG", name: "Uganda",              dial: "+256" },
  { code: "US", name: "United States",       dial: "+1"   },
  { code: "GB", name: "United Kingdom",      dial: "+44"  },
  { code: "IN", name: "India",               dial: "+91"  },
  { code: "DE", name: "Germany",             dial: "+49"  },
  { code: "FR", name: "France",              dial: "+33"  },
  { code: "CA", name: "Canada",              dial: "+1"   },
  { code: "BR", name: "Brazil",              dial: "+55"  },
  { code: "AU", name: "Australia",           dial: "+61"  },
  { code: "SG", name: "Singapore",           dial: "+65"  },
  { code: "AE", name: "United Arab Emirates",dial: "+971" },
  { code: "OTHER", name: "Other",            dial: ""     },
];

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-muted", "bg-destructive", "bg-amber-500", "bg-yellow-500", "bg-emerald-500"];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score] : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labels[score]}</p>
    </div>
  );
}

export default function Signup() {
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [showPwd, setShowPwd] = useState(false);

  const [form, setForm] = useState({
    firstName: "", lastName: "", phone: "",
    country: "NG", countryCode: "+234",
    email: "",
    role: (searchParams.get("role") as Role) || "founder" as Role,
    password: "", confirmPassword: "",
    agreeTerms: false,
  });

  useEffect(() => {
    if (user) navigate("/home", { replace: true });
  }, [user]);

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  function handleCountry(code: string) {
    const c = COUNTRIES.find(x => x.code === code);
    if (c) { set("country", c.name); set("countryCode", c.dial); }
    set("country", COUNTRIES.find(x => x.code === code)?.name ?? code);
  }

  // Actually store the code for display
  const [countryCode_state, setCountryCode] = useState("NG");
  function selectCountry(code: string) {
    const c = COUNTRIES.find(x => x.code === code);
    if (!c) return;
    setCountryCode(code);
    setForm(f => ({ ...f, country: c.name, countryCode: c.dial }));
  }
  const selectedCountry = COUNTRIES.find(c => c.code === countryCode_state) ?? COUNTRIES[0];

  function goNext() {
    setError("");
    if (step === 1) {
      if (!form.firstName.trim()) { setError("First name is required."); return; }
      if (!form.lastName.trim())  { setError("Last name is required.");  return; }
      if (!form.phone.trim())     { setError("Phone number is required."); return; }
    }
    if (step === 2) {
      if (!form.email.includes("@")) { setError("Enter a valid email address."); return; }
    }
    setStep(s => s + 1);
  }

  async function handleSubmit() {
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!form.agreeTerms) { setError("Please agree to the Terms of Service."); return; }

    setLoading(true);
    setError("");

    const { error: err } = await signUp({
      email:       form.email,
      password:    form.password,
      firstName:   form.firstName,
      lastName:    form.lastName,
      phone:       `${form.countryCode}${form.phone}`.replace(/\s/g, ""),
      country:     selectedCountry.name,
      countryCode: form.countryCode,
      role:        form.role,
    });

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    navigate(ROLE_SETUP[form.role]);
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-5/12 relative bg-gradient-to-br from-primary/15 via-secondary/8 to-background overflow-hidden flex-col justify-between p-12">
        <div className="orb orb-violet w-[400px] h-[400px] -top-20 -left-20 absolute" />
        <div className="orb orb-cyan w-[300px] h-[300px] bottom-20 right-0 absolute" />
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2.5 mb-12">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <Zap className="size-5 text-white" />
            </div>
            <div>
              <div className="font-display font-bold leading-none text-foreground">TECHIT</div>
              <div className="font-mono text-[0.6rem] text-primary tracking-widest">NETWORK</div>
            </div>
          </Link>
          <h2 className="font-display font-extrabold text-4xl leading-tight tracking-tight mb-3 text-foreground">
            Build.<br />Connect.<br />Ship.
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            Join the global network where founders find co-builders, investors discover deals, and tech experts build their legacy.
          </p>
        </div>
        <div className="relative z-10 p-5 rounded-2xl bg-card/60 border border-border backdrop-blur">
          <p className="text-sm text-muted-foreground italic leading-relaxed mb-4">
            "Found my technical co-founder in 3 days through TechIT. The AI matching is unlike anything else."
          </p>
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">AK</div>
            <div>
              <div className="text-sm font-semibold text-foreground">Amara Kone</div>
              <div className="text-xs text-muted-foreground">Founder · Lagos · Seed Funded</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Zap className="size-4 text-white" />
            </div>
            <span className="font-display font-bold text-sm text-foreground">TECHIT NETWORK</span>
          </Link>

          <div className="mb-8">
            <h1 className="font-display font-extrabold text-3xl tracking-tight text-foreground">Create Account</h1>
            <p className="text-muted-foreground text-sm mt-2">
              Already a member?{" "}
              <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </div>

          {/* Progress */}
          <div className="flex gap-2 mb-8">
            {[1, 2, 3].map(n => (
              <div key={n} className={`h-1 flex-1 rounded-full transition-all duration-500 ${n < step ? "bg-emerald-500" : n === step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1 — Personal details */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="font-mono text-xs text-primary uppercase tracking-widest mb-1">Step 01 — Your Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="First Name" value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="Amara" leftIcon={<User className="size-4" />} />
                  <Input label="Last Name"  value={form.lastName}  onChange={e => set("lastName",  e.target.value)} placeholder="Kone" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground tracking-wide uppercase">Country</label>
                  <select
                    value={countryCode_state}
                    onChange={e => selectCountry(e.target.value)}
                    className="w-full h-10 rounded-xl border border-border bg-input px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground tracking-wide uppercase">Phone Number</label>
                  <div className="flex rounded-xl border border-border overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                    <div className="flex items-center px-3 bg-muted/50 border-r border-border text-sm text-muted-foreground font-mono flex-shrink-0">
                      {selectedCountry.dial || "+?"}
                    </div>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => set("phone", e.target.value)}
                      placeholder="800 000 0000"
                      className="flex-1 h-10 bg-input px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>
                <Button variant="gradient" size="lg" className="w-full mt-2" onClick={goNext}>
                  Continue <ArrowRight className="size-4" />
                </Button>
              </motion.div>
            )}

            {/* Step 2 — Role and email */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="font-mono text-xs text-primary uppercase tracking-widest mb-1">Step 02 — Role and Email</p>
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground tracking-wide uppercase">I am joining as...</label>
                  <div className="grid grid-cols-2 gap-3">
                    {ROLES.map(role => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => set("role", role.id)}
                        className={`p-4 rounded-xl border text-left transition-all ${form.role === role.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/40"}`}
                      >
                        <role.Icon className={`size-5 mb-2 ${form.role === role.id ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="text-sm font-semibold text-foreground">{role.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{role.desc}</div>
                        {form.role === role.id && (
                          <div className="mt-2 size-4 rounded-full bg-primary flex items-center justify-center">
                            <Check className="size-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">You can switch roles anytime from Settings.</p>
                </div>
                <Input
                  label="Email Address"
                  type="email"
                  value={form.email}
                  onChange={e => set("email", e.target.value)}
                  placeholder="you@example.com"
                  leftIcon={<Mail className="size-4" />}
                />
                <div className="flex gap-3">
                  <Button variant="outline" size="lg" onClick={() => setStep(1)} className="w-12 flex-shrink-0 px-0 justify-center">
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button variant="gradient" size="lg" className="flex-1" onClick={goNext}>
                    Continue <ArrowRight className="size-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3 — Password */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <p className="font-mono text-xs text-primary uppercase tracking-widest mb-1">Step 03 — Secure Your Account</p>
                <div>
                  <Input
                    label="Create Password"
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={e => set("password", e.target.value)}
                    placeholder="Minimum 8 characters"
                    leftIcon={<Lock className="size-4" />}
                    rightElement={
                      <button type="button" onClick={() => setShowPwd(s => !s)} className="text-muted-foreground hover:text-foreground transition-colors text-xs font-medium">
                        {showPwd ? "Hide" : "Show"}
                      </button>
                    }
                  />
                  <PasswordStrength password={form.password} />
                </div>
                <Input
                  label="Confirm Password"
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => set("confirmPassword", e.target.value)}
                  placeholder="Repeat password"
                  leftIcon={<Lock className="size-4" />}
                  error={form.confirmPassword && form.password !== form.confirmPassword ? "Passwords do not match" : undefined}
                />
                <label className="flex items-start gap-3 cursor-pointer">
                  <div
                    onClick={() => set("agreeTerms", !form.agreeTerms)}
                    className={`mt-0.5 size-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${form.agreeTerms ? "bg-primary border-primary" : "border-border"}`}
                  >
                    {form.agreeTerms && <Check className="size-3 text-white" />}
                  </div>
                  <span className="text-sm text-muted-foreground leading-relaxed">
                    I agree to the{" "}
                    <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>{" "}
                    and{" "}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
                    I confirm I am 16 years or older.
                  </span>
                </label>
                <div className="flex gap-3">
                  <Button variant="outline" size="lg" onClick={() => setStep(2)} className="w-12 flex-shrink-0 px-0 justify-center">
                    <ArrowLeft className="size-4" />
                  </Button>
                  <Button variant="gradient" size="lg" className="flex-1" onClick={handleSubmit} loading={loading}>
                    Create Account
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

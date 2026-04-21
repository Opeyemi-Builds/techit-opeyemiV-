import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Zap, Users, TrendingUp, Shield, Code2, Sparkles, ChevronDown, Star } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const ROLES = [
  { id: "founder", label: "Founder", color: "from-violet-500 to-purple-600", desc: "Launch your startup, validate ideas with AI, find your dream team.", features: ["AI Idea Evaluation", "Smart Team Matching", "Investor Connect", "Built-in Workspace"] },
  { id: "collaborator", label: "Collaborator", color: "from-cyan-500 to-blue-600", desc: "Join exciting startups, earn credits and equity, build your reputation.", features: ["Skill-matched Opportunities", "Paid and Equity Deals", "Credibility Score System", "In-platform Code Editor"] },
  { id: "investor", label: "Investor", color: "from-teal-500 to-emerald-600", desc: "Discover pre-vetted startups with AI-scored deal flow.", features: ["AI-Scored Pipeline", "Direct Founder Access", "Portfolio Dashboard", "Deal Flow Analytics"] },
  { id: "organisation", label: "Organisation", color: "from-rose-500 to-pink-600", desc: "Find tech talent, post innovation challenges, partner with builders.", features: ["Talent Marketplace", "Innovation Challenges", "Incubation Partnerships", "Brand Visibility"] },
];

const STATS = [
  { value: "12K+", label: "Builders" },
  { value: "3.4K", label: "Projects Launched" },
  { value: "$2.1M", label: "Funded via Platform" },
  { value: "60+", label: "Countries" },
];

const FEATURES = [
  { icon: Sparkles, title: "AI Matching Engine", desc: "Our model analyzes skills, certifications, availability, and working style to surface the most compatible collaborators for every project." },
  { icon: Code2, title: "Web Code Editor", desc: "Full in-platform coding environment. Write, run, and collaborate on code without leaving TechIT Network." },
  { icon: TrendingUp, title: "Social Feed", desc: "Post updates, share milestones, discover projects, and engage with the builder community. Built for builders, not vanity metrics." },
  { icon: Star, title: "Credibility Score", desc: "Every shipped feature, delivered milestone, and positive review contributes to your transparent public trust score." },
  { icon: Users, title: "Paid Collaborations", desc: "Send paid or equity collaboration requests secured by the credit system. Founders set terms, collaborators negotiate." },
  { icon: Shield, title: "Credit Economy", desc: "A fair economy built for builders. Earn credits by contributing, purchase bundles, or subscribe for unlimited access." },
];

const ROLE_DASHBOARD: Record<string, string> = {
  founder: "/dashboard",
  collaborator: "/collaborator/dashboard",
  investor: "/investor/dashboard",
  organisation: "/org/dashboard",
};

export default function Landing() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState(0);

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (user && profile) {
      const dest = profile.is_onboarded
        ? (ROLE_DASHBOARD[profile.role] ?? "/dashboard")
        : `/${profile.role}/setup`;
      navigate(dest, { replace: true });
    }
  }, [user, profile]);

  // Rotate role cards
  useEffect(() => {
    const id = setInterval(() => setActiveRole(r => (r + 1) % ROLES.length), 4000);
    return () => clearInterval(id);
  }, []);

  // Don't render landing if logged in (prevent flash)
  if (user && profile) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb orb-violet w-[600px] h-[600px] top-[-200px] left-[-100px]" />
        <div className="orb orb-cyan w-[500px] h-[500px] top-[40%] right-[-150px]" />
        <div className="orb orb-teal w-[400px] h-[400px] bottom-0 left-[30%]" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 py-4 bg-background/70 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Zap className="size-4 text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-sm leading-none text-foreground">TECHIT</div>
            <div className="font-mono text-[0.55rem] text-primary leading-none mt-0.5 tracking-widest">NETWORK</div>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {["Features", "Roles", "Credits"].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
              {item}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5">
            Sign In
          </Link>
          <Link to="/signup" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold shadow-lg shadow-primary/30 hover:opacity-90 transition-all">
            Get Started <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/8 text-primary text-sm font-medium mb-6">
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          Live globally across 60+ countries
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="font-display font-extrabold text-5xl sm:text-6xl lg:text-8xl leading-[0.92] tracking-[-3px] max-w-5xl mb-6">
          <span className="block text-foreground">Where Builders,</span>
          <span className="block gradient-text">Investors and Experts</span>
          <span className="block text-foreground">Connect and Ship.</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
          The global platform where founders find collaborators, investors discover deals, and tech experts build their legacy — powered by AI matching and a real credit economy.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary via-secondary to-accent text-white text-base font-bold shadow-2xl shadow-primary/40 hover:opacity-95 hover:scale-[1.02] transition-all">
            Join the Network <ArrowRight className="size-5" />
          </Link>
          <a href="#roles" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-border bg-card/50 text-foreground text-base font-medium hover:bg-muted transition-all">
            Explore Roles <ChevronDown className="size-4" />
          </a>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden border border-border max-w-2xl w-full mx-auto">
          {STATS.map(({ value, label }) => (
            <div key={label} className="bg-card px-6 py-5 text-center">
              <div className="font-display font-bold text-2xl gradient-text">{value}</div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">{label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Ticker */}
      <div className="border-y border-border bg-card/50 py-4 overflow-hidden relative z-10">
        <div className="flex gap-16 whitespace-nowrap" style={{ animation: "ticker 30s linear infinite" }}>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-16 flex-shrink-0">
              {["AI-Powered Matching", "Global Founders Network", "Built-in Code Editor", "Social Feed", "Investor Connect", "Credibility Score", "Credit Economy", "Paid Collaborations", "Real-time Messaging"].map(t => (
                <span key={t} className="flex items-center gap-3 text-sm text-muted-foreground font-mono">
                  <span className="size-1.5 rounded-full bg-primary flex-shrink-0" />{t}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Roles */}
      <section id="roles" className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="font-mono text-xs text-primary uppercase tracking-widest mb-4">Who It's For</div>
          <h2 className="font-display font-extrabold text-4xl lg:text-5xl leading-tight tracking-tight mb-4 text-foreground">One Platform. Every Role.</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Choose your path and switch anytime. TechIT Network adapts to how you build.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ROLES.map((role, i) => (
            <motion.div key={role.id}
              initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              onClick={() => setActiveRole(i)}
              className={`relative rounded-2xl border p-6 cursor-pointer transition-all duration-300 ${activeRole === i ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10" : "border-border bg-card hover:border-primary/30"}`}>
              {activeRole === i && <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-primary to-transparent" />}
              <div className={`size-11 rounded-xl bg-gradient-to-br ${role.color} mb-4`} />
              <h3 className="font-display font-bold text-lg mb-2 text-foreground">{role.label}</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{role.desc}</p>
              <ul className="space-y-2">
                {role.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="size-1 rounded-full bg-primary flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link to={`/signup?role=${role.id}`} className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                Join as {role.label} <ArrowRight className="size-3" />
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-24 px-6 bg-card/30 border-y border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="font-mono text-xs text-primary uppercase tracking-widest mb-4">Platform Features</div>
            <h2 className="font-display font-extrabold text-4xl lg:text-5xl tracking-tight text-foreground">Everything You Need to Build</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border border-border">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="bg-card p-8 hover:bg-muted/30 transition-colors group">
                <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <f.icon className="size-5 text-primary" />
                </div>
                <h3 className="font-display font-bold text-base mb-2 text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Credits */}
      <section id="credits" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="font-mono text-xs text-primary uppercase tracking-widest mb-4">Credit Economy</div>
            <h2 className="font-display font-extrabold text-4xl tracking-tight mb-4 text-foreground">Power Your Growth With Credits</h2>
            <p className="text-muted-foreground text-base leading-relaxed mb-8">A fair economy built for builders. Core features are always free. Credits unlock the AI-powered premium features that help you move faster.</p>
            <div className="space-y-3">
              {[
                { label: "Starter — Free", desc: "250 credits/month · Core features", price: "$0", highlight: false },
                { label: "Pro Builder", desc: "2,500 credits/month · Full AI suite", price: "$19/mo", highlight: true },
                { label: "Elite Network", desc: "Unlimited credits · Investor access", price: "$49/mo", highlight: false },
              ].map(tier => (
                <div key={tier.label} className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${tier.highlight ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-foreground">{tier.label}</div>
                    <div className="text-xs text-muted-foreground">{tier.desc}</div>
                  </div>
                  <div className="font-mono font-semibold text-primary text-sm">{tier.price}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 to-secondary/5 p-8 shadow-2xl shadow-primary/10">
            <div className="font-mono text-xs text-muted-foreground uppercase tracking-widest mb-2">Credit Costs</div>
            <div className="font-display font-bold text-5xl gradient-text mb-6">1,250</div>
            <div className="space-y-3">
              {[
                ["AI Collaborator Matching", "50 credits"],
                ["Idea AI Evaluation", "75 credits"],
                ["Incubation Hub / month", "200 credits"],
                ["Paid Collab Request", "25 credits"],
                ["Priority Profile Boost", "100 credits"],
              ].map(([action, cost]) => (
                <div key={action} className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{action}</span>
                  <span className="font-mono text-xs text-primary font-medium">{cost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6 bg-card/30 border-t border-border">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 32 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/5 to-transparent p-12 lg:p-16 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <h2 className="font-display font-extrabold text-4xl lg:text-5xl tracking-tight mb-4 text-foreground">Ready to Build Something Real?</h2>
            <p className="text-muted-foreground text-lg mb-8">Join thousands of founders, collaborators, investors, and organisations already building on TechIT Network.</p>
            <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-bold text-base shadow-2xl shadow-primary/40 hover:opacity-95 hover:scale-[1.02] transition-all">
              Join TechIT Network <ArrowRight className="size-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="size-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Zap className="size-3.5 text-white" />
              </div>
              <span className="font-display font-bold text-sm text-foreground">TECHIT NETWORK</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">The global platform connecting tech founders, collaborators, investors and organisations.</p>
          </div>
          {[
            { title: "Platform", links: ["Features", "AI Matching", "Incubation Hub", "Credit System"] },
            { title: "Roles", links: ["Founders", "Collaborators", "Investors", "Organisations"] },
            { title: "Company", links: ["About", "Blog", "Privacy Policy", "Terms of Service"] },
          ].map(group => (
            <div key={group.title}>
              <h5 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">{group.title}</h5>
              <ul className="space-y-2.5">
                {group.links.map(link => <li key={link}><a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
          <span>© 2025 TechIT Network. All rights reserved.</span>
          <span className="font-mono">v1.0.0</span>
        </div>
      </footer>
    </div>
  );
}

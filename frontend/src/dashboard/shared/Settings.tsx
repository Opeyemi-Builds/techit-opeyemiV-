import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  User, Lock, Shield, Palette, ChevronRight,
  Check, AlertCircle, Upload, Sun, Moon,
  Rocket, Zap, TrendingUp, Building2,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Avatar, ProgressBar } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { supabase } from "../../lib/supabase";
import { cn, roleColor, avatarGradient, initials } from "../../lib/utils";
import type { Role } from "../../contexts/AuthContext";

const TABS = [
  { id: "profile",    label: "Profile",    Icon: User    },
  { id: "security",   label: "Security",   Icon: Lock    },
  { id: "role",       label: "Role",       Icon: Shield  },
  { id: "appearance", label: "Appearance", Icon: Palette },
];

const ROLES: { id: Role; label: string; Icon: React.ComponentType<{ className?: string }>; desc: string }[] = [
  { id: "founder",      label: "Founder",      Icon: Rocket,   desc: "Launch startups and find your team"    },
  { id: "collaborator", label: "Collaborator", Icon: Zap,      desc: "Join projects and earn credits"        },
  { id: "investor",     label: "Investor",     Icon: TrendingUp, desc: "Discover and fund startups"          },
  { id: "organisation", label: "Organisation", Icon: Building2, desc: "Find talent and post challenges"      },
];

export default function Settings() {
  const { profile, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [tab, setTab] = useState("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [roleChanging, setRoleChanging] = useState(false);

  const [form, setForm] = useState({
    first_name: "", last_name: "", username: "", bio: "",
    phone: "", linkedin_url: "", github_url: "", portfolio_url: "",
    timezone: "", skills: "", weekly_hours: 20, risk_tolerance: "Medium",
  });
  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        first_name:   profile.first_name ?? "",
        last_name:    profile.last_name ?? "",
        username:     profile.username ?? "",
        bio:          profile.bio ?? "",
        phone:        profile.phone ?? "",
        linkedin_url: profile.linkedin_url ?? "",
        github_url:   profile.github_url ?? "",
        portfolio_url:profile.portfolio_url ?? "",
        timezone:     profile.timezone ?? "",
        skills:       (profile.skills ?? []).join(", "),
        weekly_hours: profile.weekly_hours ?? 20,
        risk_tolerance: profile.risk_tolerance ?? "Medium",
      });
    }
  }, [profile]);

  function flash(err?: string) {
    if (err) { setError(err); setSaving(false); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setSaving(false);
  }

  async function saveProfile() {
    setSaving(true); setError(""); setSaved(false);
    const { error: err } = await updateProfile({
      first_name:    form.first_name,
      last_name:     form.last_name,
      username:      form.username || null,
      bio:           form.bio || null,
      phone:         form.phone,
      linkedin_url:  form.linkedin_url || null,
      github_url:    form.github_url || null,
      portfolio_url: form.portfolio_url || null,
      timezone:      form.timezone || null,
      skills:        form.skills
        ? form.skills.split(",").map(s => s.trim()).filter(Boolean)
        : [],
      weekly_hours:  form.weekly_hours,
      risk_tolerance: form.risk_tolerance,
    } as Parameters<typeof updateProfile>[0]);
    flash(err?.message);
  }

  async function changePassword() {
    if (pwd.next !== pwd.confirm) { setError("Passwords do not match"); return; }
    if (pwd.next.length < 8) { setError("Password must be at least 8 characters"); return; }
    setSaving(true); setError("");
    const { error: err } = await supabase.auth.updateUser({ password: pwd.next });
    if (!err) setPwd({ next: "", confirm: "" });
    flash(err?.message);
  }

  async function switchRole(role: Role) {
    setRoleChanging(true);
    await updateProfile({ role } as Parameters<typeof updateProfile>[0]);
    setRoleChanging(false);
  }

  const name = profile ? `${profile.first_name} ${profile.last_name}` : "User";
  const rc = roleColor(profile?.role ?? "founder");

  const profilePct = Math.round(
    [profile?.bio, profile?.skills?.length, profile?.linkedin_url,
     profile?.avatar_url, profile?.github_url, profile?.phone]
      .filter(Boolean).length / 6 * 100
  );

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-4xl mx-auto page-enter">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">

          {/* Sidebar */}
          <div className="space-y-1">
            <Card className="p-4 mb-4 flex flex-col items-center text-center gap-2">
              <div className={cn(
                "size-14 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white text-lg font-bold overflow-hidden",
                avatarGradient(name)
              )}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt={name} className="size-full object-cover" />
                  : initials(name)
                }
              </div>
              <p className="font-semibold text-sm text-foreground">{name}</p>
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[0.65rem] font-semibold uppercase border",
                rc.bg, rc.text, rc.border
              )}>
                {profile?.role}
              </span>
              <p className="text-xs text-muted-foreground">
                Score: {Math.round(profile?.credibility_score ?? 0)}
              </p>
            </Card>

            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  tab === id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {label}
                {tab === id && <ChevronRight className="size-4 ml-auto" />}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="space-y-5">
            {/* Status messages */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertCircle className="size-4 flex-shrink-0" />{error}
              </div>
            )}
            {saved && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
                <Check className="size-4 flex-shrink-0" /> Changes saved successfully.
              </div>
            )}

            {/* Profile Tab */}
            {tab === "profile" && (
              <motion.div key="profile" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <Card className="p-5 space-y-4">
                  <h3 className="font-display font-bold text-sm text-foreground">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="First Name" value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
                    <Input label="Last Name"  value={form.last_name}  onChange={e => setForm(p => ({ ...p, last_name:  e.target.value }))} />
                  </div>
                  <Input
                    label="Username"
                    value={form.username}
                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    placeholder="yourhandle"
                    hint="Your public @handle on TechIT Network"
                  />
                  <Input
                    label="Phone"
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+234 800 000 0000"
                  />
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bio</label>
                    <textarea
                      value={form.bio}
                      onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                      placeholder="Tell the community about yourself..."
                      rows={3}
                      className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    />
                  </div>
                </Card>

                <Card className="p-5 space-y-4">
                  <h3 className="font-display font-bold text-sm text-foreground">Social Links</h3>
                  <Input label="LinkedIn"  value={form.linkedin_url}   onChange={e => setForm(p => ({ ...p, linkedin_url:   e.target.value }))} placeholder="https://linkedin.com/in/handle" />
                  <Input label="GitHub"    value={form.github_url}     onChange={e => setForm(p => ({ ...p, github_url:     e.target.value }))} placeholder="https://github.com/handle" />
                  <Input label="Portfolio" value={form.portfolio_url}  onChange={e => setForm(p => ({ ...p, portfolio_url:  e.target.value }))} placeholder="https://yoursite.com" />
                </Card>

                <Card className="p-5 space-y-4">
                  <h3 className="font-display font-bold text-sm text-foreground">Skills and Availability</h3>
                  <Input
                    label="Skills (comma-separated)"
                    value={form.skills}
                    onChange={e => setForm(p => ({ ...p, skills: e.target.value }))}
                    placeholder="React, Node.js, Python, Design..."
                  />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Weekly Hours
                      </label>
                      <span className="text-sm font-semibold text-primary">{form.weekly_hours}h / week</span>
                    </div>
                    <input
                      type="range" min={5} max={60}
                      value={form.weekly_hours}
                      onChange={e => setForm(p => ({ ...p, weekly_hours: +e.target.value }))}
                      className="w-full accent-primary"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Part-time (5h)</span><span>Full-time (60h)</span>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Risk Tolerance</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Low", "Medium", "High"].map(r => (
                        <button
                          key={r}
                          onClick={() => setForm(p => ({ ...p, risk_tolerance: r }))}
                          className={cn(
                            "py-2 rounded-xl border text-sm font-medium transition-all",
                            form.risk_tolerance === r
                              ? "bg-primary/10 text-primary border-primary/40"
                              : "border-border text-muted-foreground hover:border-primary/30"
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <ProgressBar value={profilePct} label={`Profile ${profilePct}% complete`} />
                </Card>

                <Button variant="gradient" onClick={saveProfile} loading={saving} className="w-full">
                  {saved ? <><Check className="size-4" /> Saved</> : "Save Changes"}
                </Button>
              </motion.div>
            )}

            {/* Security Tab */}
            {tab === "security" && (
              <motion.div key="security" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                <Card className="p-5 space-y-4">
                  <h3 className="font-display font-bold text-sm text-foreground">Account Email</h3>
                  <Input label="Email" value={profile?.email ?? ""} disabled />
                  <p className="text-xs text-muted-foreground">Contact support to change your email address.</p>
                </Card>
                <Card className="p-5 space-y-4">
                  <h3 className="font-display font-bold text-sm text-foreground">Change Password</h3>
                  <Input
                    label="New Password"
                    type={showPwd ? "text" : "password"}
                    value={pwd.next}
                    onChange={e => setPwd(p => ({ ...p, next: e.target.value }))}
                    placeholder="At least 8 characters"
                    rightElement={
                      <button type="button" onClick={() => setShowPwd(s => !s)} className="text-muted-foreground hover:text-foreground text-xs">
                        {showPwd ? "Hide" : "Show"}
                      </button>
                    }
                  />
                  <Input
                    label="Confirm Password"
                    type="password"
                    value={pwd.confirm}
                    onChange={e => setPwd(p => ({ ...p, confirm: e.target.value }))}
                    placeholder="Repeat new password"
                    error={pwd.confirm && pwd.next !== pwd.confirm ? "Passwords do not match" : undefined}
                  />
                  <Button
                    variant="gradient"
                    onClick={changePassword}
                    loading={saving}
                    disabled={!pwd.next || pwd.next !== pwd.confirm || pwd.next.length < 8}
                  >
                    Update Password
                  </Button>
                </Card>
              </motion.div>
            )}

            {/* Role Tab */}
            {tab === "role" && (
              <motion.div key="role" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-5">
                  <h3 className="font-display font-bold text-sm mb-1 text-foreground">Switch Role</h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    Change your primary role. Your history and data are always preserved.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {ROLES.map(role => (
                      <button
                        key={role.id}
                        onClick={() => switchRole(role.id)}
                        disabled={roleChanging}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all",
                          profile?.role === role.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/40"
                        )}
                      >
                        <role.Icon className={cn(
                          "size-5 mb-2",
                          profile?.role === role.id ? "text-primary" : "text-muted-foreground"
                        )} />
                        <div className="font-semibold text-sm text-foreground">{role.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{role.desc}</div>
                        {profile?.role === role.id && (
                          <div className="mt-2 text-xs text-primary font-semibold flex items-center gap-1">
                            <Check className="size-3" /> Current
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Appearance Tab */}
            {tab === "appearance" && (
              <motion.div key="appearance" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="p-5">
                  <h3 className="font-display font-bold text-sm mb-4 text-foreground">Theme</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: "dark",  label: "Dark Mode",  Icon: Moon, desc: "Easy on the eyes" },
                      { id: "light", label: "Light Mode", Icon: Sun,  desc: "Clean and bright"  },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => theme !== t.id && toggleTheme()}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all",
                          theme === t.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/40"
                        )}
                      >
                        <t.Icon className={cn("size-5 mb-2", theme === t.id ? "text-primary" : "text-muted-foreground")} />
                        <div className="font-semibold text-sm text-foreground">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.desc}</div>
                        {theme === t.id && (
                          <div className="mt-2 text-xs text-primary font-semibold flex items-center gap-1">
                            <Check className="size-3" /> Active
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

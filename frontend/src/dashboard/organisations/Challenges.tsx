import { useState } from "react";
import { motion } from "motion/react";
import { Trophy, Plus, Users, Clock, AlertCircle } from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { cn, timeAgo } from "../../lib/utils";

interface Challenge {
  id: string;
  title: string;
  desc: string;
  prize: string;
  deadline: string;
  skills: string;
  status: string;
  applicants: number;
  created_at: string;
}

export default function Challenges() {
  const { profile } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "", desc: "", prize: "", deadline: "", skills: "",
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  async function handleCreate() {
    if (!form.title.trim()) { setError("Title is required."); return; }
    setSaving(true); setError("");

    const newChallenge: Challenge = {
      id: Date.now().toString(),
      title: form.title,
      desc: form.desc,
      prize: form.prize,
      deadline: form.deadline,
      skills: form.skills,
      status: "active",
      applicants: 0,
      created_at: new Date().toISOString(),
    };

    // Post to feed so the community sees it
    if (profile) {
      await supabase.from("posts").insert({
        author_id: profile.user_id,
        content: `New Challenge from ${profile.org_name ?? profile.first_name}: ${form.title}\n\n${form.desc}${form.prize ? `\n\nPrize/Compensation: ${form.prize}` : ""}${form.deadline ? `\nDeadline: ${form.deadline}` : ""}${form.skills ? `\nSkills needed: ${form.skills}` : ""}`,
        collab_tag: "HIRING",
        tags: form.skills ? form.skills.split(",").map(s => s.trim()).filter(Boolean) : [],
        likes: [],
        views: 0,
        media_urls: [],
      });
    }

    setChallenges(prev => [newChallenge, ...prev]);
    setForm({ title: "", desc: "", prize: "", deadline: "", skills: "" });
    setShowForm(false);
    setSaving(false);
  }

  return (
    <DashboardLayout title="Innovation Challenges">
      <div className="max-w-4xl mx-auto space-y-6 page-enter">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl text-foreground">Your Challenges</h2>
            <p className="text-sm text-muted-foreground">
              Post challenges for the builder community. They appear on the Social Feed.
            </p>
          </div>
          <Button variant="gradient" onClick={() => setShowForm(true)}>
            <Plus className="size-4" /> Post Challenge
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-5 border-primary/30 space-y-4">
              <h3 className="font-display font-bold text-foreground">New Challenge</h3>
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <AlertCircle className="size-4" />{error}
                </div>
              )}
              <Input
                label="Challenge Title *"
                value={form.title}
                onChange={e => set("title", e.target.value)}
                placeholder="Build an AI-powered customer support chatbot"
              />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                <textarea
                  value={form.desc}
                  onChange={e => set("desc", e.target.value)}
                  placeholder="Describe the problem and what you want built..."
                  rows={3}
                  className="w-full rounded-xl border border-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Prize / Compensation" value={form.prize} onChange={e => set("prize", e.target.value)} placeholder="$5,000 or 2% equity" />
                <Input label="Deadline" type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} />
              </div>
              <Input
                label="Required Skills"
                value={form.skills}
                onChange={e => set("skills", e.target.value)}
                placeholder="React, Node.js, AI/ML"
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowForm(false); setError(""); }}>Cancel</Button>
                <Button variant="gradient" onClick={handleCreate} loading={saving} disabled={!form.title.trim()}>
                  Post Challenge
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* List */}
        {challenges.length === 0 && !showForm ? (
          <Card className="p-12 text-center">
            <div className="size-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Trophy className="size-7 text-muted-foreground/40" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2 text-foreground">No challenges yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Post your first challenge and let the TechIT community solve it.
            </p>
            <Button variant="gradient" onClick={() => setShowForm(true)}>
              <Plus className="size-4" /> Post First Challenge
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {challenges.map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-display font-bold text-foreground">{c.title}</span>
                        <Badge variant="teal">Active</Badge>
                      </div>
                      {c.desc && <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{c.desc}</p>}
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {c.prize && (
                          <span className="flex items-center gap-1">
                            <Trophy className="size-3" /> {c.prize}
                          </span>
                        )}
                        {c.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" /> Due {c.deadline}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="size-3" /> {c.applicants} applicants
                        </span>
                      </div>
                      {c.skills && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {c.skills.split(",").map(s => (
                            <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/20">
                              {s.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="flex-shrink-0">Edit</Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

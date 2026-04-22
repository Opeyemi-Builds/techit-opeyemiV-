import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderGit2, ArrowRight, Code2, Globe } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";

const INDUSTRIES = ["SaaS", "FinTech", "HealthTech", "E-Commerce", "Web3", "AI/ML", "Other"];
const STAGES = ["Idea", "Prototyping", "MVP", "Scaling"];

export default function NewProject() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    title: "", description: "", industry: "SaaS", stage: "Idea", techStack: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !profile) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.from("projects").insert({
        founder_id: profile.user_id,
        title: form.title,
        description: form.description,
        industry: form.industry,
        stage: form.stage,
        tech_stack: form.techStack.split(",").map(s => s.trim()).filter(Boolean),
        status: "active",
      }).select().single();

      if (error) throw error;
      navigate(`/workspace/${data.id}`);
    } catch (err: any) {
      alert("Failed to create project: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title="Create Workspace">
      <div className="max-w-3xl mx-auto page-enter pb-20">
        <div className="mb-8 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <FolderGit2 className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Initialize Workspace</h1>
            <p className="text-sm text-muted-foreground">Set up a new environment for your team.</p>
          </div>
        </div>

        <Card className="p-6 md:p-8 rounded-3xl bg-[#111] border-white/5">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Core Details</h3>
              <Input label="Project Name *" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-sm focus:outline-none focus:border-primary/50 resize-none text-foreground" />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">Classification</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Globe className="size-3" /> Industry</label>
                  <select value={form.industry} onChange={e => setForm({...form, industry: e.target.value})} className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-sm outline-none focus:border-primary/50 text-foreground">
                    {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-2"><Code2 className="size-3" /> Stage</label>
                  <select value={form.stage} onChange={e => setForm({...form, stage: e.target.value})} className="w-full rounded-xl border border-white/10 bg-background px-4 py-3 text-sm outline-none focus:border-primary/50 text-foreground">
                    {STAGES.map(stage => <option key={stage} value={stage}>{stage}</option>)}
                  </select>
                </div>
              </div>
              <Input label="Tech Stack (Optional)" placeholder="e.g., React, Node.js" value={form.techStack} onChange={e => setForm({...form, techStack: e.target.value})} />
            </div>

            <div className="pt-4 flex justify-end border-t border-border mt-6">
              <Button type="submit" variant="gradient" className="px-8 font-bold mt-4" loading={loading} disabled={!form.title}>
                Create Workspace <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
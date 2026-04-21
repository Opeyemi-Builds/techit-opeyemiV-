import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  File, Plus, Trash2, Save, X, Code2,
  LayoutDashboard, Terminal as TerminalIcon,
  Maximize2, Minimize2, AlertCircle, RefreshCw,
  Copy, Check,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { cn, timeAgo } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/card";

// ── Language detection ──────────────────────────────────────
const LANG_EXT: Record<string, string[]> = {
  typescript:  ["ts","tsx"],
  javascript:  ["js","jsx","mjs","cjs"],
  python:      ["py","pyw"],
  html:        ["html","htm"],
  css:         ["css","scss","sass","less"],
  json:        ["json","jsonc"],
  markdown:    ["md","mdx"],
  sql:         ["sql"],
  bash:        ["sh","bash","zsh"],
  rust:        ["rs"],
  go:          ["go"],
  text:        ["txt"],
};
const LANG_COLORS: Record<string, string> = {
  typescript: "text-blue-400",  javascript: "text-yellow-400",
  python:     "text-green-400", html:       "text-orange-400",
  css:        "text-pink-400",  json:       "text-amber-400",
  markdown:   "text-gray-400",  sql:        "text-cyan-400",
  bash:       "text-emerald-400", rust:     "text-orange-500",
  go:         "text-sky-400",   text:       "text-muted-foreground",
};
function getLang(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  for (const [lang, exts] of Object.entries(LANG_EXT)) {
    if (exts.includes(ext)) return lang;
  }
  return "text";
}
function langColor(lang: string): string {
  return LANG_COLORS[lang] ?? LANG_COLORS.text;
}

// ── Starter files ───────────────────────────────────────────
const STARTERS = [
  {
    name: "README.md", path: "/", language: "markdown",
    content: "# Project Workspace\n\nWelcome to your TechIT Network workspace!\n\n## Getting Started\n\n1. Add files using the Explorer panel\n2. Your team collaborates in real time\n3. Use Ctrl+S to save\n\n## Milestones\n\n- [ ] Set up project structure\n- [ ] First working prototype\n- [ ] Testing\n- [ ] Launch\n",
  },
  {
    name: "notes.md", path: "/", language: "markdown",
    content: "# Project Notes\n\n## Ideas\n\n- \n\n## Decisions\n\n- \n\n## Meeting Notes\n\n",
  },
];

// ── Types ────────────────────────────────────────────────────
interface WsFile {
  id: string; workspace_id: string;
  name: string; path: string; content: string;
  language: string; updated_at: string;
}
interface Workspace {
  id: string; project_id: string;
  project?: any; // Fixed Supabase array vs object type mismatch
}
interface TeamMember {
  user_id: string; first_name: string; last_name: string; avatar_url: string | null;
}

export default function Workspace() {
  const { projectId } = useParams<{ projectId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [ws, setWs]               = useState<Workspace | null>(null);
  const [files, setFiles]         = useState<WsFile[]>([]);
  const [activeFile, setActive]   = useState<WsFile | null>(null);
  const [openTabs, setTabs]       = useState<WsFile[]>([]);
  const [content, setContent]     = useState("");
  const [team, setTeam]           = useState<TeamMember[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [accessDenied, setDenied] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(true);
  const [copied, setCopied]       = useState(false);
  const [showNew, setShowNew]     = useState(false);
  const [newName, setNewName]     = useState("");
  const [sidebarOpen, setSide]    = useState(true);
  const [termOpen, setTerm]       = useState(false);
  const [termLines, setTermLines] = useState(["TechIT Workspace Terminal v1.0", "Type 'help' for commands", ""]);
  const [termInput, setTermInput] = useState("");
  const [fullscreen, setFull]     = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<any>(null); // Fixed timer typing

  useEffect(() => {
    if (projectId && profile?.user_id) init();
  }, [projectId, profile?.user_id]);

  // Auto-save 1.5s after last keystroke
  useEffect(() => {
    if (!activeFile || saved) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [content]);

  // Realtime file sync
  useEffect(() => {
    if (!ws?.id) return;
    const ch = supabase.channel(`ws-${ws.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "workspace_files", filter: `workspace_id=eq.${ws.id}` },
        (payload) => {
          const updated = payload.new as WsFile;
          setFiles(prev => prev.map(f => f.id === updated.id ? updated : f));
          if (activeFile?.id === updated.id && saved) {
            setContent(updated.content ?? "");
            setActive(updated);
          }
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "workspace_files", filter: `workspace_id=eq.${ws.id}` },
        (payload) => {
          const nf = payload.new as WsFile;
          setFiles(prev => prev.find(f => f.id === nf.id) ? prev : [...prev, nf]);
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "workspace_files", filter: `workspace_id=eq.${ws.id}` },
        (payload) => {
          const old = payload.old as { id: string };
          setFiles(prev => prev.filter(f => f.id !== old.id));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ws?.id, activeFile?.id, saved]);

  async function init() {
    setLoading(true); setError(""); setDenied(false);
    try {
      // 1. Verify project exists
      const { data: project, error: projErr } = await supabase
        .from("projects")
        .select("id, founder_id, title, industry, stage")
        .eq("id", projectId!)
        .single();

      if (projErr || !project) {
        setError("Project not found or you don't have access.");
        setLoading(false); return;
      }

      const isFounder = project.founder_id === profile!.user_id;

      // 2. Check access for non-founders
      if (!isFounder) {
        const { data: collab } = await supabase
          .from("collaborations")
          .select("id")
          .eq("project_id", projectId!)
          .eq("user_id", profile!.user_id)
          .eq("status", "active")
          .maybeSingle();

        if (!collab) {
          setDenied(true); setLoading(false); return;
        }
      }

      // 3. Get or create workspace
      const { data: existing, error: wsErr } = await supabase
        .from("workspaces")
        .select("id, project_id, project:projects!project_id(id, title, industry, stage, founder_id)")
        .eq("project_id", projectId!)
        .maybeSingle();  // Use maybeSingle() instead of single() to avoid error on no rows

      let wsData: Workspace | null = null;

      if (existing) {
        wsData = existing;
      } else if (isFounder) {
        // Create workspace for founder
        const { data: created, error: createErr } = await supabase
          .from("workspaces")
          .insert({ project_id: projectId! })
          .select("id, project_id, project:projects!project_id(id, title, industry, stage, founder_id)")
          .single();

        if (createErr) {
          setError(`Workspace creation failed: ${createErr.message}`);
          setLoading(false); return;
        }
        wsData = created;
      } else {
        setError("Workspace not set up yet. Ask the project founder to open it first.");
        setLoading(false); return;
      }

      // wsData must be non-null here
      if (!wsData || !wsData.id) {
        setError("Failed to load workspace. Please try again.");
        setLoading(false); return;
      }

      setWs(wsData);

      // 4. Load files
      const { data: fileData } = await supabase
        .from("workspace_files")
        .select("*")
        .eq("workspace_id", wsData.id)
        .order("name");

      const existingFiles = fileData ?? [];

      if (existingFiles.length === 0 && isFounder) {
        // Seed starter files for founder only
        const seeded: WsFile[] = [];
        for (const s of STARTERS) {
          const { data: f } = await supabase
            .from("workspace_files")
            .insert({ ...s, workspace_id: wsData.id })
            .select()
            .single();
          if (f) seeded.push(f);
        }
        setFiles(seeded);
        if (seeded[0]) openFile(seeded[0]);
      } else {
        setFiles(existingFiles);
        if (existingFiles[0]) openFile(existingFiles[0]);
      }

      // 5. Load team
      const { data: collabs } = await supabase
        .from("collaborations")
        .select("user:profiles!user_id(user_id, first_name, last_name, avatar_url)")
        .eq("project_id", projectId!)
        .eq("status", "active");
      setTeam((collabs ?? []).map((c: any) => c.user).filter(Boolean));

    } catch (e: unknown) {
      console.error("[Workspace] init error:", e);
      setError((e as Error).message ?? "Failed to load workspace");
    } finally {
      setLoading(false);
    }
  }

  function openFile(file: WsFile) {
    setActive(file);
    setContent(file.content ?? "");
    setSaved(true);
    setTabs(prev => prev.find(t => t.id === file.id) ? prev : [...prev, file]);
  }

  function closeTab(file: WsFile, e: React.MouseEvent) {
    e.stopPropagation();
    const remaining = openTabs.filter(t => t.id !== file.id);
    setTabs(remaining);
    if (activeFile?.id === file.id) {
      const next = remaining[remaining.length - 1] ?? null;
      setActive(next);
      setContent(next?.content ?? "");
      setSaved(true);
    }
  }

  async function save() {
    if (!activeFile || !ws) return;
    setSaving(true);
    const { data, error: saveErr } = await supabase
      .from("workspace_files")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", activeFile.id)
      .select()
      .single();
    if (!saveErr && data) {
      setFiles(prev => prev.map(f => f.id === data.id ? data : f));
      setActive(data);
      setTabs(prev => prev.map(t => t.id === data.id ? data : t));
      setSaved(true);
    }
    setSaving(false);
  }

  async function copyContent() {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function createFile() {
    if (!newName.trim() || !ws) return;
    const language = getLang(newName.trim());
    const { data, error: err } = await supabase
      .from("workspace_files")
      .insert({ workspace_id: ws.id, name: newName.trim(), path: "/", content: "", language })
      .select()
      .single();
    if (!err && data) { setFiles(prev => [...prev, data]); openFile(data); }
    setNewName(""); setShowNew(false);
  }

  async function deleteFile(file: WsFile, e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${file.name}"?`)) return;
    await supabase.from("workspace_files").delete().eq("id", file.id);
    const remaining = openTabs.filter(t => t.id !== file.id);
    setTabs(remaining); setFiles(prev => prev.filter(f => f.id !== file.id));
    if (activeFile?.id === file.id) {
      const next = remaining[0] ?? null;
      setActive(next); setContent(next?.content ?? "");
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const next = content.substring(0, start) + "  " + content.substring(end);
      setContent(next); setSaved(false);
      setTimeout(() => {
        if (textRef.current) {
          textRef.current.selectionStart = start + 2;
          textRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); save(); }
  }

  function runTerminal(cmd: string) {
    const parts = cmd.trim().split(" ");
    let out = "";
    switch (parts[0]) {
      case "help":    out = "Commands: ls · pwd · whoami · project · team · clear"; break;
      case "ls":      out = files.map(f => f.name).join("  ") || "(empty)"; break;
      case "pwd":     out = `/workspace/${ws?.project?.title ?? projectId}`; break;
      case "whoami":  out = `${profile?.first_name} ${profile?.last_name} (${profile?.role})`; break;
      case "project": out = ws?.project ? `${ws.project.title} · ${ws.project.industry} · ${ws.project.stage}` : "No project"; break;
      case "team":    out = team.length ? team.map(m => `${m.first_name} ${m.last_name}`).join(", ") : "No team yet"; break;
      case "clear":   setTermLines([""]); setTermInput(""); return;
      default:        out = `${parts[0]}: command not found`;
    }
    setTermLines(prev => [...prev, `$ ${cmd}`, out, ""]);
    setTermInput("");
  }

  const lineNums = content.split("\n").length;
  const isFounder = ws?.project?.founder_id === profile?.user_id;

  // ── Access denied ────────────────────────────────────────
  if (accessDenied) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
        <AlertCircle className="size-7 text-amber-400" />
      </div>
      <div>
        <h2 className="font-display font-bold text-xl mb-2 text-foreground">Access Restricted</h2>
        <p className="text-muted-foreground text-sm max-w-sm">
          You need to be an active collaborator on this project to access the workspace.
          Request to join the project first.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="gradient" onClick={() => navigate("/projects")}>Browse Projects</Button>
        <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    </div>
  );

  // ── Loading ──────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Loading workspace...</p>
    </div>
  );

  // ── Error ────────────────────────────────────────────────
  if (error) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6 text-center">
      <AlertCircle className="size-12 text-destructive/60" />
      <div>
        <h2 className="font-display font-bold text-xl mb-2 text-foreground">Could not load workspace</h2>
        <p className="text-muted-foreground text-sm">{error}</p>
      </div>
      <div className="flex gap-3">
        <Button variant="gradient" onClick={init}><RefreshCw className="size-4" /> Retry</Button>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          <LayoutDashboard className="size-4" /> Dashboard
        </Button>
      </div>
    </div>
  );

  // ── Main Workspace UI ────────────────────────────────────
  return (
    <div className={cn("flex flex-col bg-background text-foreground", fullscreen ? "fixed inset-0 z-50" : "min-h-screen")}>

      {/* Top bar */}
      <header className="flex items-center gap-2 px-3 py-2 bg-sidebar border-b border-sidebar-border flex-shrink-0 h-11">
        <Link to="/dashboard" className="flex items-center gap-1.5 mr-2 flex-shrink-0">
          <div className="size-6 rounded-md bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Code2 className="size-3.5 text-white" />
          </div>
        </Link>

        <div className="flex items-center gap-1.5 text-xs flex-shrink-0 min-w-0">
          <span className="text-sidebar-foreground/40">/</span>
          <span className="font-semibold text-sidebar-foreground truncate max-w-32">
            {ws?.project?.title ?? "Workspace"}
          </span>
          {ws?.project?.stage && (
            <Badge variant="outline" className="text-[0.6rem] h-4 px-1.5">{ws.project.stage}</Badge>
          )}
          {isFounder && (
            <Badge variant="violet" className="text-[0.6rem] h-4 px-1.5">Owner</Badge>
          )}
        </div>

        {/* File tabs */}
        <div className="flex-1 flex items-center overflow-x-auto gap-0 ml-2">
          {openTabs.map(tab => (
            <div key={tab.id} onClick={() => openFile(tab)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-8 text-xs font-medium border-r border-sidebar-border cursor-pointer flex-shrink-0 transition-colors min-w-0",
                activeFile?.id === tab.id
                  ? "bg-background text-foreground"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/20"
              )}>
              <File className={cn("size-3 flex-shrink-0", langColor(tab.language))} />
              <span className="truncate max-w-20">{tab.name}</span>
              {activeFile?.id === tab.id && !saved && (
                <span className="size-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              )}
              <button onClick={e => closeTab(tab, e)}
                className="opacity-60 hover:opacity-100 hover:text-rose-400 ml-0.5 flex-shrink-0">
                <X className="size-2.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          {saving && <span className="text-[0.65rem] text-muted-foreground font-mono">saving...</span>}
          {saved && !saving && <span className="text-[0.65rem] text-emerald-400 font-mono">saved</span>}

          {team.length > 0 && (
            <div className="flex -space-x-1.5 mr-1">
              {team.slice(0, 4).map(m => (
                <div key={m.user_id} title={`${m.first_name} ${m.last_name}`}
                  className="size-6 rounded-full bg-gradient-to-br from-primary to-secondary border border-sidebar flex items-center justify-center text-white text-[0.5rem] font-bold">
                  {m.first_name[0]}
                </div>
              ))}
              {team.length > 4 && (
                <div className="size-6 rounded-full bg-muted border border-sidebar flex items-center justify-center text-[0.5rem] text-muted-foreground font-bold">
                  +{team.length - 4}
                </div>
              )}
            </div>
          )}

          <button onClick={save} title="Save (Ctrl+S)"
            className="p-1.5 rounded hover:bg-sidebar-accent/30 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            <Save className="size-3.5" />
          </button>
          <button onClick={copyContent} title="Copy file content"
            className="p-1.5 rounded hover:bg-sidebar-accent/30 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
          </button>
          <button onClick={() => setTerm(o => !o)} title="Toggle Terminal"
            className={cn("p-1.5 rounded transition-colors",
              termOpen ? "bg-primary/20 text-primary" : "hover:bg-sidebar-accent/30 text-sidebar-foreground/60 hover:text-sidebar-foreground")}>
            <TerminalIcon className="size-3.5" />
          </button>
          <button onClick={() => setFull(f => !f)}
            className="p-1.5 rounded hover:bg-sidebar-accent/30 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            {fullscreen ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </button>
          <Link to="/dashboard"
            className="p-1.5 rounded hover:bg-sidebar-accent/30 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors">
            <LayoutDashboard className="size-3.5" />
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* File Explorer */}
        {sidebarOpen && (
          <div className="w-52 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-sidebar-border">
              <span className="text-[0.65rem] font-semibold text-sidebar-foreground/50 uppercase tracking-widest">
                Explorer
              </span>
              {isFounder && (
                <button onClick={() => setShowNew(true)} title="New File"
                  className="p-0.5 rounded hover:bg-sidebar-accent/30 text-sidebar-foreground/50 hover:text-sidebar-foreground">
                  <Plus className="size-3.5" />
                </button>
              )}
            </div>

            <AnimatePresence>
              {showNew && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="px-3 py-2 border-b border-sidebar-border">
                    <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") createFile();
                        if (e.key === "Escape") { setShowNew(false); setNewName(""); }
                      }}
                      placeholder="filename.tsx"
                      className="w-full bg-sidebar-accent/20 border border-sidebar-border rounded px-2 py-1 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/40 outline-none focus:border-primary" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto py-1">
              {files.length === 0 ? (
                <p className="px-3 py-4 text-xs text-sidebar-foreground/40">
                  {isFounder ? "No files. Click + to create one." : "No files yet."}
                </p>
              ) : (
                files.map(file => (
                  <div key={file.id} onClick={() => openFile(file)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 cursor-pointer group transition-colors",
                      activeFile?.id === file.id
                        ? "bg-primary/15 text-sidebar-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/15 hover:text-sidebar-foreground"
                    )}>
                    <File className={cn("size-3.5 flex-shrink-0", langColor(file.language))} />
                    <span className="flex-1 text-xs truncate">{file.name}</span>
                    <span className="text-[0.6rem] text-sidebar-foreground/30 group-hover:hidden">
                      {file.language !== "text" ? file.language : ""}
                    </span>
                    {isFounder && (
                      <button onClick={e => deleteFile(file, e)}
                        className="hidden group-hover:block p-0.5 hover:text-rose-400 transition-colors">
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Team panel */}
            {team.length > 0 && (
              <div className="border-t border-sidebar-border p-3">
                <p className="text-[0.65rem] font-semibold text-sidebar-foreground/40 uppercase tracking-widest mb-2">
                  Team ({team.length})
                </p>
                {team.slice(0, 5).map(m => (
                  <div key={m.user_id} className="flex items-center gap-2 py-1">
                    <div className="size-5 rounded-full bg-gradient-to-br from-secondary to-accent flex items-center justify-center text-white text-[0.5rem] font-bold flex-shrink-0">
                      {m.first_name[0]}
                    </div>
                    <span className="text-xs text-sidebar-foreground/60 truncate">
                      {m.first_name} {m.last_name}
                    </span>
                    <span className="size-1.5 rounded-full bg-emerald-400 ml-auto" title="Active" />
                  </div>
                ))}
              </div>
            )}

            {/* Sidebar toggle */}
            <button onClick={() => setSide(false)}
              className="px-3 py-2 text-[0.65rem] text-sidebar-foreground/40 hover:text-sidebar-foreground border-t border-sidebar-border transition-colors text-left">
              Hide Explorer
            </button>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {!sidebarOpen && (
            <button onClick={() => setSide(true)}
              className="px-3 py-1 text-xs text-muted-foreground hover:text-foreground border-b border-border transition-colors text-left">
              Show Explorer
            </button>
          )}

          {!activeFile ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <Code2 className="size-16 text-muted-foreground/20" />
              <div>
                <p className="font-display font-bold text-lg mb-1 text-foreground">
                  {ws?.project?.title ?? "Workspace"}
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  {isFounder
                    ? "Select a file from the explorer or create a new one."
                    : "Select a file from the explorer to start editing."}
                </p>
                {isFounder && (
                  <Button variant="gradient" size="sm" onClick={() => setShowNew(true)}>
                    <Plus className="size-4" /> New File
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* Line numbers */}
              <div className="w-11 flex-shrink-0 bg-sidebar/50 border-r border-border overflow-y-auto py-3 select-none scrollbar-hide">
                {Array.from({ length: lineNums }, (_, i) => (
                  <div key={i} className="text-right pr-2.5 text-xs text-muted-foreground/40 font-mono leading-6">
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* Textarea editor */}
              <textarea
                ref={textRef}
                value={content}
                onChange={e => { setContent(e.target.value); setSaved(false); }}
                onKeyDown={handleKeyDown}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                readOnly={!isFounder && !team.find(m => m.user_id === profile?.user_id)}
                className="flex-1 bg-background text-foreground text-sm font-mono leading-6 p-3 resize-none outline-none border-none overflow-auto"
                style={{ tabSize: 2 }}
              />
            </div>
          )}

          {/* Status bar */}
          <div className="flex items-center justify-between px-4 py-1 bg-sidebar border-t border-sidebar-border text-xs text-sidebar-foreground/50 flex-shrink-0">
            <div className="flex items-center gap-4">
              {activeFile && <span className={langColor(activeFile.language)}>{activeFile.language}</span>}
              <span>UTF-8</span>
            </div>
            <div className="flex items-center gap-4">
              {activeFile && (
                <>
                  <span>Ln {lineNums}</span>
                  <span>{content.length} chars</span>
                </>
              )}
              <span className="text-emerald-400 font-medium">Live</span>
            </div>
          </div>

          {/* Terminal */}
          <AnimatePresence>
            {termOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: 180 }} exit={{ height: 0 }}
                className="border-t border-sidebar-border bg-sidebar overflow-hidden flex flex-col flex-shrink-0">
                <div className="flex items-center justify-between px-4 py-1.5 border-b border-sidebar-border">
                  <span className="text-[0.65rem] font-semibold text-sidebar-foreground/50 uppercase tracking-wider">Terminal</span>
                  <button onClick={() => setTerm(false)}>
                    <X className="size-3.5 text-sidebar-foreground/40 hover:text-sidebar-foreground" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 font-mono text-xs text-sidebar-foreground/80 space-y-0">
                  {termLines.map((line, i) => (
                    <div key={i} className={cn("leading-5", line.startsWith("$") && "text-primary")}>
                      {line || "\u00A0"}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 border-t border-sidebar-border">
                  <span className="text-primary font-mono text-xs">$</span>
                  <input
                    value={termInput}
                    onChange={e => setTermInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { runTerminal(termInput); } }}
                    placeholder="Type a command..."
                    className="flex-1 bg-transparent text-xs font-mono text-sidebar-foreground outline-none placeholder:text-sidebar-foreground/30"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
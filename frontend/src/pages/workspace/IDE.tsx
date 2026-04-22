import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Play, Save, Terminal, X, ChevronLeft, 
  FileJson, FileCode, FileText, FileImage, Sparkles, Send, Bot, UserCircle, Code2, Loader2
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";

interface WsFile { id: string; name: string; content: string; language: string; }
interface AIChatMessage { id: number; role: "user" | "ai"; content: string; isCode?: boolean; }

export default function WorkspaceIDE() {
  const { projectId } = useParams<{ projectId: string }>();
  const { profile } = useAuth(); // Need this to record WHO did the action
  
  // State
  const [project, setProject] = useState<any>(null);
  const [files, setFiles] = useState<WsFile[]>([]);
  const [activeFile, setActiveFile] = useState<WsFile | null>(null);
  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const stateRef = useRef({ content, activeFile });

  // File Creation State
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  // UI State
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [termHistory, setTermHistory] = useState(["[TechIT Cloud Engine v2.0 initialized]", "Waiting for commands..."]);
  const [termInput, setTermInput] = useState("");
  const termRef = useRef<HTMLDivElement>(null);

  // AI State
  const [aiMessages, setAiMessages] = useState<AIChatMessage[]>([{ id: 1, role: "ai", content: "TechIT Co-Pilot online. How can I assist your build today?" }]);
  const [aiInput, setAiInput] = useState("");
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Sync ref for safe saving without memory leaks
  useEffect(() => {
    stateRef.current = { content, activeFile };
  }, [content, activeFile]);

  // Load Data
  useEffect(() => {
    async function loadWorkspaceData() {
      if (!projectId) return;
      const { data: projData } = await supabase.from("projects").select("title").eq("id", projectId).single();
      if (projData) setProject(projData);

      // Order by updated_at so the most recently touched files are on top
      const { data: fileData } = await supabase.from("workspace_files").select("*").eq("project_id", projectId).order("updated_at", { ascending: false });
      if (fileData) {
        setFiles(fileData);
        if (fileData.length > 0) {
          setActiveFile(fileData[0]);
          setContent(fileData[0].content || "");
        }
      }
    }
    loadWorkspaceData();
  }, [projectId]);

  // File Management
  const handleSave = async () => {
    const current = stateRef.current;
    if (!current.activeFile || !profile?.user_id) return;
    setIsSaving(true);
    
    // IMPORTANT: Update timestamp and who saved it so Activity Feed works
    await supabase.from("workspace_files").update({ 
      content: current.content,
      updated_at: new Date().toISOString(),
      last_updated_by: profile.user_id 
    }).eq("id", current.activeFile.id);
    
    setIsDirty(false);
    setIsSaving(false);
    addTermLine(`> Saved ${current.activeFile.name} successfully.`);
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim() || !projectId || !profile?.user_id) return;
    
    setIsCreatingFile(false);
    
    // IMPORTANT: Record creation time and creator for Activity Feed
    const now = new Date().toISOString();
    const { data, error } = await supabase.from("workspace_files").insert({
      project_id: projectId,
      name: newFileName.trim(),
      content: "",
      language: newFileName.includes('.') ? newFileName.split('.').pop() : 'plaintext',
      last_updated_by: profile.user_id,
      created_at: now,
      updated_at: now
    }).select().single();

    if (data && !error) {
      setFiles([data, ...files]);
      setActiveFile(data);
      setContent("");
      setNewFileName("");
      addTermLine(`> Created new file: ${data.name}`);
    }
  };

  const openFile = (file: WsFile) => {
    setActiveFile(file);
    setContent(file.content || "");
    setIsDirty(false);
  };

  // Keyboard Shortcuts (Memory Leak Free)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { 
        e.preventDefault(); 
        handleSave(); 
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helpers
  const addTermLine = (line: string) => {
    setTermHistory(p => [...p, line]);
    setTimeout(() => termRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const handleAiSubmit = () => {
    if (!aiInput.trim()) return;
    setAiMessages(prev => [...prev, { id: Date.now(), role: "user", content: aiInput }]);
    setAiInput("");
    setIsAiThinking(true);
    
    setTimeout(() => {
      setAiMessages(prev => [...prev, { id: Date.now(), role: "ai", content: "Analysis complete. Optimization applied." }]);
      setIsAiThinking(false);
    }, 1500);
  };

  const getFileIcon = (filename: string) => {
    if (filename.endsWith('.js') || filename.endsWith('.ts') || filename.endsWith('.tsx')) return <FileCode className="size-4 text-yellow-500" />;
    if (filename.endsWith('.json')) return <FileJson className="size-4 text-emerald-500" />;
    if (filename.endsWith('.css')) return <FileCode className="size-4 text-blue-400" />;
    return <FileText className="size-4 text-muted-foreground" />;
  };

  return (
    <div className="h-screen w-full bg-[#050505] text-foreground font-sans flex flex-col overflow-hidden">
      
      {/* HEADER */}
      <header className="h-14 bg-[#0a0a0a] border-b border-white/5 flex items-center justify-between px-4 z-50 shadow-md">
        <div className="flex items-center gap-6">
          <Link to={`/workspace/${projectId}`} className="flex items-center justify-center size-8 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white transition-colors">
            <ChevronLeft className="size-4" />
          </Link>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{project?.title || "WORKSPACE"}</span>
            <span className="text-sm font-bold text-white flex items-center gap-2">
              {activeFile ? <>{getFileIcon(activeFile.name)} {activeFile.name}</> : "No file open"}
              {isDirty && <span className="size-1.5 rounded-full bg-amber-500" />}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={!isDirty || isSaving} className="h-9 px-4 rounded-xl text-xs font-bold border-white/10 bg-[#111] hover:bg-white/5">
            {isSaving ? <Loader2 className="size-3.5 animate-spin mr-2" /> : <Save className="size-3.5 mr-2" />} 
            Save File
          </Button>
          <Button variant="gradient" size="sm" onClick={() => setAiPanelOpen(!aiPanelOpen)} className="h-9 px-4 rounded-xl text-xs font-bold shadow-lg shadow-primary/20">
            <Sparkles className="size-3.5 mr-2" /> Co-Pilot
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden p-2 gap-2 bg-[#050505]">
        
        {/* FILE TREE */}
        <aside className="w-64 bg-[#0a0a0a] rounded-2xl border border-white/5 flex flex-col overflow-hidden shadow-xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Project Files</span>
            <button onClick={() => setIsCreatingFile(true)} className="p-1 rounded-md hover:bg-white/10 text-white transition-colors" title="New File">
              <Plus className="size-4" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {isCreatingFile && (
              <form onSubmit={handleCreateFile} className="flex items-center gap-2 px-3 py-1.5 bg-[#111] border border-primary/30 rounded-lg">
                <FileText className="size-4 text-primary" />
                <input 
                  autoFocus
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  onBlur={() => { if(!newFileName) setIsCreatingFile(false); }}
                  placeholder="filename.ext"
                  className="w-full bg-transparent text-sm outline-none text-white"
                />
              </form>
            )}
            
            {files.map(f => (
              <div 
                key={f.id} 
                onClick={() => openFile(f)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-sm cursor-pointer transition-all", 
                  activeFile?.id === f.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                {getFileIcon(f.name)}
                <span className="truncate">{f.name}</span>
                {isDirty && activeFile?.id === f.id && <div className="ml-auto size-1.5 rounded-full bg-primary" />}
              </div>
            ))}
            
            {files.length === 0 && !isCreatingFile && (
              <div className="p-4 text-center mt-10">
                 <Code2 className="size-8 mx-auto mb-2 text-white/10" />
                 <p className="text-xs text-muted-foreground">Click the + icon to create your first file.</p>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN CANVAS */}
        <main className="flex-1 flex flex-col gap-2 min-w-0">
          <div className="flex-1 bg-[#0a0a0a] rounded-2xl border border-white/5 flex overflow-hidden shadow-xl relative">
            {activeFile ? (
              <>
                <div className="w-12 bg-[#050505]/50 border-r border-white/5 flex flex-col items-center py-4 text-xs font-mono text-muted-foreground/50 select-none">
                  {Array.from({length: 50}).map((_, i) => <div key={i} className="h-6 leading-6">{i+1}</div>)}
                </div>
                <textarea 
                  value={content}
                  onChange={e => { setContent(e.target.value); setIsDirty(true); }}
                  spellCheck={false}
                  placeholder="// Start coding here..."
                  className="flex-1 bg-transparent text-sm font-mono p-4 leading-6 outline-none resize-none text-white custom-scrollbar"
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground/50">
                Select or create a file to start building.
              </div>
            )}
          </div>

          {/* Floating Terminal */}
          {terminalOpen && (
            <div className="h-48 bg-[#0a0a0a] rounded-2xl border border-white/5 flex flex-col shadow-xl">
              <div className="px-4 py-2 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2"><Terminal className="size-3" /> Console Output</span>
                <button onClick={() => setTerminalOpen(false)} className="text-muted-foreground hover:text-white"><X className="size-3" /></button>
              </div>
              <div className="flex-1 p-4 font-mono text-xs text-muted-foreground overflow-y-auto">
                {termHistory.map((line, i) => (
                  <div key={i} className={cn("mb-1", line.includes("Saved") || line.includes("Created") ? "text-emerald-500" : "")}>{line}</div>
                ))}
                <div className="flex gap-2 mt-2">
                  <span className="text-primary">~</span>
                  <input 
                    type="text" 
                    value={termInput}
                    onChange={e => setTermInput(e.target.value)}
                    onKeyDown={e => {
                      if(e.key === 'Enter' && termInput) {
                        addTermLine(`> ${termInput}`);
                        if(termInput === 'clear') setTermHistory([]);
                        else addTermLine(`Command not found: ${termInput}`);
                        setTermInput("");
                      }
                    }}
                    className="flex-1 bg-transparent outline-none text-white" 
                  />
                </div>
                <div ref={termRef} />
              </div>
            </div>
          )}
        </main>

        {/* AI CO-PILOT */}
        <AnimatePresence>
          {aiPanelOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }} 
              animate={{ width: 340, opacity: 1 }} 
              exit={{ width: 0, opacity: 0 }}
              className="bg-[#0a0a0a] rounded-2xl border border-white/5 flex flex-col overflow-hidden shadow-2xl relative"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-primary/5">
                <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="size-4" /> AI Engine
                </span>
                <button onClick={() => setAiPanelOpen(false)} className="text-primary hover:text-white"><X className="size-4" /></button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {aiMessages.map(msg => (
                  <div key={msg.id} className="flex gap-3">
                    <div className={cn("size-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md", msg.role === 'ai' ? "bg-primary text-white" : "bg-[#111] border border-white/10 text-white")}>
                      {msg.role === 'ai' ? <Bot className="size-4" /> : <UserCircle className="size-4" />}
                    </div>
                    <div className="flex-1 space-y-2 mt-1.5">
                      <p className="text-sm text-foreground leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isAiThinking && (
                  <div className="flex gap-3">
                     <div className="size-8 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0 shadow-md"><Bot className="size-4" /></div>
                     <div className="flex-1 flex items-center gap-2 text-xs font-bold text-primary mt-1.5"><Loader2 className="size-3.5 animate-spin" /> Processing request...</div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[#111] border-t border-white/5">
                <div className="flex gap-2 bg-[#050505] border border-white/10 p-1.5 rounded-2xl focus-within:border-primary/50 transition-colors">
                  <input 
                    value={aiInput}
                    onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => { if(e.key === 'Enter') handleAiSubmit(); }}
                    placeholder="Ask AI to write code..."
                    className="flex-1 bg-transparent px-3 text-sm outline-none text-white placeholder:text-muted-foreground"
                  />
                  <Button size="icon" variant="gradient" onClick={handleAiSubmit} disabled={!aiInput.trim() || isAiThinking} className="rounded-xl flex-shrink-0">
                    <Send className="size-3.5" />
                  </Button>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
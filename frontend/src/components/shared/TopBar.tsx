import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, MessageCircle, Menu, X, Zap } from "lucide-react";
import { cn, initials, avatarGradient } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { useCredits } from "../../contexts/CreditContext";
import { supabase } from "../../lib/supabase";
import Sidebar from "./Sidebar";

interface TopBarProps { title?: string; action?: React.ReactNode; }

export default function TopBar({ title, action }: TopBarProps) {
  const { profile } = useAuth();
  const { balance } = useCredits();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : "User";

  useEffect(() => {
    if (!profile?.user_id) return;
    // Load unread count
    supabase.from("notifications").select("id", { count: "exact", head: true })
      .eq("user_id", profile.user_id).eq("read", false)
      .then(({ count }) => setUnreadNotifs(count ?? 0));

    // Realtime new notifications
    const ch = supabase.channel(`notif-badge-${profile.user_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.user_id}` },
        () => setUnreadNotifs(n => n + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.user_id]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (search.trim()) { navigate(`/feed?q=${encodeURIComponent(search.trim())}`); setSearch(""); }
  }

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full z-50"><Sidebar /></div>
        </div>
      )}
      <header className="sticky top-0 z-30 flex items-center gap-3 px-4 lg:px-6 py-3 bg-background/80 backdrop-blur-xl border-b border-border flex-shrink-0">
        <button className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors" onClick={() => setMobileOpen(o => !o)}>
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        {title ? (
          <h1 className="font-display font-bold text-lg text-foreground truncate">{title}</h1>
        ) : (
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 rounded-xl bg-muted/50 border border-border px-3 py-2 max-w-md">
            <Search className="size-4 text-muted-foreground flex-shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground min-w-0" />
          </form>
        )}
        <div className="flex items-center gap-1.5 ml-auto">
          <Link to="/wallet" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-medium hover:bg-primary/15 transition-colors">
            <Zap className="size-3.5" />{balance.toLocaleString()}
          </Link>
          <Link to="/messages" className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <MessageCircle className="size-5" />
          </Link>
          <Link to="/notifications" onClick={() => setUnreadNotifs(0)} className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Bell className="size-5" />
            {unreadNotifs > 0 && (
              <span className="absolute top-1 right-1 size-4 rounded-full bg-destructive text-white text-[0.55rem] font-bold flex items-center justify-center">
                {unreadNotifs > 9 ? "9+" : unreadNotifs}
              </span>
            )}
          </Link>
          {action}
          <Link to="/settings">
            <div className={cn("size-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold hover:ring-2 hover:ring-primary/40 transition-all overflow-hidden", avatarGradient(fullName))}>
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={fullName} className="size-full object-cover" />
                : initials(fullName)}
            </div>
          </Link>
        </div>
      </header>
    </>
  );
}

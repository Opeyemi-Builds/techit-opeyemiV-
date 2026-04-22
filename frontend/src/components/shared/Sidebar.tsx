import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import { cn, initials, avatarGradient, roleColor } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { useCredits } from "../../contexts/CreditContext";
import { supabase } from "../../lib/supabase";
import {
  LayoutDashboard, Rss, Bell, Wallet, Settings,
  LogOut, Zap, ChevronLeft, ChevronRight, Users,
  Code2, UserPlus, Lightbulb, Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";

// Mapping navigation items to user roles so nobody gets a broken screen
const navByRole: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; href: string; isWorkspace?: boolean }[]> = {
  founder: [
    { label: "Dashboard",             icon: LayoutDashboard, href: "/dashboard"       },
    { label: "Social Feed",           icon: Rss,             href: "/feed"            },
    { label: "People",                icon: Users,           href: "/people"          },
    { label: "Workspaces",            icon: Code2,           href: "/workspaces", isWorkspace: true },
    { label: "Idea Incubation Hub",   icon: Lightbulb,       href: "/incubation-hub"  },
    { label: "Find Team",             icon: UserPlus,        href: "/matches"         },
    { label: "Notifications",         icon: Bell,            href: "/notifications"   },
    { label: "Wallet",                icon: Wallet,          href: "/wallet"          },
  ],
  collaborator: [
    { label: "Dashboard",             icon: LayoutDashboard, href: "/collaborator/dashboard" },
    { label: "Social Feed",           icon: Rss,             href: "/feed"                   },
    { label: "People",                icon: Users,           href: "/people"                 },
    { label: "Workspaces",            icon: Code2,           href: "/workspaces", isWorkspace: true },
    { label: "Idea Incubation Hub",   icon: Lightbulb,       href: "/incubation-hub"         },
    { label: "Notifications",         icon: Bell,            href: "/notifications"          },
  ],
  investor: [
    { label: "Dashboard",             icon: LayoutDashboard, href: "/investor/dashboard"     },
    { label: "Social Feed",           icon: Rss,             href: "/feed"                   },
    { label: "People",                icon: Users,           href: "/people"                 },
    { label: "Workspaces",            icon: Code2,           href: "/workspaces", isWorkspace: true },
    { label: "Idea Incubation Hub",   icon: Lightbulb,       href: "/incubation-hub"         },
    { label: "Notifications",         icon: Bell,            href: "/notifications"          },
    { label: "Wallet",                icon: Wallet,          href: "/wallet"                 },
  ],
  organisation: [
    { label: "Dashboard",             icon: LayoutDashboard, href: "/org/dashboard"          },
    { label: "Social Feed",           icon: Rss,             href: "/feed"                   },
    { label: "People",                icon: Users,           href: "/people"                 },
    { label: "Workspaces",            icon: Code2,           href: "/workspaces", isWorkspace: true },
    { label: "Idea Incubation Hub",   icon: Lightbulb,       href: "/incubation-hub"         },
    { label: "Notifications",         icon: Bell,            href: "/notifications"          },
    { label: "Wallet",                icon: Wallet,          href: "/wallet"                 },
  ],
};

export default function Sidebar() {
  const { profile, signOut, loading: authLoading } = useAuth();
  const { balance = 0 } = useCredits(); 
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Checks the DB for files that have been updated since your last project visit
  const syncWorkspaceActivity = async () => {
    if (!profile?.user_id) return;
    try {
      const { data: colabs } = await supabase.from("project_collaborators").select("project_id, last_viewed_at").eq("user_id", profile.user_id);
      const collabMap = new Map(colabs?.map(c => [c.project_id, c.last_viewed_at]) || []);
      const collabIds = Array.from(collabMap.keys());

      let query = supabase.from("projects").select(`id, last_viewed_at, founder_id, workspace_files(updated_at)`);
      if (collabIds.length > 0) {
        query = query.or(`founder_id.eq.${profile.user_id},id.in.(${collabIds.join(',')})`);
      } else {
        query = query.eq('founder_id', profile.user_id);
      }

      const { data: projects } = await query;
      let total = 0;
      projects?.forEach(proj => {
        const isOwner = proj.founder_id === profile.user_id;
        const lastSeen = isOwner ? proj.last_viewed_at : collabMap.get(proj.id);
        const count = proj.workspace_files?.filter((f: any) => new Date(f.updated_at) > new Date(lastSeen || 0)).length || 0;
        total += count;
      });
      setUnreadCount(total);
    } catch (err) {
      console.error("Activity sync failed:", err);
    }
  };

  useEffect(() => {
    // Stop here if the user isn't logged in yet
    if (authLoading || !profile?.user_id) return;

    syncWorkspaceActivity();

    // Fix: We define the channel name uniquely per session to avoid collision
    const channelName = `sidebar-rt-${profile.user_id}`;
    
    // THE FIX: Chaining .on() BEFORE .subscribe() in one clean movement
    const channel = supabase.channel(channelName)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'workspace_files' }, 
        () => {
          syncWorkspaceActivity();
        }
      )
      .subscribe();

    // Clean up: Kill the connection when the component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.user_id, authLoading]);

  // Don't render a broken sidebar while waiting for the profile
  if (authLoading && !profile) return null;

  const role = profile?.role || "founder";
  const nav = navByRole[role] || navByRole.founder; 
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : "Techit User";
  const rc = roleColor(role);

  return (
    <aside className={cn(
      "h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 fixed left-0 top-0 z-40",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Brand Header */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-sidebar-border flex-shrink-0", collapsed && "justify-center px-0")}>
        <Link to="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
            <Zap className="size-4 text-white" />
          </div>
          {!collapsed && <div className="min-w-0 font-display font-bold text-sm text-sidebar-foreground tracking-tighter uppercase">TECHIT</div>}
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scrollbar">
        {nav.map(({ label, icon: Icon, href, isWorkspace }) => (
          <NavLink key={href} to={href}
            className={({ isActive }) => cn(
              "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
              isActive ? "bg-primary/15 text-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground",
              collapsed && "justify-center px-0 py-3"
            )}>
            <div className="flex items-center gap-3 truncate">
              <Icon className="size-4 flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </div>

            {/* REAL BADGE: Only appears if there is actual new code to look at */}
            {isWorkspace && unreadCount > 0 && !collapsed && (
              <span className="px-1.5 py-0.5 bg-primary text-black text-[9px] font-black rounded-lg animate-pulse">
                {unreadCount}
              </span>
            )}
            
            {/* Notification dot for the collapsed view */}
            {isWorkspace && unreadCount > 0 && collapsed && (
              <div className="absolute top-2 right-2 size-2 bg-primary rounded-full border-2 border-sidebar" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer Section: Credit & Profile */}
      <div className="border-t border-sidebar-border px-2 py-3 space-y-0.5 bg-sidebar/50">
        {!collapsed && (
          <div className="px-3 py-2">
            <span className="text-[9px] font-bold uppercase text-muted-foreground tracking-widest">Credit</span>
            <div className="text-xs font-mono text-primary font-bold">{balance.toLocaleString()} cr</div>
          </div>
        )}

        <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:border-sidebar-border transition-all", collapsed && "justify-center px-0")}>
          <div className={cn("size-8 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold shadow-sm", avatarGradient(fullName))}>
            {profile?.avatar_url ? <img src={profile.avatar_url} className="size-full rounded-xl object-cover" /> : initials(fullName)}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{profile?.first_name || "User"}</p>
              <p className={cn("text-[0.6rem] font-bold uppercase tracking-wider", rc.text)}>{role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={() => signOut().then(() => navigate("/login"))} className="p-1.5 text-sidebar-foreground/40 hover:text-destructive transition-colors">
              <LogOut className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Sidebar Collapse Toggle */}
      <button onClick={() => setCollapsed(c => !c)} className="absolute -right-3 top-20 size-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-sidebar-foreground/60 shadow-md hover:text-primary transition-all">
        {collapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
      </button>
    </aside>
  );
}
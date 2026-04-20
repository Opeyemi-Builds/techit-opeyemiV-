import { NavLink, Link, useNavigate } from "react-router-dom";
import { cn, initials, avatarGradient, roleColor } from "../../lib/utils";
import { useAuth } from "../../contexts/AuthContext";
import { useCredits } from "../../contexts/CreditContext";
import {
  LayoutDashboard, Rss, MessageCircle, Bell, Wallet, Settings,
  LogOut, Zap, ChevronLeft, ChevronRight, Rocket, Users,
  TrendingUp, Building2, Briefcase, Star, Target, PieChart,
  Trophy, Search, Code2, UserPlus, Globe,
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

const navByRole: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; href: string }[]> = {
  founder: [
    { label: "Dashboard",      icon: LayoutDashboard, href: "/dashboard"       },
    { label: "Social Feed",    icon: Rss,             href: "/feed"            },
    { label: "People",         icon: Users,           href: "/people"          },
    { label: "Projects",       icon: Globe,           href: "/projects"        },
    { label: "Submit Idea",    icon: Rocket,          href: "/idea-submit"     },
    { label: "Find Team",      icon: UserPlus,        href: "/matches"         },
    { label: "Incubation Hub", icon: Trophy,          href: "/incubation-hub"  },
    { label: "Messages",       icon: MessageCircle,   href: "/messages"        },
    { label: "Notifications",  icon: Bell,            href: "/notifications"   },
    { label: "Wallet",         icon: Wallet,          href: "/wallet"          },
  ],
  collaborator: [
    { label: "Dashboard",     icon: LayoutDashboard, href: "/collaborator/dashboard"     },
    { label: "Social Feed",   icon: Rss,             href: "/feed"                       },
    { label: "People",        icon: Users,           href: "/people"                     },
    { label: "Projects",      icon: Globe,           href: "/projects"                   },
    { label: "Opportunities", icon: Target,          href: "/collaborator/opportunities" },
    { label: "My Work",       icon: Briefcase,       href: "/collaborator/work"          },
    { label: "Performance",   icon: TrendingUp,      href: "/collaborator/performance"   },
    { label: "Earnings",      icon: Wallet,          href: "/collaborator/earnings"      },
    { label: "Messages",      icon: MessageCircle,   href: "/messages"                   },
    { label: "Notifications", icon: Bell,            href: "/notifications"              },
  ],
  investor: [
    { label: "Dashboard",     icon: LayoutDashboard, href: "/investor/dashboard" },
    { label: "Social Feed",   icon: Rss,             href: "/feed"              },
    { label: "People",        icon: Users,           href: "/people"            },
    { label: "Projects",      icon: Globe,           href: "/projects"          },
    { label: "Deal Pipeline", icon: Target,          href: "/investor/pipeline"  },
    { label: "Portfolio",     icon: PieChart,        href: "/investor/portfolio" },
    { label: "Messages",      icon: MessageCircle,   href: "/messages"           },
    { label: "Notifications", icon: Bell,            href: "/notifications"      },
    { label: "Wallet",        icon: Wallet,          href: "/wallet"             },
  ],
  organisation: [
    { label: "Dashboard",     icon: LayoutDashboard, href: "/org/dashboard"  },
    { label: "Social Feed",   icon: Rss,             href: "/feed"           },
    { label: "People",        icon: Users,           href: "/people"         },
    { label: "Projects",      icon: Globe,           href: "/projects"       },
    { label: "Challenges",    icon: Trophy,          href: "/org/challenges" },
    { label: "Talent Search", icon: Search,          href: "/org/talent"     },
    { label: "Messages",      icon: MessageCircle,   href: "/messages"       },
    { label: "Notifications", icon: Bell,            href: "/notifications"  },
    { label: "Wallet",        icon: Wallet,          href: "/wallet"         },
  ],
};

const bottomLinks = [
  { label: "Settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const { balance } = useCredits();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [pendingConnections, setPending] = useState(0);

  const role = profile?.role ?? "founder";
  const nav = navByRole[role] ?? navByRole.founder;
  const fullName = profile ? `${profile.first_name} ${profile.last_name}` : "User";
  const rc = roleColor(role);

  useEffect(() => {
    if (!profile?.user_id) return;
    loadBadges();

    // Realtime notification badge
    const ch = supabase.channel(`sidebar-${profile.user_id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${profile.user_id}` },
        () => setUnreadNotifs(n => n + 1))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" },
        () => setUnreadMessages(n => n + 1))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.user_id]);

  async function loadBadges() {
    const [{ count: notifCount }, { count: connCount }] = await Promise.all([
      supabase.from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", profile!.user_id).eq("read", false),
      supabase.from("connections").select("id", { count: "exact", head: true })
        .eq("to_id", profile!.user_id).eq("status", "pending"),
    ]);
    setUnreadNotifs(notifCount ?? 0);
    setPending(connCount ?? 0);
  }

  function getBadge(href: string): number {
    if (href === "/notifications") return unreadNotifs;
    if (href === "/people") return pendingConnections;
    return 0;
  }

  return (
    <aside className={cn(
      "h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 fixed left-0 top-0 z-40",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-sidebar-border flex-shrink-0", collapsed && "justify-center px-0")}>
        <Link to={`/${role === "founder" ? "dashboard" : role === "collaborator" ? "collaborator/dashboard" : role === "investor" ? "investor/dashboard" : "org/dashboard"}`} className="flex items-center gap-3 min-w-0">
          <div className="size-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
            <Zap className="size-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-display font-bold text-sm leading-none text-sidebar-foreground">TECHIT</div>
              <div className="font-mono text-[0.55rem] text-primary tracking-widest leading-none mt-0.5">NETWORK</div>
            </div>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map(({ label, icon: Icon, href }) => {
          const badge = getBadge(href);
          return (
            <NavLink key={href} to={href}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground",
                collapsed && "justify-center px-0 py-3"
              )}>
              <Icon className="size-4 flex-shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{label}</span>}
              {badge > 0 && (
                <span className={cn(
                  "rounded-full bg-primary text-white text-[0.6rem] font-bold flex items-center justify-center flex-shrink-0",
                  collapsed ? "absolute top-1.5 right-1.5 size-4" : "size-5"
                )}>
                  {badge > 9 ? "9+" : badge}
                </span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-sidebar-foreground text-sidebar text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-sidebar-border px-2 py-3 space-y-0.5 flex-shrink-0">
        {/* Credits */}
        {!collapsed && (
          <NavLink to="/wallet" className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-sidebar-accent/20 transition-colors group">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-mono text-primary font-semibold">{balance.toLocaleString()} cr</span>
            </div>
          </NavLink>
        )}

        {bottomLinks.map(({ label, icon: Icon, href }) => (
          <NavLink key={href} to={href}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              isActive ? "bg-primary/15 text-primary" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/20 hover:text-sidebar-foreground",
              collapsed && "justify-center px-0 py-3"
            )}>
            <Icon className="size-4 flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {/* User */}
        <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl mt-1", collapsed && "justify-center px-0")}>
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={fullName} className="size-7 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className={cn("size-7 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0", avatarGradient(fullName))}>
              {initials(fullName)}
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">{profile?.first_name} {profile?.last_name}</p>
              <p className={cn("text-[0.6rem] font-semibold uppercase", rc.text)}>{role}</p>
            </div>
          )}
          {!collapsed && (
            <button onClick={() => signOut().then(() => navigate("/"))}
              className="p-1.5 rounded-lg hover:bg-destructive/20 text-sidebar-foreground/40 hover:text-destructive transition-colors flex-shrink-0"
              title="Sign out">
              <LogOut className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Collapse button */}
      <button onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-20 size-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-muted transition-all shadow-sm">
        {collapsed ? <ChevronRight className="size-3" /> : <ChevronLeft className="size-3" />}
      </button>
    </aside>
  );
}


import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Bell, CheckCheck, Users, MessageCircle,
  Zap, Heart, Star, Check, Info,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Badge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { cn, timeAgo } from "../../lib/utils";

interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
}

type BadgeVariant = "violet" | "cyan" | "teal" | "rose" | "amber" | "default" | "emerald" | "outline";

const TYPE_CONFIG: Record<string, {
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  badge: BadgeVariant;
}> = {
  collab_request: { Icon: Users,          color: "bg-violet-500/10 border-violet-500/20 text-violet-400", badge: "violet" },
  message:        { Icon: MessageCircle,  color: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",       badge: "cyan"   },
  credit:         { Icon: Zap,            color: "bg-teal-500/10 border-teal-500/20 text-teal-400",       badge: "teal"   },
  like:           { Icon: Heart,          color: "bg-rose-500/10 border-rose-500/20 text-rose-400",       badge: "rose"   },
  comment:        { Icon: MessageCircle,  color: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",       badge: "cyan"   },
  match:          { Icon: Star,           color: "bg-amber-500/10 border-amber-500/20 text-amber-400",    badge: "amber"  },
  system:         { Icon: Info,           color: "bg-muted border-border text-muted-foreground",          badge: "default"},
};

const FILTERS = ["all", "collab_request", "message", "credit", "like", "system"];
const FILTER_LABELS: Record<string, string> = {
  all: "All",
  collab_request: "Requests",
  message: "Messages",
  credit: "Credits",
  like: "Likes",
  system: "System",
};

export default function Notifications() {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (profile?.user_id) loadNotifications();
  }, [profile?.user_id]);

  // Realtime
  useEffect(() => {
    if (!profile?.user_id) return;
    const channel = supabase
      .channel(`notifs-${profile.user_id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `user_id=eq.${profile.user_id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as AppNotification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.user_id]);

  async function loadNotifications() {
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile!.user_id)
      .order("created_at", { ascending: false })
      .limit(60);
    setNotifications(data ?? []);
    setLoading(false);
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }

  async function markAllRead() {
    await supabase.from("notifications").update({ read: true })
      .eq("user_id", profile!.user_id).eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  const unread = notifications.filter(n => !n.read).length;
  const filtered = filter === "all"
    ? notifications
    : notifications.filter(n => n.type === filter);

  return (
    <DashboardLayout title="Notifications">
      <div className="max-w-2xl mx-auto space-y-5 page-enter">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            <h2 className="font-display font-bold text-foreground">Notifications</h2>
            {unread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-white text-xs font-bold">
                {unread}
              </span>
            )}
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="gap-1.5 text-xs">
              <CheckCheck className="size-4" /> Mark all read
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all flex-shrink-0",
                filter === f
                  ? "bg-primary text-white border-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {FILTER_LABELS[f] ?? f}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="size-10 rounded-xl bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-48" />
                    <div className="h-3 bg-muted rounded w-64" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="font-semibold mb-1 text-foreground">No notifications yet</p>
            <p className="text-sm text-muted-foreground">
              When something happens, you will see it here.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
              const { Icon } = cfg;
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => !n.read && markRead(n.id)}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-2xl border cursor-pointer transition-all",
                    n.read
                      ? "bg-card border-border hover:border-primary/20"
                      : "bg-primary/3 border-primary/15 hover:border-primary/30"
                  )}
                >
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
                    cfg.color
                  )}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      <Badge variant={cfg.badge}>
                        {FILTER_LABELS[n.type] ?? n.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                    <p className="text-xs text-muted-foreground mt-1.5">{timeAgo(n.created_at)}</p>
                  </div>
                  <div className="flex-shrink-0 mt-1">
                    {n.read ? (
                      <CheckCheck className="size-4 text-muted-foreground/30" />
                    ) : (
                      <span className="size-2.5 rounded-full bg-primary block" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

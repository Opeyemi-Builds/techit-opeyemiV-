import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

interface RealtimeCallbacks {
  onNewNotification?: (notification: Record<string, unknown>) => void;
  onNewMessage?: (message: Record<string, unknown>) => void;
  onCollabRequest?: (request: Record<string, unknown>) => void;
  onFeedPost?: (post: Record<string, unknown>) => void;
}

export function useRealtime(callbacks: RealtimeCallbacks = {}) {
  const { profile } = useAuth();
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    if (!profile?.user_id) return;

    // Notifications channel
    const notifChannel = supabase
      .channel(`user-notifications-${profile.user_id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${profile.user_id}`,
      }, (payload) => {
        callbacks.onNewNotification?.(payload.new as Record<string, unknown>);
      })
      .subscribe();

    // Collab requests channel
    const requestChannel = supabase
      .channel(`user-requests-${profile.user_id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "collab_requests",
        filter: `to_id=eq.${profile.user_id}`,
      }, (payload) => {
        callbacks.onCollabRequest?.(payload.new as Record<string, unknown>);
      })
      .subscribe();

    // Feed channel (global new posts)
    const feedChannel = supabase
      .channel("global-feed")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "posts",
      }, (payload) => {
        callbacks.onFeedPost?.(payload.new as Record<string, unknown>);
      })
      .subscribe();

    channelsRef.current = [notifChannel, requestChannel, feedChannel];

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [profile?.user_id]);
}

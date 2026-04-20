import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Send, Search, Phone, Video, MoreHorizontal,
  Paperclip, ArrowLeft, Plus, UserCircle,
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Avatar, RoleBadge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { cn, timeAgo } from "../../lib/utils";
import { useLocation } from "react-router-dom";

interface Profile {
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  role: string;
  country: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  file_urls: string[];
  created_at: string;
  sender?: Profile;
}

interface Conversation {
  id: string;
  participant_ids: string[];
  participants: Profile[];
  last_message: { content: string; created_at: string } | null;
  created_at: string;
}

async function fetchProfiles(ids: string[]): Promise<Record<string, Profile>> {
  if (!ids.length) return {};
  const { data } = await supabase
    .from("profiles")
    .select("user_id, first_name, last_name, avatar_url, role, country")
    .in("user_id", ids);
  const map: Record<string, Profile> = {};
  (data ?? []).forEach((p: Profile) => { map[p.user_id] = p; });
  return map;
}

export default function Messages() {
  const { profile } = useAuth();
  const location = useLocation();
  const initConvId = (location.state as { conversationId?: string })?.conversationId;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.user_id) loadConversations();
  }, [profile?.user_id]);

  // Open conversation from navigation state
  useEffect(() => {
    if (initConvId && conversations.length > 0) {
      const conv = conversations.find(c => c.id === initConvId);
      if (conv) selectConversation(conv);
    }
  }, [initConvId, conversations]);

  // Realtime messages for active conversation
  useEffect(() => {
    if (!active) return;
    const channel = supabase
      .channel(`messages-${active.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${active.id}`,
        },
        async (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === profile?.user_id) return; // Already added optimistically
          const profiles = await fetchProfiles([msg.sender_id]);
          const enriched = { ...msg, sender: profiles[msg.sender_id] };
          setMessages(prev => {
            if (prev.find(m => m.id === enriched.id)) return prev;
            return [...prev, enriched];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [active?.id, profile?.user_id]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversations() {
    setLoadingConvs(true);
    const { data } = await supabase
      .from("conversations")
      .select("id, participant_ids, created_at")
      .contains("participant_ids", [profile!.user_id])
      .order("created_at", { ascending: false });

    if (!data) { setLoadingConvs(false); return; }

    // Enrich each conversation with participant profiles and last message
    const allOtherIds = [
      ...new Set(
        data.flatMap((c: { participant_ids: string[] }) =>
          c.participant_ids.filter((id: string) => id !== profile!.user_id)
        )
      ),
    ];
    const profileMap = await fetchProfiles(allOtherIds);

    const enriched: Conversation[] = await Promise.all(
      data.map(async (conv: { id: string; participant_ids: string[]; created_at: string }) => {
        const participants = conv.participant_ids
          .filter((id: string) => id !== profile!.user_id)
          .map((id: string) => profileMap[id])
          .filter(Boolean);

        const { data: lastMsg } = await supabase
          .from("messages")
          .select("content, created_at")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        return { ...conv, participants, last_message: lastMsg ?? null };
      })
    );

    setConversations(enriched);
    setLoadingConvs(false);
  }

  async function selectConversation(conv: Conversation) {
    setActive(conv);
    setMessages([]);
    setMobileView("chat");
    setLoadingMsgs(true);

    const { data } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, content, file_urls, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(50);

    const rows = data ?? [];
    const senderIds = [...new Set(rows.map((m: Message) => m.sender_id))];
    const profiles = await fetchProfiles(senderIds);
    const enriched = rows.map((m: Message) => ({ ...m, sender: profiles[m.sender_id] }));

    setMessages(enriched);
    setLoadingMsgs(false);
  }

  async function sendMessage() {
    if (!newMsg.trim() || !active || sending) return;
    setSending(true);
    const text = newMsg.trim();
    setNewMsg("");

    // Optimistic update
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: active.id,
      sender_id: profile!.user_id,
      content: text,
      file_urls: [],
      created_at: new Date().toISOString(),
      sender: {
        user_id: profile!.user_id,
        first_name: profile!.first_name,
        last_name: profile!.last_name,
        avatar_url: profile!.avatar_url ?? null,
        role: profile!.role,
        country: profile!.country,
      },
    };
    setMessages(prev => [...prev, optimistic]);

    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: active.id,
        sender_id: profile!.user_id,
        content: text,
        file_urls: [],
      })
      .select("id, conversation_id, sender_id, content, file_urls, created_at")
      .single();

    if (!error && data) {
      // Replace optimistic with real
      setMessages(prev =>
        prev.map(m => m.id === optimistic.id ? { ...data, sender: optimistic.sender } : m)
      );
      // Update last message in conversation list
      setConversations(prev =>
        prev.map(c =>
          c.id === active.id
            ? { ...c, last_message: { content: text, created_at: data.created_at } }
            : c
        )
      );
    }

    setSending(false);
  }

  function getOther(conv: Conversation): Profile | null {
    return conv.participants?.[0] ?? null;
  }

  const filteredConvs = conversations.filter(c => {
    const other = getOther(c);
    if (!other) return true;
    const name = `${other.first_name} ${other.last_name}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const myName = profile ? `${profile.first_name} ${profile.last_name}` : "Me";

  return (
    <DashboardLayout title="Messages" noPadding>
      <div className="flex h-[calc(100vh-57px)] overflow-hidden">

        {/* Conversations List */}
        <div className={cn(
          "w-full sm:w-80 flex-shrink-0 border-r border-border flex flex-col bg-sidebar",
          mobileView === "chat" ? "hidden sm:flex" : "flex"
        )}>
          {/* Search */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2 border border-border">
              <Search className="size-4 text-muted-foreground flex-shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
              />
            </div>
          </div>

          {/* List */}
          {loadingConvs ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <UserCircle className="size-10 text-muted-foreground/30" />
              <p className="font-semibold text-sm text-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground">Visit a profile or find collaborators to start a conversation.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filteredConvs.map(conv => {
                const other = getOther(conv);
                if (!other) return null;
                const name = `${other.first_name} ${other.last_name}`;
                const isActive = active?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-border/50 hover:bg-muted/40 transition-colors",
                      isActive && "bg-primary/8 border-l-2 border-l-primary"
                    )}
                  >
                    <div className="relative flex-shrink-0">
                      <Avatar name={name} src={other.avatar_url ?? undefined} size="md" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-semibold text-foreground truncate">{name}</span>
                        {conv.last_message && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {timeAgo(conv.last_message.created_at)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {conv.last_message?.content ?? "Start a conversation"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className={cn(
          "flex-1 flex flex-col min-w-0",
          mobileView === "list" ? "hidden sm:flex" : "flex"
        )}>
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
              <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
                <Send className="size-7 text-muted-foreground/40" />
              </div>
              <div>
                <p className="font-display font-bold text-lg mb-1 text-foreground">Select a conversation</p>
                <p className="text-sm text-muted-foreground">Choose a conversation from the list to start chatting.</p>
              </div>
            </div>
          ) : (() => {
            const other = getOther(active);
            const otherName = other ? `${other.first_name} ${other.last_name}` : "Member";
            return (
              <>
                {/* Chat Header */}
                <div className="px-5 py-3.5 border-b border-border flex items-center gap-3 bg-card/50 flex-shrink-0">
                  <button
                    className="sm:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
                    onClick={() => setMobileView("list")}
                  >
                    <ArrowLeft className="size-5 text-foreground" />
                  </button>
                  <Avatar name={otherName} src={other?.avatar_url ?? undefined} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{otherName}</span>
                      {other?.role && <RoleBadge role={other.role} />}
                    </div>
                    <p className="text-xs text-muted-foreground">{other?.country}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                      <Phone className="size-4" />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                      <Video className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                      <p className="text-sm text-muted-foreground">
                        This is the beginning of your conversation with {otherName}.
                      </p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.sender_id === profile!.user_id;
                      const senderName = isMe ? myName : otherName;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn("flex gap-2.5", isMe && "flex-row-reverse")}
                        >
                          <Avatar
                            name={senderName}
                            src={isMe ? (profile?.avatar_url ?? undefined) : (other?.avatar_url ?? undefined)}
                            size="xs"
                          />
                          <div
                            className={cn(
                              "max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                              isMe
                                ? "bg-gradient-to-br from-primary to-secondary text-white rounded-tr-sm"
                                : "bg-muted text-foreground rounded-tl-sm"
                            )}
                          >
                            {msg.content}
                            <div className={cn(
                              "text-[0.65rem] mt-1",
                              isMe ? "text-white/60 text-right" : "text-muted-foreground"
                            )}>
                              {timeAgo(msg.created_at)}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="px-5 py-4 border-t border-border bg-card/30 flex-shrink-0">
                  <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-2xl px-4 py-2">
                    <input
                      value={newMsg}
                      onChange={e => setNewMsg(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder={`Message ${otherName}...`}
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
                    />
                    <Button
                      size="icon-sm"
                      variant="gradient"
                      onClick={sendMessage}
                      disabled={!newMsg.trim() || sending}
                      loading={sending}
                    >
                      <Send className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </DashboardLayout>
  );
}

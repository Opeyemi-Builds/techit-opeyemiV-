import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell, CheckCheck, Users, MessageCircle,
  Zap, Heart, Star, Check, Info, Send, Search, ArrowLeft
} from "lucide-react";
import DashboardLayout from "../../components/shared/DashboardLayout";
import { Card, Badge, Avatar, RoleBadge } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { cn, timeAgo } from "../../lib/utils";

// --- Types ---
interface AppNotification {
  id: string; type: string; title: string; body: string; read: boolean; created_at: string;
}
interface Profile { user_id: string; first_name: string; last_name: string; avatar_url: string | null; role: string; }
interface Message { id: string; conversation_id: string; sender_id: string; content: string; created_at: string; sender?: Profile; }
interface Conversation { id: string; participant_ids: string[]; participants: Profile[]; last_message: any; }

export default function Notifications() {
  const { profile } = useAuth();
  
  // Clean, human tab names
  const [activeTab, setActiveTab] = useState<"activity" | "messages" | "invites">("activity");
  
  // Notification State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Messaging State 
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile?.user_id) {
      loadNotifications();
      loadConversations();
    }
  }, [profile?.user_id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadNotifications() {
    const { data } = await supabase.from("notifications")
      .select("*").eq("user_id", profile!.user_id).order("created_at", { ascending: false });
    setNotifications(data ?? []);
    setUnreadCount(data?.filter(n => !n.read).length ?? 0);
  }

  async function loadConversations() {
    const { data } = await supabase.from("conversations")
      .select("id, participant_ids").contains("participant_ids", [profile!.user_id]);
    
    if (!data) return;
    setConversations(data as any); 
  }

  async function openChat(conv: Conversation) {
    setActiveChat(conv);
    const { data } = await supabase.from("messages").select("*")
      .eq("conversation_id", conv.id).order("created_at", { ascending: true });
    setMessages(data as any);
  }

  async function sendMessage() {
    if (!newMsg.trim() || !activeChat) return;
    const { data } = await supabase.from("messages").insert({
      conversation_id: activeChat.id, sender_id: profile!.user_id, content: newMsg.trim()
    }).select().single();
    if (data) {
      setMessages(prev => [...prev, data as any]);
      setNewMsg("");
    }
  }

  return (
    <DashboardLayout title="Notifications" noPadding={activeTab === "messages"}>
      <div className={cn("max-w-5xl mx-auto h-full flex flex-col", activeTab === "messages" && "max-w-none px-0")}>
        
        {/* Tabs Switcher */}
        <div className="flex items-center gap-6 border-b border-border px-6 pt-4 bg-card/50">
          <button 
            onClick={() => setActiveTab("activity")}
            className={cn("pb-3 text-sm font-bold transition-all relative", activeTab === "activity" ? "text-primary" : "text-muted-foreground")}
          >
            Activity {unreadCount > 0 && <span className="ml-1 text-[10px] bg-primary text-black px-1.5 rounded-full">{unreadCount}</span>}
            {activeTab === "activity" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          
          <button 
            onClick={() => setActiveTab("messages")}
            className={cn("pb-3 text-sm font-bold transition-all relative", activeTab === "messages" ? "text-primary" : "text-muted-foreground")}
          >
            Messages
            {activeTab === "messages" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>

          <button 
            onClick={() => setActiveTab("invites")}
            className={cn("pb-3 text-sm font-bold transition-all relative", activeTab === "invites" ? "text-primary" : "text-muted-foreground")}
          >
            Invites
            {activeTab === "invites" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            
            {/* ACTIVITY TAB */}
            {activeTab === "activity" && (
              <motion.div key="act" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-3">
                {notifications.filter(n => n.type !== 'collab_request' && n.type !== 'message').length === 0 ? (
                   <div className="text-center py-20 text-muted-foreground">
                     <Bell className="size-10 mx-auto mb-4 opacity-20" />
                     <p className="text-sm">You're all caught up. No new activity.</p>
                   </div>
                ) : (
                  notifications.filter(n => n.type !== 'collab_request' && n.type !== 'message').map(n => (
                    <Card key={n.id} className={cn("p-4 flex gap-4 items-start hover:bg-white/5 transition-colors cursor-pointer", !n.read && "bg-primary/5 border-primary/20")}>
                      <div className="size-10 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Bell className="size-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold">{n.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                        <span className="text-[10px] font-bold text-muted-foreground mt-2 block uppercase tracking-widest">{timeAgo(n.created_at)}</span>
                      </div>
                    </Card>
                  ))
                )}
              </motion.div>
            )}

            {/* INVITES TAB */}
            {activeTab === "invites" && (
              <motion.div key="inv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-3">
                 {notifications.filter(n => n.type === 'collab_request').length === 0 ? (
                   <div className="text-center py-20 text-muted-foreground">
                     <Users className="size-10 mx-auto mb-4 opacity-20" />
                     <p className="text-sm">No pending team invites.</p>
                   </div>
                ) : (
                  notifications.filter(n => n.type === 'collab_request').map(n => (
                    <Card key={n.id} className="p-5 border-violet-500/20 bg-violet-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex gap-4 items-center">
                        <div className="size-12 rounded-2xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                          <Users className="size-6 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{n.body}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:flex-shrink-0">
                        <Button size="sm" variant="gradient" className="font-bold text-xs px-6">Accept</Button>
                        <Button size="sm" variant="outline" className="font-bold text-xs px-6 border-white/10 hover:bg-white/5">Decline</Button>
                      </div>
                    </Card>
                  ))
                )}
              </motion.div>
            )}

            {/* MESSAGES TAB */}
            {activeTab === "messages" && (
              <motion.div key="msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full">
                
                {/* Left: Chat List */}
                <div className={cn("w-full md:w-80 border-r border-border bg-[#0a0a0a] flex flex-col", activeChat && "hidden md:flex")}>
                  <div className="p-4 border-b border-white/5">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground"/>
                      <input placeholder="Search chats..." className="w-full bg-[#111] border border-white/5 rounded-xl pl-9 py-2.5 text-sm outline-none focus:border-primary/50 transition-colors"/>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {conversations.length === 0 ? (
                      <div className="p-6 text-center text-muted-foreground text-sm">No active conversations.</div>
                    ) : (
                      conversations.map(c => (
                        <button key={c.id} onClick={() => openChat(c)} className={cn("w-full p-4 flex gap-3 border-b border-border/50 hover:bg-primary/5 transition-colors", activeChat?.id === c.id && "bg-primary/10 border-l-2 border-l-primary")}>
                          <Avatar name="T" size="md" />
                          <div className="text-left flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                               <p className="text-sm font-bold truncate text-foreground">Team Member</p>
                               <span className="text-[9px] text-muted-foreground">2h</span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">Click to view chat history...</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Right: Chat Window */}
                <div className={cn("flex-1 flex flex-col bg-[#050505]", !activeChat && "hidden md:flex")}>
                  {activeChat ? (
                    <>
                      {/* Chat Header */}
                      <div className="p-4 border-b border-border flex items-center gap-4 bg-[#0a0a0a]">
                        <Button variant="ghost" size="icon" onClick={() => setActiveChat(null)} className="md:hidden text-muted-foreground hover:text-white">
                          <ArrowLeft className="size-5"/>
                        </Button>
                        <Avatar name="T" size="sm" />
                        <div>
                           <span className="font-bold text-sm text-foreground block">Team Member</span>
                           <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Online</span>
                        </div>
                      </div>
                      
                      {/* Messages Area */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.length === 0 ? (
                           <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Say hi to start the conversation.</div>
                        ) : (
                          messages.map(m => (
                            <div key={m.id} className={cn("flex", m.sender_id === profile?.user_id ? "justify-end" : "justify-start")}>
                              <div className={cn("max-w-[75%] p-3 text-sm leading-relaxed", m.sender_id === profile?.user_id ? "bg-primary text-black rounded-2xl rounded-tr-sm font-medium" : "bg-[#111] text-white border border-white/5 rounded-2xl rounded-tl-sm")}>
                                {m.content}
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={bottomRef} />
                      </div>
                      
                      {/* Input Area */}
                      <div className="p-4 border-t border-border bg-[#0a0a0a]">
                        <div className="flex gap-2 bg-[#111] border border-white/5 p-1.5 rounded-2xl">
                          <input 
                            value={newMsg} 
                            onChange={e => setNewMsg(e.target.value)} 
                            onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
                            placeholder="Type your message..." 
                            className="flex-1 bg-transparent px-4 text-sm outline-none text-foreground placeholder:text-muted-foreground" 
                          />
                          <Button size="icon" variant="gradient" onClick={sendMessage} className="rounded-xl shadow-lg">
                            <Send className="size-4"/>
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                      <div className="size-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/5">
                         <MessageCircle className="size-6 text-white/20" />
                      </div>
                      <p className="text-sm font-bold text-foreground mb-1">Your Messages</p>
                      <p className="text-xs">Select a chat from the sidebar to continue the conversation.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
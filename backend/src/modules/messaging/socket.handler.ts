import type { Server } from "socket.io";
import { supabaseAdmin } from "../../config/supabase.js";

export function setupSocketHandlers(io: Server): void {
  io.on("connection", (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // Join personal room
    socket.on("join", (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`[Socket] User ${userId} joined personal room`);
    });

    // Join conversation room
    socket.on("join_conversation", (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    // Join workspace room
    socket.on("join_workspace", (workspaceId: string) => {
      socket.join(`workspace:${workspaceId}`);
    });

    // Send message in real-time
    socket.on("send_message", async (data: {
      conversationId: string;
      senderId: string;
      content: string;
      file_urls?: string[];
    }) => {
      try {
        const { data: msg, error } = await supabaseAdmin
          .from("messages")
          .insert({
            conversation_id: data.conversationId,
            sender_id: data.senderId,
            content: data.content,
            file_urls: data.file_urls ?? [],
          })
          .select(`*, sender:profiles!sender_id(first_name, last_name, avatar_url)`)
          .single();

        if (!error && msg) {
          io.to(`conversation:${data.conversationId}`).emit("new_message", msg);
        }
      } catch (err) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Typing indicator
    socket.on("typing", (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      socket.to(`conversation:${data.conversationId}`).emit("user_typing", data);
    });

    // Workspace collaborative editing
    socket.on("workspace_change", (data: { workspaceId: string; fileId: string; change: unknown }) => {
      socket.to(`workspace:${data.workspaceId}`).emit("workspace_updated", data);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });
}

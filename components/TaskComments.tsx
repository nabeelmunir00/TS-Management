// components/TaskComments.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useSocket } from "@/hooks/useSocket";
import type { Comment } from "@/types/socket";
import { formatDistanceToNow } from "date-fns";
import { Send, Trash2, Loader2, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskCommentsProps {
  taskId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskComments({ taskId }: TaskCommentsProps) {
  const { user } = useUser();
  const socket = useSocket();

  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch initial comments ──
  useEffect(() => {
    async function fetchComments() {
      try {
        const res = await fetch(`/api/tasks/${taskId}/comments`);
        const data = await res.json();
        if (data.success) setComments(data.data?.reverse());
      } catch (err) {
        console.error("Failed to fetch comments:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchComments();
  }, [taskId]);

  // ── Socket events ──
  useEffect(() => {
    if (!socket) return;

    // Join this task's room
    socket.emit("join:task", taskId);

    // New comment received
    socket.on("comment:new", (comment) => {
      setComments((prev) => {
        // Avoid duplicates
        if (prev.find((c) => c._id === comment._id)) return prev;
        return [...prev, comment];
      });
    });

    // Comment deleted
    socket.on("comment:deleted", ({ commentId }) => {
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    });

    // Typing indicator
    socket.on("comment:typing", ({ userName }) => {
      setTypingUser(userName);
    });

    socket.on("comment:stop-typing", () => {
      setTypingUser(null);
    });

    return () => {
      socket.emit("leave:task", taskId);
      socket.off("comment:new");
      socket.off("comment:deleted");
      socket.off("comment:typing");
      socket.off("comment:stop-typing");
    };
  }, [socket, taskId]);

  // ── Auto scroll to bottom ──
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // ── Typing handler ──
  function handleTyping() {
    if (!socket || !user) return;

    socket.emit("comment:typing", {
      taskId,
      userName: user.fullName ?? user.firstName ?? "Someone",
    });

    if (typingTimer.current) clearTimeout(typingTimer.current);

    typingTimer.current = setTimeout(() => {
      socket.emit("comment:stop-typing", { taskId });
    }, 2000);
  }

  // ── Send comment ──
  async function handleSend() {
    if (!content.trim() || sending || !user) return;

    setSending(true);

    // Stop typing indicator
    if (typingTimer.current) clearTimeout(typingTimer.current);
    socket?.emit("comment:stop-typing", { taskId });

    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          email: user.emailAddresses[0].emailAddress,
          userName: user.fullName ?? user.firstName ?? "Unknown",
          userAvatar: user.imageUrl ?? "",
        }),
      });

      if (res.ok) {
        setContent("");
        // Comment will appear via socket event
      }
    } catch (err) {
      console.error("Failed to send comment:", err);
    } finally {
      setSending(false);
    }
  }

  // ── Delete comment ──
  async function handleDelete(commentId: string) {
    try {
      await fetch(`/api/tasks/${taskId}/comments/${commentId}`, {
        method: "DELETE",
      });
      // Will be removed via socket event
    } catch (err) {
      console.error("Failed to delete comment:", err);
    }
  }

  // ── Enter to send ──
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Helpers ──
  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function formatTime(dateStr: string) {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return "";
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
        <MessageSquare className="w-4 h-4 text-violet-600" />
        <span className="text-sm font-semibold">Comments</span>
        <span className="ml-auto text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {comments.length}
        </span>
      </div>

      {/* ── Messages ── */}
      <ScrollArea className="flex-1 px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No comments yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Be the first to comment on this task.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => {
              const isOwn = comment.userId === user?.id;
              return (
                <div
                  key={comment._id}
                  className={cn(
                    "flex gap-3 group",
                    isOwn && "flex-row-reverse",
                  )}
                >
                  {/* Avatar */}
                  <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                    <AvatarImage
                      src={comment.userAvatar}
                      alt={comment.userName}
                    />
                    <AvatarFallback className="text-[10px] bg-violet-100 text-violet-700">
                      {getInitials(comment.userName)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Bubble */}
                  <div
                    className={cn(
                      "max-w-[75%] space-y-1",
                      isOwn && "items-end flex flex-col",
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "text-[11px] font-medium text-muted-foreground",
                          isOwn && "order-last",
                        )}
                      >
                        {isOwn ? "You" : comment.userName}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatTime(comment.createdAt)}
                      </span>
                    </div>

                    <div
                      className={cn(
                        "px-3 py-2 rounded-xl text-sm leading-relaxed",
                        isOwn
                          ? "bg-violet-600 text-white rounded-tr-sm"
                          : "bg-muted text-foreground rounded-tl-sm",
                      )}
                    >
                      {comment.content}
                    </div>

                    {/* Delete — own messages only */}
                    {isOwn && (
                      <button
                        onClick={() => handleDelete(comment._id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/50 hover:text-destructive flex items-center gap-1 text-[10px]"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingUser && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <div className="flex gap-0.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span>{typingUser} is typing...</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* ── Input ── */}
      <div className="px-4 py-3 border-t shrink-0">
        <div className="flex gap-2 items-end">
          <Avatar className="w-7 h-7 shrink-0 mb-0.5">
            <AvatarImage src={user?.imageUrl} alt={user?.fullName ?? ""} />
            <AvatarFallback className="text-[10px] bg-violet-100 text-violet-700">
              {getInitials(user?.fullName ?? user?.firstName ?? "?")}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 relative">
            <Textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                handleTyping();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Write a comment... (Enter to send)"
              className="resize-none text-sm pr-10 min-h-[38px] max-h-[120px] py-2"
              rows={1}
              disabled={sending}
            />
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!content.trim() || sending}
              className="absolute right-1.5 bottom-1.5 h-6 w-6 p-0 bg-violet-600 hover:bg-violet-700 text-white rounded-md disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 ml-9">
          <kbd className="bg-muted px-1 rounded text-[10px]">Enter</kbd> send
          &nbsp;·&nbsp;
          <kbd className="bg-muted px-1 rounded text-[10px]">
            Shift+Enter
          </kbd>{" "}
          new line
        </p>
      </div>
    </div>
  );
}

export default TaskComments;

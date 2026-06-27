// hooks/useSocket.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useUser } from "@clerk/nextjs";

interface UseSocketOptions {
  taskId?: string;
  onCommentAdded?: (data: any) => void;
  onCommentEdited?: (data: any) => void;
  onCommentDeleted?: (data: any) => void;
  onReactionUpdated?: (data: any) => void;
  onUserJoined?: (data: any) => void;
  onUserLeft?: (data: any) => void;
  onUserTyping?: (data: any) => void;
  onError?: (data: any) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const { user } = useUser();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // ✅ Initialize socket connection
    const socket = io({
      path: "/api/socket",
      auth: {
        token: user.id,
      },
      transports: ["websocket"],
    });

    socketRef.current = socket;

    // ─── Connection events ──────────────────────────────────────────────

    socket.on("connect", () => {
      console.log("🔌 Socket connected");
      setIsConnected(true);
      setError(null);

      // ✅ Join task room if taskId provided
      if (options.taskId) {
        socket.emit("join-task", options.taskId);
      }
    });

    socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("❌ Socket connection error:", err);
      setError(err.message);
    });

    // ─── Event handlers ────────────────────────────────────────────────

    socket.on("comment-added", (data) => {
      options.onCommentAdded?.(data);
    });

    socket.on("comment-edited", (data) => {
      options.onCommentEdited?.(data);
    });

    socket.on("comment-deleted", (data) => {
      options.onCommentDeleted?.(data);
    });

    socket.on("reaction-updated", (data) => {
      options.onReactionUpdated?.(data);
    });

    socket.on("user-joined", (data) => {
      options.onUserJoined?.(data);
    });

    socket.on("user-left", (data) => {
      options.onUserLeft?.(data);
    });

    socket.on("user-typing", (data) => {
      options.onUserTyping?.(data);
    });

    socket.on("error", (data) => {
      setError(data.message);
      options.onError?.(data);
    });

    // ─── Cleanup ────────────────────────────────────────────────────────

    return () => {
      if (options.taskId) {
        socket.emit("leave-task");
      }
      socket.disconnect();
    };
  }, [user?.id, options.taskId]);

  // ─── Socket actions ──────────────────────────────────────────────────────

  const joinTask = (taskId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("join-task", taskId);
    }
  };

  const leaveTask = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("leave-task");
    }
  };

  const sendComment = (data: { taskId: string; content: string; parentId?: string }) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("new-comment", data);
    }
  };

  const editComment = (data: { commentId: string; content: string }) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("edit-comment", data);
    }
  };

  const deleteComment = (commentId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("delete-comment", { commentId });
    }
  };

  const addReaction = (data: { commentId: string; reaction: string }) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("add-reaction", data);
    }
  };

  const sendTyping = (data: { taskId: string; isTyping: boolean }) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("typing", data);
    }
  };

  return {
    socket: socketRef,
    isConnected,
    error,
    joinTask,
    leaveTask,
    sendComment,
    editComment,
    deleteComment,
    addReaction,
    sendTyping,
  };
}
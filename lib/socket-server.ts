// lib/socket-server.ts
import { Server as SocketServer } from "socket.io";
import { Server as HttpServer } from "http";
import { parse } from "url";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import Comment from "@/lib/models/Comment";
import Task from "@/lib/models/Task";
import { getCurrentUser } from "./currentUser";

let io: SocketServer | null = null;

interface SocketUser {
  userId: string;
  socketId: string;
  organizationId?: string;
}

// ─── User Tracking ──────────────────────────────────────────────────────────

const onlineUsers = new Map<string, SocketUser>();

// ─── Initialize Socket Server ──────────────────────────────────────────────

export function initSocketServer(server: HttpServer) {
  if (io) {
    console.log("⚠️ Socket.io already initialized");
    return io;
  }

  io = new SocketServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socket",
    addTrailingSlash: false,
  });

  // ─── Authentication Middleware ───────────────────────────────────────────

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication required"));
      }

      // ✅ Verify with Clerk
      const { userId } = await auth();
      if (userId) {
        return next(new Error("Invalid session"));
      }

      // ✅ Attach user to socket
      const currentUser = await getCurrentUser();
      socket.data.userId = userId;
      socket.data.email = currentUser?.user?.emailAddresses?.[0]?.emailAddress;
      socket.data.userName =
        currentUser.user?.fullName || session.user?.firstName || "User";

      next();
    } catch (error) {
      console.error("❌ Socket auth error:", error);
      next(new Error("Authentication failed"));
    }
  });

  // ─── Connection Handler ──────────────────────────────────────────────────

  io.on("connection", (socket) => {
    const userId = socket.data.userId;
    const userName = socket.data.userName;

    console.log(`✅ User connected: ${userName} (${userId})`);

    // ─── Join Task Room ────────────────────────────────────────────────────

    socket.on("join-task", (taskId: string) => {
      if (!taskId) return;

      // Leave previous task room
      if (socket.data.currentTaskId) {
        socket.leave(`task-${socket.data.currentTaskId}`);
      }

      // Join new task room
      socket.join(`task-${taskId}`);
      socket.data.currentTaskId = taskId;

      console.log(`📌 ${userName} joined task ${taskId}`);

      // Notify others in the room
      socket.to(`task-${taskId}`).emit("user-joined", {
        userId,
        userName,
        timestamp: new Date().toISOString(),
      });
    });

    // ─── Leave Task Room ────────────────────────────────────────────────────

    socket.on("leave-task", () => {
      if (socket.data.currentTaskId) {
        socket.leave(`task-${socket.data.currentTaskId}`);
        console.log(`👋 ${userName} left task ${socket.data.currentTaskId}`);
        socket.data.currentTaskId = null;
      }
    });

    // ─── New Comment ───────────────────────────────────────────────────────

    socket.on(
      "new-comment",
      async (data: { taskId: string; content: string; parentId?: string }) => {
        try {
          await connectDB();

          // ✅ Create comment in database
          const comment = await Comment.create({
            taskId: data.taskId,
            userId: userId,
            content: data.content.trim(),
            parentId: data.parentId || null,
            email: socket.data.email || "",
            userName: socket.data.userName || "User",
            avatar: socket.data.avatar || "",
          });

          // ✅ Increment task comment count
          await Task.findByIdAndUpdate(data.taskId, {
            $inc: { commentCount: 1 },
          });

          // ✅ Get populated comment with user data
          const populatedComment = await Comment.findById(comment._id).lean();

          // ✅ Broadcast to all users in the task room
          io.to(`task-${data.taskId}`).emit("comment-added", {
            comment: {
              ...populatedComment,
              _id: comment._id,
              createdAt: comment.createdAt,
            },
          });

          console.log(
            `💬 ${socket.data.userName} commented on task ${data.taskId}`,
          );
        } catch (error) {
          console.error("❌ New comment error:", error);
          socket.emit("error", {
            message: "Failed to add comment",
          });
        }
      },
    );

    // ─── Edit Comment ──────────────────────────────────────────────────────

    socket.on(
      "edit-comment",
      async (data: { commentId: string; content: string }) => {
        try {
          await connectDB();

          const comment = await Comment.findOne({
            _id: data.commentId,
            userId: userId,
          });

          if (!comment) {
            socket.emit("error", {
              message: "Comment not found or unauthorized",
            });
            return;
          }

          comment.content = data.content.trim();
          comment.edited = true;
          await comment.save();

          // ✅ Broadcast update
          io.to(`task-${comment.taskId.toString()}`).emit("comment-edited", {
            commentId: data.commentId,
            content: data.content.trim(),
            editedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.error("❌ Edit comment error:", error);
          socket.emit("error", { message: "Failed to edit comment" });
        }
      },
    );

    // ─── Delete Comment ────────────────────────────────────────────────────

    socket.on("delete-comment", async (data: { commentId: string }) => {
      try {
        await connectDB();

        const comment = await Comment.findOne({
          _id: data.commentId,
          userId: userId,
        });

        if (!comment) {
          socket.emit("error", {
            message: "Comment not found or unauthorized",
          });
          return;
        }

        // Soft delete
        comment.isDeleted = true;
        await comment.save();

        // Decrement task comment count
        await Task.findByIdAndUpdate(comment.taskId, {
          $inc: { commentCount: -1 },
        });

        // ✅ Broadcast deletion
        io.to(`task-${comment.taskId.toString()}`).emit("comment-deleted", {
          commentId: data.commentId,
        });
      } catch (error) {
        console.error("❌ Delete comment error:", error);
        socket.emit("error", { message: "Failed to delete comment" });
      }
    });

    // ─── Add Reaction ──────────────────────────────────────────────────────

    socket.on(
      "add-reaction",
      async (data: { commentId: string; reaction: string }) => {
        try {
          await connectDB();

          const comment = await Comment.findById(data.commentId);
          if (!comment) {
            socket.emit("error", { message: "Comment not found" });
            return;
          }

          // Toggle reaction
          const existingIndex = comment.reactions.findIndex(
            (r) => r.userId === userId && r.type === data.reaction,
          );

          if (existingIndex !== -1) {
            comment.reactions.splice(existingIndex, 1);
          } else {
            comment.reactions.push({
              type: data.reaction as any,
              userId: userId,
            });
          }

          await comment.save();

          // ✅ Broadcast reaction update
          io.to(`task-${comment.taskId.toString()}`).emit("reaction-updated", {
            commentId: data.commentId,
            reactions: comment.reactions,
          });
        } catch (error) {
          console.error("❌ Reaction error:", error);
          socket.emit("error", { message: "Failed to add reaction" });
        }
      },
    );

    // ─── Typing Indicator ──────────────────────────────────────────────────

    socket.on("typing", (data: { taskId: string; isTyping: boolean }) => {
      socket.to(`task-${data.taskId}`).emit("user-typing", {
        userId: userId,
        userName: socket.data.userName || "User",
        isTyping: data.isTyping,
      });
    });

    // ─── Disconnect ────────────────────────────────────────────────────────

    socket.on("disconnect", () => {
      console.log(`👋 User disconnected: ${userName}`);
      onlineUsers.delete(userId);

      if (socket.data.currentTaskId) {
        socket.to(`task-${socket.data.currentTaskId}`).emit("user-left", {
          userId: userId,
          userName: userName,
        });
      }
    });
  });

  console.log("✅ Socket.io server initialized");
  return io;
}

// ─── Get Socket Instance ───────────────────────────────────────────────────

export function getSocketServer(): SocketServer | null {
  return io;
}

// ─── Close Socket Server ──────────────────────────────────────────────────

export function closeSocketServer() {
  if (io) {
    io.close();
    io = null;
    console.log("✅ Socket.io server closed");
  }
}

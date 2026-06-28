// server.ts
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import dotenv from "dotenv";

// ✅ Load env
dotenv.config();

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // ── Socket.io attach karo ──
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  // ✅ Global io instance (API routes mein use hoga)
  (global as any).io = io;

  // ── Connection handler ──
  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // ── Join task room ──
    socket.on("join:task", (taskId: string) => {
      if (socket.data.currentTaskId) {
        socket.leave(`task:${socket.data.currentTaskId}`);
      }
      socket.join(`task:${taskId}`);
      socket.data.currentTaskId = taskId;
      console.log(`📌 Socket ${socket.id} joined task:${taskId}`);
    });

    // ── Leave task room ──
    socket.on("leave:task", () => {
      if (socket.data.currentTaskId) {
        socket.leave(`task:${socket.data.currentTaskId}`);
        console.log(
          `🚪 Socket ${socket.id} left task:${socket.data.currentTaskId}`,
        );
        socket.data.currentTaskId = null;
      }
    });

    // ── Typing indicator ──
    socket.on(
      "comment:typing",
      ({ taskId, userName }: { taskId: string; userName: string }) => {
        socket.to(`task:${taskId}`).emit("comment:typing", { userName });
      },
    );

    // ── Stop typing ──
    socket.on("comment:stop-typing", ({ taskId }: { taskId: string }) => {
      socket.to(`task:${taskId}`).emit("comment:stop-typing");
    });

    // ── Disconnect ──
    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  const PORT = parseInt(process.env.PORT ?? "3000", 10);

  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.io running on ws://localhost:${PORT}/api/socket`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}\n`);
  });
});

// server.ts (project root mein rakho)
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";

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

  // ── Global io instance (API routes mein use hoga) ──
  (global as any).io = io;

  // ── Connection handler ──
  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id}`);

    // ── Join task room ──
    socket.on("join:task", (taskId: string) => {
      socket.join(`task:${taskId}`);
      console.log(`📌 Socket ${socket.id} joined task:${taskId}`);
    });

    // ── Leave task room ──
    socket.on("leave:task", (taskId: string) => {
      socket.leave(`task:${taskId}`);
      console.log(`🚪 Socket ${socket.id} left task:${taskId}`);
    });

    // ── Typing indicator ──
    socket.on(
      "comment:typing",
      ({ taskId, userName }: { taskId: string; userName: string }) => {
        // Broadcast to everyone in room EXCEPT sender
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
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});

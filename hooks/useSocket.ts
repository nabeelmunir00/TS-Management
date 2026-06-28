// hooks/useSocket.ts
"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from "@/types/socket";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// ── Singleton socket instance ──
let socketInstance: TypedSocket | null = null;

function getSocket(): TypedSocket {
  if (!socketInstance) {
    socketInstance = io(
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      {
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      },
    ) as TypedSocket;
  }
  return socketInstance;
}

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);

  useEffect(() => {
    socketRef.current = getSocket();

    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }

    return () => {
      // Don't disconnect on unmount — keep singleton alive
    };
  }, []);

  return socketRef.current ?? getSocket();
}

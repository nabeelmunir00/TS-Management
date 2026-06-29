// hooks/useSocket.ts
"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

type TypedSocket = Socket;

// ── Singleton socket instance ──
let socketInstance: TypedSocket | null = null;

function getSocket(): TypedSocket {
  if (!socketInstance) {
    socketInstance = io(
      // process.env.NEXT_PUBLIC_APP_URL ?? "https://dev-hubs-flax.vercel.app",
      {
        transports: ["websocket", "polling"],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      },
    );
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

  const joinTask = useCallback((taskId: string) => {
    if (socketRef.current) {
      socketRef.current.emit("join:task", taskId);
    }
  }, []);

  const leaveTask = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("leave:task");
    }
  }, []);

  const on = useCallback(
    (event: string, callback: (...args: any[]) => void) => {
      if (socketRef.current) {
        socketRef.current.on(event, callback);
      }
    },
    [],
  );

  const off = useCallback(
    (event: string, callback?: (...args: any[]) => void) => {
      if (socketRef.current) {
        socketRef.current.off(event, callback);
      }
    },
    [],
  );

  const emit = useCallback((event: string, ...args: any[]) => {
    if (socketRef.current) {
      socketRef.current.emit(event, ...args);
    }
  }, []);

  return {
    socket: socketRef.current,
    joinTask,
    leaveTask,
    on,
    off,
    emit,
  };
}

// types/socket.ts
// ─── All Socket event types ───────────────────────────────────────────────────

export interface Comment {
  _id: string;
  taskId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited?: boolean;
}

export interface ServerToClientEvents {
  "comment:new": (comment: Comment) => void;
  "comment:deleted": (data: { commentId: string }) => void;
  "comment:updated": (comment: Comment) => void;
  "comment:typing": (data: { userName: string }) => void;
  "comment:stop-typing": () => void;
}

export interface ClientToServerEvents {
  "join:task": (taskId: string) => void;
  "leave:task": (taskId: string) => void;
  "comment:typing": (data: { taskId: string; userName: string }) => void;
  "comment:stop-typing": (data: { taskId: string }) => void;
}

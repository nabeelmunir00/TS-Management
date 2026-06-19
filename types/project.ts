// types/project.ts
export interface Project {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status: "active" | "completed" | "archived" | "on-hold";
  priority: "low" | "medium" | "high";
  startDate?: string;
  endDate?: string;
  teamMembers?: { name: string; avatar?: string; role?: string }[];
  tasksCount?: number;
  completedTasks?: number;
  tags?: string[];
  isStarred?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export type ProjectView = "list" | "grid";

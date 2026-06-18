// constants/project.ts
import { Project } from "@/types/project";

export const PROJECT_COLORS = [
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#6366F1", // Indigo
  "#14B8A6", // Teal
];

export const STATUS_CONFIG: Record<
  Project["status"],
  { label: string; badge: string; dot: string }
> = {
  active: {
    label: "Active",
    badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Completed",
    badge: "bg-blue-50 text-blue-600 border-blue-200",
    dot: "bg-blue-500",
  },
  archived: {
    label: "Archived",
    badge: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  "on-hold": {
    label: "On Hold",
    badge: "bg-amber-50 text-amber-600 border-amber-200",
    dot: "bg-amber-500",
  },
};

export const PRIORITY_CONFIG: Record<
  Project["priority"],
  { label: string; dot: string }
> = {
  high: { label: "High", dot: "bg-red-500" },
  medium: { label: "Medium", dot: "bg-amber-500" },
  low: { label: "Low", dot: "bg-emerald-500" },
};

export const STATUS_CHIPS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "on-hold", label: "On Hold" },
  { key: "completed", label: "Completed" },
  { key: "archived", label: "Archived" },
];

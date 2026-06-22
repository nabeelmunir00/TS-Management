"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Archive,
  CheckSquare,
  CalendarDays,
  ListFilter,
  LayoutGrid,
  SlidersHorizontal,
  X,
  Clock3,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

import { TaskFormModal } from "@/components/TaskModel";
import type { Task, Priority, TaskStatus } from "@/components/TaskModel";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

// ─── Types ──────────────────────────────────────────────────────────────────

type TaskView = "list" | "board";

// ─── Constants ──────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; dot: string; badge: string }
> = {
  urgent: {
    label: "Urgent",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-600 border-red-200",
  },
  high: {
    label: "High",
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-600 border-orange-200",
  },
  medium: {
    label: "Medium",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-600 border-amber-200",
  },
  low: {
    label: "Low",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
};

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; badge: string; icon: React.ElementType; border: string }
> = {
  todo: {
    label: "To Do",
    badge: "bg-slate-100 text-slate-600",
    icon: Circle,
    border: "border-t-slate-400",
  },
  "in-progress": {
    label: "In Progress",
    badge: "bg-blue-50 text-blue-600",
    icon: AlertCircle,
    border: "border-t-blue-500",
  },
  review: {
    label: "Review",
    badge: "bg-purple-50 text-purple-600",
    icon: Clock3,
    border: "border-t-purple-500",
  },
  done: {
    label: "Done",
    badge: "bg-emerald-50 text-emerald-600",
    icon: CheckCircle2,
    border: "border-t-emerald-500",
  },
};

const BOARD_COLUMNS: TaskStatus[] = ["todo", "in-progress", "review", "done"];
const STATUS_CHIPS = [
  { key: "all", label: "All" },
  { key: "todo", label: "To Do" },
  { key: "in-progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

const formatDue = (due: string) => {
  const d = new Date(due);
  const diff = Math.ceil(
    (d.getTime() - new Date(new Date().toDateString()).getTime()) / 86400000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const isOverdue = (due: string, status: TaskStatus) =>
  status !== "done" && new Date(due) < new Date();

// ─── TaskCard ──────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  compact = false,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDuplicate: (task: Task) => void;
  onArchive: (id: string) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const StatusIcon = STATUS_CONFIG[task.status].icon;
  const subtasksDone = task.subtasks?.filter((s) => s.done).length ?? 0;
  const subtasksTotal = task.subtasks?.length ?? 0;
  const overdue = isOverdue(task.dueDate || task.createdAt, task.status);
  const taskId = task._id || task.id;

  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("[role='menuitem']") ||
      target.closest("a")
    ) {
      e.preventDefault();
      return;
    }
    router.push(`/dashboard/tasks/${taskId}`);
  };

  return (
    <div
      className={cn(
        "group relative bg-card border rounded-lg transition-all cursor-pointer",
        "hover:border-violet-200 hover:shadow-sm",
        task.status === "done" && "opacity-60",
        compact ? "p-3" : "p-4",
      )}
      onClick={handleCardClick}
    >
      {/* Priority stripe */}
      <span
        className={cn(
          "absolute left-0 top-2 bottom-2 w-1 rounded-r-full",
          PRIORITY_CONFIG[task.priority].dot,
        )}
      />

      <div className={cn("flex items-start gap-3", compact ? "pl-2" : "pl-3")}>
        {/* Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(taskId);
          }}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-violet-500 transition-colors"
        >
          {task.status === "done" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title + Menu */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium leading-snug truncate",
                  task.status === "done" &&
                    "line-through text-muted-foreground",
                )}
              >
                {task.title}
              </p>
              {!compact && task.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {task.description}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(task);
                  }}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(taskId);
                  }}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <Archive className="w-3.5 h-3.5" /> Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(taskId);
                  }}
                  className="text-xs gap-2 text-destructive cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border",
                PRIORITY_CONFIG[task.priority].badge,
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  PRIORITY_CONFIG[task.priority].dot,
                )}
              />
              {PRIORITY_CONFIG[task.priority].label}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded",
                STATUS_CONFIG[task.status].badge,
              )}
            >
              <StatusIcon className="w-3 h-3" />
              {STATUS_CONFIG[task.status].label}
            </span>
            {!compact &&
              task.tags?.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded"
                >
                  #{tag}
                </span>
              ))}
          </div>

          {/* Subtasks progress */}
          {subtasksTotal > 0 && !compact && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Subtasks</span>
                <span>
                  {subtasksDone}/{subtasksTotal}
                </span>
              </div>
              <Progress
                value={(subtasksDone / subtasksTotal) * 100}
                className="h-1 bg-muted [&>div]:bg-violet-500"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t">
            <div className="flex items-center gap-2">
              {task.assignedTo && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="w-5 h-5">
                    <AvatarImage
                      src={task.assigneeAvatar}
                      alt={task.assignedTo}
                    />
                    <AvatarFallback className="text-[8px] bg-violet-100 text-violet-700">
                      {getInitials(task.assignedTo)}
                    </AvatarFallback>
                  </Avatar>
                  {!compact && (
                    <span className="text-[11px] text-muted-foreground">
                      {task.assignedTo}
                    </span>
                  )}
                </div>
              )}
              {task.project?.name && (
                <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded">
                  {task.project.name}
                </span>
              )}
            </div>
            <span
              className={cn(
                "text-[11px] flex items-center gap-1",
                overdue ? "text-red-500 font-medium" : "text-muted-foreground",
              )}
            >
              <CalendarDays className="w-3 h-3" />
              {task.dueDate ? formatDue(task.dueDate) : "No date"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Board View ────────────────────────────────────────────────────────────

function BoardView({
  tasks,
  onToggle,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
}: {
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDuplicate: (task: Task) => void;
  onArchive: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {BOARD_COLUMNS.map((status) => {
        const col = STATUS_CONFIG[status];
        const colTasks = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="flex flex-col gap-2">
            <div
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 border-t-2",
                col.border,
              )}
            >
              <span className="text-xs font-medium">{col.label}</span>
              <span className="text-[10px] font-medium bg-background px-2 py-0.5 rounded-full border">
                {colTasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-h-[100px]">
              {colTasks.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg flex items-center justify-center py-8">
                  <p className="text-[11px] text-muted-foreground">Empty</p>
                </div>
              ) : (
                colTasks.map((task) => (
                  <TaskCard
                    key={task._id || task.id}
                    task={task}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onDuplicate={onDuplicate}
                    onArchive={onArchive}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  // ── State ──
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<TaskView>("list");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState<string | null>(null);

  // ── Fetch Tasks ──
  const fetchTasks = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterPriority !== "all") params.append("priority", filterPriority);
      if (search) params.append("search", search);

      const res = await fetch(`/api/tasks?${params.toString()}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch tasks");
      }

      const data = await res.json();
      setTasks(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [user?.id, filterStatus, filterPriority, search]);

  useEffect(() => {
    if (isLoaded && user?.id) {
      fetchTasks();
    }
  }, [isLoaded, user, fetchTasks]);

  // ── Handlers ──
  const openNewTask = () => {
    setEditingTask(null);
    setModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setModalOpen(true);
  };

  const handleSave = async (saved: Task) => {
    try {
      const isEdit = !!saved._id;
      const url = isEdit ? `/api/tasks/${saved._id}` : "/api/tasks";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saved),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save task");
      }

      const data = await res.json();

      if (isEdit) {
        setTasks((prev) =>
          prev.map((t) => (t._id === saved._id ? data.data : t)),
        );
        toast.success("Task updated successfully!");
      } else {
        setTasks((prev) => [data.data, ...prev]);
        toast.success("Task created successfully!");
      }

      setModalOpen(false);
      setEditingTask(null);
    } catch (err) {
      console.error("❌ Save error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save task");
    }
  };

  const toggleTask = async (id: string) => {
    setIsToggling(id);

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-status" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to toggle task");
      }

      const data = await res.json();
      setTasks((prev) =>
        prev.map((t) => (t._id === id || t.id === id ? data.data : t)),
      );

      toast.success("Task status updated!");
    } catch (err) {
      console.error("❌ Toggle error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to toggle task");
    } finally {
      setIsToggling(null);
    }
  };

  const deleteTask = (id: string) => {
    const task = tasks.find((t) => t._id === id || t.id === id);
    if (task) {
      setTaskToDelete(task);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;

    setIsDeleting(true);

    try {
      const id = taskToDelete._id || taskToDelete.id;
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete task");
      }

      setTasks((prev) => prev.filter((t) => (t._id || t.id) !== id));
      setDeleteModalOpen(false);
      setTaskToDelete(null);
      toast.success("Task deleted successfully!");
    } catch (err) {
      console.error("❌ Delete error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete task");
    } finally {
      setIsDeleting(false);
    }
  };

  const duplicateTask = async (task: Task) => {
    try {
      const { _id, id, createdAt, updatedAt, ...taskCopy } = task;

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskCopy,
          title: `${task.title} (Copy)`,
          status: "todo",
          isArchived: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to duplicate task");
      }

      const data = await res.json();
      setTasks((prev) => [data.data, ...prev]);
      toast.success("Task duplicated successfully!");
    } catch (err) {
      console.error("❌ Duplicate error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to duplicate task",
      );
    }
  };

  const archiveTask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to archive task");
      }

      const data = await res.json();
      setTasks((prev) =>
        prev.map((t) => (t._id === id || t.id === id ? data.data : t)),
      );

      toast.success("Task archived successfully!");
    } catch (err) {
      console.error("❌ Archive error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to archive task",
      );
    }
  };

  // ── Derived ──
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const q = search.toLowerCase();
      return (
        (!q ||
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))) &&
        (filterStatus === "all" || t.status === filterStatus) &&
        (filterPriority === "all" || t.priority === filterPriority)
      );
    });
  }, [tasks, search, filterStatus, filterPriority]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      todo: tasks.filter((t) => t.status === "todo").length,
      "in-progress": tasks.filter((t) => t.status === "in-progress").length,
      review: tasks.filter((t) => t.status === "review").length,
      done: tasks.filter((t) => t.status === "done").length,
    }),
    [tasks],
  );

  const hasFilters =
    filterStatus !== "all" || filterPriority !== "all" || search !== "";

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterPriority("all");
  };

  // ── Loading ──
  if (!isLoaded || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-sm text-muted-foreground">Loading tasks...</p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button
          onClick={fetchTasks}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Try Again
        </Button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b shrink-0">
          <div>
            <h1 className="text-lg font-semibold">Tasks</h1>
            <p className="text-xs text-muted-foreground">
              {counts.todo} todo · {counts["in-progress"]} in progress ·{" "}
              {counts.done} done
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={view === "list" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "rounded-none h-8 px-2.5",
                  view === "list" &&
                    "bg-violet-600 hover:bg-violet-700 text-white",
                )}
                onClick={() => setView("list")}
              >
                <ListFilter className="w-3.5 h-3.5" />
              </Button>
              <Separator orientation="vertical" className="h-8" />
              <Button
                variant={view === "board" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "rounded-none h-8 px-2.5",
                  view === "board" &&
                    "bg-violet-600 hover:bg-violet-700 text-white",
                )}
                onClick={() => setView("board")}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Button
              size="sm"
              onClick={openNewTask}
              className="gap-1.5 h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              New Task
            </Button>
          </div>
        </header>

        {/* Status chips */}
        <div className="flex items-center gap-1.5 px-6 py-2 border-b overflow-x-auto shrink-0">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilterStatus(chip.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                filterStatus === chip.key
                  ? "bg-violet-600 text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "text-[10px] px-1.5 rounded-full",
                  filterStatus === chip.key ? "bg-white/20" : "bg-background",
                )}
              >
                {counts[chip.key as keyof typeof counts] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-2 px-6 py-2 border-b shrink-0">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 gap-1.5 text-xs",
              showFilters && "border-violet-500 text-violet-600",
            )}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {hasFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            )}
          </Button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex items-center gap-3 px-6 py-2 border-b bg-muted/30 shrink-0">
            <span className="text-xs text-muted-foreground">Priority:</span>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-7 text-xs w-[130px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="urgent">🔴 Urgent</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">🟢 Low</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground ml-auto"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <CheckSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-sm font-medium">No tasks found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasFilters
                    ? "Try clearing your filters"
                    : "Create your first task"}
                </p>
                {hasFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="mt-4 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={openNewTask}
                  >
                    <Plus className="w-3.5 h-3.5" /> New Task
                  </Button>
                )}
              </div>
            ) : view === "list" ? (
              <div className="space-y-2">
                {filtered.map((task) => (
                  <TaskCard
                    key={task._id || task.id}
                    task={task}
                    onToggle={toggleTask}
                    onEdit={openEditTask}
                    onDelete={deleteTask}
                    onDuplicate={duplicateTask}
                    onArchive={archiveTask}
                  />
                ))}
                <p className="text-[11px] text-muted-foreground text-center pt-2">
                  {filtered.length} of {tasks.length} tasks
                </p>
              </div>
            ) : (
              <BoardView
                tasks={filtered}
                onToggle={toggleTask}
                onEdit={openEditTask}
                onDelete={deleteTask}
                onDuplicate={duplicateTask}
                onArchive={archiveTask}
              />
            )}
          </div>
        </ScrollArea>
      </div>

      <TaskFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSave}
        task={editingTask}
      />

      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setTaskToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={taskToDelete?.title || "Untitled Task"}
        type="task"
        isLoading={isDeleting}
      />
    </TooltipProvider>
  );
}

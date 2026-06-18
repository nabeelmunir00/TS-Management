"use client";

import { useState } from "react";
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
} from "lucide-react";
import { useUser } from "@clerk/nextjs";

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

// ── Reusable modal + shared types ──
import { TaskFormModal } from "@/components/TaskModel";
import type { Task, Priority, TaskStatus } from "@/components/TaskModel";

// ─── Local types ──────────────────────────────────────────────────────────────

type TaskView = "list" | "board";

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TASKS: Task[] = [
  {
    id: "1",
    title: "Setup authentication with Clerk",
    description: "Implement OAuth and JWT authentication using Clerk",
    project: "DevHub",
    priority: "high",
    status: "done",
    due: "2026-06-17",
    assignee: "Ali Khan",
    assigneeAvatar: "https://avatar.vercel.sh/ali",
    tags: ["auth", "security"],
    subtasks: [
      { id: "1-1", title: "Install Clerk SDK", done: true },
      { id: "1-2", title: "Configure OAuth providers", done: true },
    ],
    createdAt: "2026-06-10",
  },
  {
    id: "2",
    title: "Build sidebar component",
    description: "Create responsive sidebar with navigation items",
    project: "DevHub",
    priority: "high",
    status: "in-progress",
    due: "2026-06-18",
    assignee: "Ali Khan",
    assigneeAvatar: "https://avatar.vercel.sh/ali",
    tags: ["ui", "components"],
    subtasks: [
      { id: "2-1", title: "Design sidebar layout", done: true },
      { id: "2-2", title: "Implement collapse functionality", done: false },
    ],
    createdAt: "2026-06-12",
  },
  {
    id: "3",
    title: "Design dashboard UI",
    description: "Create modern dashboard with analytics and widgets",
    project: "DevHub",
    priority: "medium",
    status: "in-progress",
    due: "2026-06-19",
    assignee: "Sarah Ahmed",
    assigneeAvatar: "https://avatar.vercel.sh/sarah",
    tags: ["design", "ui"],
    subtasks: [
      { id: "3-1", title: "Create wireframes", done: true },
      { id: "3-2", title: "Design analytics cards", done: false },
    ],
    createdAt: "2026-06-13",
  },
  {
    id: "4",
    title: "Integrate MongoDB with Mongoose",
    description: "Setup MongoDB connection and create schemas",
    project: "DevHub",
    priority: "medium",
    status: "todo",
    due: "2026-06-20",
    assignee: "Ali Khan",
    assigneeAvatar: "https://avatar.vercel.sh/ali",
    tags: ["database", "backend"],
    subtasks: [],
    createdAt: "2026-06-14",
  },
  {
    id: "5",
    title: "Setup OpenAI API integration",
    description: "Implement AI features using OpenAI API",
    project: "DevHub",
    priority: "low",
    status: "todo",
    due: "2026-06-22",
    assignee: "Usman Malik",
    assigneeAvatar: "https://avatar.vercel.sh/usman",
    tags: ["ai", "api"],
    subtasks: [],
    createdAt: "2026-06-15",
  },
  {
    id: "6",
    title: "Write API documentation",
    description: "Document all API endpoints with examples",
    project: "DevHub",
    priority: "low",
    status: "review",
    due: "2026-06-19",
    assignee: "Sarah Ahmed",
    assigneeAvatar: "https://avatar.vercel.sh/sarah",
    tags: ["documentation"],
    subtasks: [],
    createdAt: "2026-06-11",
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; dot: string; badge: string }
> = {
  high: {
    label: "High",
    dot: "bg-red-500",
    badge:
      "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400",
  },
  medium: {
    label: "Medium",
    dot: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400",
  },
  low: {
    label: "Low",
    dot: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
};

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; badge: string; icon: React.ElementType; border: string }
> = {
  todo: {
    label: "To Do",
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: Circle,
    border: "border-t-slate-400",
  },
  "in-progress": {
    label: "In Progress",
    badge: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    icon: AlertCircle,
    border: "border-t-blue-500",
  },
  done: {
    label: "Done",
    badge:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    icon: CheckCircle2,
    border: "border-t-emerald-500",
  },
  review: {
    label: "Review",
    badge:
      "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
    icon: Clock3,
    border: "border-t-purple-500",
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function formatDue(due: string) {
  const d = new Date(due);
  const diff = Math.ceil(
    (d.getTime() - new Date(new Date().toDateString()).getTime()) / 86400000,
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isOverdue(due: string, status: TaskStatus) {
  return status !== "done" && new Date(due) < new Date();
}

// ─── TaskCard ────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
  compact = false,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const StatusIcon = STATUS_CONFIG[task.status].icon;
  const subtasksDone = task.subtasks?.filter((s) => s.done).length ?? 0;
  const subtasksTotal = task.subtasks?.length ?? 0;
  const overdue = isOverdue(task.due, task.status);

  return (
    <div
      className={cn(
        "group relative bg-card border border-border rounded-xl transition-all duration-150",
        "hover:border-violet-200 dark:hover:border-violet-800 hover:shadow-sm",
        task.status === "done" && "opacity-55",
        compact ? "p-3" : "p-4",
      )}
    >
      {/* Priority stripe */}
      <span
        className={cn(
          "absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full",
          PRIORITY_CONFIG[task.priority].dot,
        )}
      />

      <div className={cn("flex items-start gap-3", compact ? "pl-2" : "pl-3")}>
        {/* Toggle */}
        <button
          onClick={() => onToggle(task.id)}
          className="mt-0.5 shrink-0 text-muted-foreground hover:text-violet-500 transition-colors"
          aria-label="Toggle task"
        >
          {task.status === "done" ? (
            <CheckCircle2 className="w-[18px] h-[18px] text-emerald-500" />
          ) : (
            <Circle className="w-[18px] h-[18px]" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
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

            {/* 3-dot menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-xs">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onEdit(task)}
                  className="text-xs gap-2 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit task
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                  <Archive className="w-3.5 h-3.5" /> Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(task.id)}
                  className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer"
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
                "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md border",
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
                "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md",
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
                  className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md"
                >
                  #{tag}
                </span>
              ))}
          </div>

          {/* Subtasks progress */}
          {subtasksTotal > 0 && !compact && (
            <div className="mt-2.5 space-y-1">
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
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              {task.assignee && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="w-5 h-5">
                    <AvatarImage
                      src={task.assigneeAvatar}
                      alt={task.assignee}
                    />
                    <AvatarFallback className="text-[8px] bg-violet-100 dark:bg-violet-900/40 text-violet-700">
                      {getInitials(task.assignee)}
                    </AvatarFallback>
                  </Avatar>
                  {!compact && (
                    <span className="text-[11px] text-muted-foreground">
                      {task.assignee}
                    </span>
                  )}
                </div>
              )}
              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                {task.project}
              </span>
            </div>
            <span
              className={cn(
                "text-[11px] flex items-center gap-1",
                overdue ? "text-red-500 font-medium" : "text-muted-foreground",
              )}
            >
              <CalendarDays className="w-3 h-3" />
              {formatDue(task.due)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Board View ───────────────────────────────────────────────────────────────

function BoardView({
  tasks,
  onToggle,
  onEdit,
  onDelete,
}: {
  tasks: Task[];
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
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
              <span className="text-[10px] font-medium text-muted-foreground bg-background px-1.5 py-0.5 rounded-full border">
                {colTasks.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 min-h-[100px]">
              {colTasks.length === 0 ? (
                <div className="border-2 border-dashed border-border rounded-xl flex items-center justify-center py-8">
                  <p className="text-[11px] text-muted-foreground">No tasks</p>
                </div>
              ) : (
                colTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={onToggle}
                    onEdit={onEdit}
                    onDelete={onDelete}
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user, isLoaded } = useUser();

  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [view, setView] = useState<TaskView>("list");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // ── Modal state ──
  const [modalOpen, setModalOpen] = useState(false);
  // null = new task, Task object = edit mode
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // ── Handlers ──

  function openNewTask() {
    setEditingTask(null); // blank form
    setModalOpen(true);
  }

  function openEditTask(task: Task) {
    setEditingTask(task); // pre-fill form with this task's data
    setModalOpen(true);
  }

  function handleSave(saved: Task) {
    if (editingTask) {
      // Edit mode — replace existing task
      setTasks((prev) => prev.map((t) => (t.id === saved.id ? saved : t)));
    } else {
      // New mode — prepend to list
      setTasks((prev) => [saved, ...prev]);
    }
  }

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: t.status === "done" ? "todo" : "done" }
          : t,
      ),
    );
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Derived ──

  const filtered = tasks.filter((t) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)) &&
      (filterStatus === "all" || t.status === filterStatus) &&
      (filterPriority === "all" || t.priority === filterPriority)
    );
  });

  const counts = {
    all: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    "in-progress": tasks.filter((t) => t.status === "in-progress").length,
    review: tasks.filter((t) => t.status === "review").length,
    done: tasks.filter((t) => t.status === "done").length,
  };

  const hasActiveFilters =
    filterStatus !== "all" || filterPriority !== "all" || search !== "";

  function clearFilters() {
    setSearch("");
    setFilterStatus("all");
    setFilterPriority("all");
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        {/* ── Header ── */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Tasks</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {counts.todo} to do · {counts["in-progress"]} in progress ·{" "}
              {counts.done} done
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border border-border rounded-lg overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent side="bottom">List view</TooltipContent>
              </Tooltip>
              <Separator orientation="vertical" className="h-8" />
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent side="bottom">Board view</TooltipContent>
              </Tooltip>
            </div>

            <Button
              size="sm"
              onClick={openNewTask}
              className="gap-1.5 h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              New task
            </Button>
          </div>
        </header>

        {/* ── Status chips ── */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-border shrink-0 overflow-x-auto">
          {STATUS_CHIPS.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilterStatus(chip.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                filterStatus === chip.key
                  ? "bg-violet-600 text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/70",
              )}
            >
              {chip.label}
              <span
                className={cn(
                  "text-[10px] px-1 rounded-full",
                  filterStatus === chip.key
                    ? "bg-white/20 text-white"
                    : "bg-background",
                )}
              >
                {counts[chip.key as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>

        {/* ── Search bar ── */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border shrink-0">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
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
              "h-8 gap-1.5 text-xs shrink-0",
              showFilters && "border-violet-500 text-violet-600",
            )}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
            )}
          </Button>
        </div>

        {/* ── Expanded filters ── */}
        {showFilters && (
          <div className="flex items-center gap-3 px-6 py-2.5 border-b border-border bg-muted/30 shrink-0">
            <span className="text-xs text-muted-foreground shrink-0">
              Priority:
            </span>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-7 text-xs w-[130px]">
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priorities</SelectItem>
                <SelectItem value="high">🔴 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">🟢 Low</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-auto"
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
        )}

        {/* ── Content ── */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-4">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <CheckSquare className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium">No tasks found</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                  {hasActiveFilters
                    ? "Try clearing your filters."
                    : "Create your first task to get started."}
                </p>
                {hasActiveFilters ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 text-xs h-7"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="mt-4 text-xs h-7 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
                    onClick={openNewTask}
                  >
                    <Plus className="w-3.5 h-3.5" /> New task
                  </Button>
                )}
              </div>
            ) : view === "list" ? (
              <div className="space-y-2 max-w-3xl">
                {filtered.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={toggleTask}
                    onEdit={openEditTask} // passes full task object → modal pre-fills
                    onDelete={deleteTask}
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
              />
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ── Reusable Task Form Modal ── */}
      <TaskFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        task={editingTask} // null → new, Task → edit (pre-filled)
      />
    </TooltipProvider>
  );
}

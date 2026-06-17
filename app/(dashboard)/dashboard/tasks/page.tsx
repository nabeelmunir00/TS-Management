"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Archive,
  ArrowUpDown,
  CheckSquare,
  FolderOpen,
  Tag,
  User,
  CalendarDays,
  ListFilter,
  LayoutGrid,
  GripVertical,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ───────────────────────────────────────────────────────────────────

type Priority = "high" | "medium" | "low";
type TaskStatus = "todo" | "in-progress" | "done" | "review";
type TaskView = "list" | "board";

interface Task {
  id: string;
  title: string;
  description?: string;
  project: string;
  priority: Priority;
  status: TaskStatus;
  due: string;
  assignee?: string;
  assigneeAvatar?: string;
  tags?: string[];
  subtasks?: { id: string; title: string; done: boolean }[];
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
  tasks: number;
  done: number;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

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
    due: "2026-06-17",
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
    due: "2026-06-18",
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

const PROJECTS: Project[] = [
  { id: "1", name: "DevHub", color: "bg-violet-500", tasks: 18, done: 6 },
  { id: "2", name: "Portfolio v3", color: "bg-blue-500", tasks: 12, done: 9 },
  {
    id: "3",
    name: "E-commerce API",
    color: "bg-emerald-500",
    tasks: 24,
    done: 11,
  },
  { id: "4", name: "Mobile App", color: "bg-amber-500", tasks: 8, done: 2 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; className: string; icon: any }
> = {
  high: {
    label: "High",
    className:
      "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border-red-200",
    icon: AlertCircle,
  },
  medium: {
    label: "Medium",
    className:
      "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200",
    icon: Circle,
  },
  low: {
    label: "Low",
    className:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200",
    icon: Circle,
  },
};

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; className: string; icon: any }
> = {
  todo: {
    label: "To Do",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: Circle,
  },
  "in-progress": {
    label: "In Progress",
    className:
      "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    icon: AlertCircle,
  },
  done: {
    label: "Done",
    className:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  review: {
    label: "Review",
    className:
      "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400",
    icon: CheckCircle2,
  },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}) {
  const PriorityIcon = PRIORITY_CONFIG[task.priority].icon;
  const StatusIcon = STATUS_CONFIG[task.status].icon;
  const subtaskProgress =
    task.subtasks && task.subtasks.length > 0
      ? (task.subtasks.filter((s) => s.done).length / task.subtasks.length) *
        100
      : 0;

  return (
    <div
      className={cn(
        "group p-4 rounded-lg border border-border bg-card hover:shadow-md transition-all duration-200",
        task.status === "done" && "opacity-75",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button onClick={() => onToggle(task.id)} className="mt-0.5 shrink-0">
          {task.status === "done" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-violet-500 transition-colors" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3
                className={cn(
                  "text-sm font-medium",
                  task.status === "done" &&
                    "line-through text-muted-foreground",
                )}
              >
                {task.title}
              </h3>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>

            {/* Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-xs">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onEdit(task)}
                  className="text-xs gap-2"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs gap-2">
                  <Copy className="w-3.5 h-3.5" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs gap-2">
                  <Archive className="w-3.5 h-3.5" /> Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(task.id)}
                  className="text-xs gap-2 text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5",
                PRIORITY_CONFIG[task.priority].className,
              )}
            >
              <PriorityIcon className="w-3 h-3 mr-1" />
              {PRIORITY_CONFIG[task.priority].label}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] h-5",
                STATUS_CONFIG[task.status].className,
              )}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {STATUS_CONFIG[task.status].label}
            </Badge>
            <Badge variant="secondary" className="text-[10px] h-5 gap-1">
              <FolderOpen className="w-3 h-3" />
              {task.project}
            </Badge>
            {task.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-[10px] h-5">
                #{tag}
              </Badge>
            ))}
          </div>

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>Subtasks</span>
                <span>
                  {task.subtasks.filter((s) => s.done).length}/
                  {task.subtasks.length}
                </span>
              </div>
              <Progress value={subtaskProgress} className="h-1" />
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-border/50">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <CalendarDays className="w-3.5 h-3.5" />
                {new Date(task.due).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
              {task.assignee && (
                <div className="flex items-center gap-1.5">
                  <Avatar className="w-5 h-5">
                    {task.assigneeAvatar ? (
                      <AvatarImage
                        src={task.assigneeAvatar}
                        alt={task.assignee}
                      />
                    ) : (
                      <AvatarFallback className="text-[8px] bg-violet-100 dark:bg-violet-900/40 text-violet-700">
                        {getInitials(task.assignee)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span>{task.assignee}</span>
                </div>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Created {new Date(task.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user, isLoaded } = useUser();
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [view, setView] = useState<TaskView>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // ── Handlers ──

  function toggleTask(id: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              status: task.status === "done" ? "todo" : "done",
            }
          : task,
      ),
    );
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }

  function editTask(task: Task) {
    setSelectedTask(task);
    setIsEditDialogOpen(true);
  }

  function saveTask(updatedTask: Task) {
    setTasks((prev) =>
      prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
    );
    setIsEditDialogOpen(false);
    setSelectedTask(null);
  }

  // ── Filters ──

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      filterStatus === "all" || task.status === filterStatus;
    const matchesPriority =
      filterPriority === "all" || task.priority === filterPriority;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    review: tasks.filter((t) => t.status === "review").length,
  };

  const userName =
    isLoaded && user ? user.fullName || user.firstName || "User" : "User";

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {getGreeting()}, {userName}! You have {stats.todo} tasks to
            complete.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Total
            </p>
            <p className="text-lg font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Todo
            </p>
            <p className="text-lg font-semibold text-orange-500">
              {stats.todo}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              In Progress
            </p>
            <p className="text-lg font-semibold text-blue-500">
              {stats.inProgress}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Done
            </p>
            <p className="text-lg font-semibold text-emerald-500">
              {stats.done}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-md">
            <Button
              variant={view === "list" ? "default" : "ghost"}
              size="sm"
              className="rounded-r-none px-2"
              onClick={() => setView("list")}
            >
              <ListFilter className="w-4 h-4" />
            </Button>
            <Button
              variant={view === "board" ? "default" : "ghost"}
              size="sm"
              className="rounded-l-none px-2"
              onClick={() => setView("board")}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tasks List ── */}
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="space-y-3 pr-4">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-sm font-medium">No tasks found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your filters or create a new task.
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onEdit={editTask}
                onDelete={deleteTask}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* ── Edit Dialog ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Make changes to your task here.
            </DialogDescription>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={selectedTask.title}
                  onChange={(e) =>
                    setSelectedTask({ ...selectedTask, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={selectedTask.description || ""}
                  onChange={(e) =>
                    setSelectedTask({
                      ...selectedTask,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={selectedTask.priority}
                    onValueChange={(value: Priority) =>
                      setSelectedTask({ ...selectedTask, priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={selectedTask.status}
                    onValueChange={(value: TaskStatus) =>
                      setSelectedTask({ ...selectedTask, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="due">Due Date</Label>
                <Input
                  id="due"
                  type="date"
                  value={selectedTask.due}
                  onChange={(e) =>
                    setSelectedTask({ ...selectedTask, due: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={() => selectedTask && saveTask(selectedTask)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

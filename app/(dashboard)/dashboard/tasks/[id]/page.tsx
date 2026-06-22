"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  User,
  Tag,
  FolderOpen,
  MessageSquare,
  Edit2,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
  Loader2,
  MoreVertical,
  Copy,
  Archive,
  Flame,
  Users,
  AtSign,
  Link2,
  Paperclip,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import TaskComments from "@/components/TaskComments";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import type {
  Task,
  Priority,
  TaskStatus,
  SubTask,
} from "@/components/TaskModel";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TaskDetailPageParams {
  id: string;
}

interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
}

interface EditFormData {
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  projectId?: string;
  assignedTo?: string;
  tags?: string[];
  userId: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; dot: string; badge: string; color: string }
> = {
  urgent: {
    label: "Urgent",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-600 border-red-200",
    color: "text-red-500",
  },
  high: {
    label: "High",
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-600 border-orange-200",
    color: "text-orange-500",
  },
  medium: {
    label: "Medium",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-600 border-amber-200",
    color: "text-amber-500",
  },
  low: {
    label: "Low",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-600 border-emerald-200",
    color: "text-emerald-500",
  },
};

const STATUS_CONFIG: Record<
  TaskStatus,
  { label: string; badge: string; icon: React.ElementType; color: string }
> = {
  todo: {
    label: "To Do",
    badge: "bg-slate-100 text-slate-600",
    icon: Circle,
    color: "text-slate-500",
  },
  "in-progress": {
    label: "In Progress",
    badge: "bg-blue-50 text-blue-600",
    icon: AlertCircle,
    color: "text-blue-500",
  },
  review: {
    label: "Review",
    badge: "bg-purple-50 text-purple-600",
    icon: AlertCircle,
    color: "text-purple-500",
  },
  done: {
    label: "Done",
    badge: "bg-emerald-50 text-emerald-600",
    icon: CheckCircle2,
    color: "text-emerald-500",
  },
};

// ─── Helper Functions ──────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0] || "")
    .join("")
    .toUpperCase();
}

function isTaskOverdue(
  dueDate: string | undefined,
  status: TaskStatus,
): boolean {
  if (!dueDate) return false;
  return status !== "done" && new Date(dueDate) < new Date();
}

function formatDate(date: string | Date): string {
  return format(new Date(date), "PPP");
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();

  // ── State ──
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<Partial<EditFormData>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("details");

  // ── Derived State ──
  const taskId = params?.id as string;
  const userId = user?.id || "";

  const canEdit = Boolean(task && task.assignedTo === userId);

  const subtasksDone =
    task?.subtasks?.filter((s: SubTask) => s.done).length ?? 0;
  const subtasksTotal = task?.subtasks?.length ?? 0;
  const completionPercentage =
    subtasksTotal > 0
      ? Math.round((subtasksDone / subtasksTotal) * 100)
      : task?.status === "done"
        ? 100
        : 0;

  // ─── Fetch Task ────────────────────────────────────────────────────────────

  const fetchTask = useCallback(async (): Promise<void> => {
    if (!taskId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) {
        const errorData = (await res.json()) as ApiResponse;
        throw new Error(errorData.error || "Failed to fetch task");
      }

      const data = (await res.json()) as ApiResponse<Task>;
      const taskData = data.data || data;
      setTask(taskData as Task);
      setEditForm(taskData as unknown as Partial<EditFormData>);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load task";
      setError(errorMessage);
      toast.error("Failed to load task");
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) {
      fetchTask();
    }
  }, [taskId, fetchTask]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleToggleStatus = async (): Promise<void> => {
    if (!task || !task._id) return;

    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-status" }),
      });

      if (!res.ok) {
        const err = (await res.json()) as ApiResponse;
        throw new Error(err.error || "Failed to toggle status");
      }

      const data = (await res.json()) as ApiResponse<Task>;
      const taskData = data.data || data;
      setTask(taskData as Task);

      toast.success("Task status updated!");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to toggle status";
      toast.error(errorMessage);
    }
  };

  const handleUpdateTask = async (): Promise<void> => {
    if (!task || !task._id || !editForm) return;

    setIsSaving(true);

    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...task, ...editForm }),
      });

      if (!res.ok) {
        const err = (await res.json()) as ApiResponse;
        throw new Error(err.error || "Failed to update task");
      }

      const data = (await res.json()) as ApiResponse<Task>;
      const taskData = data.data || data;
      setTask(taskData as Task);

      setIsEditing(false);
      toast.success("Task updated successfully!");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update task";
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = async (): Promise<void> => {
    if (!task || !task._id) return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = (await res.json()) as ApiResponse;
        throw new Error(err.error || "Failed to delete task");
      }

      toast.success("Task deleted successfully!");
      router.push("/dashboard/tasks");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete task";
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const handleDuplicate = async (): Promise<void> => {
    if (!task) return;

    try {
      const { _id, id, createdAt, updatedAt, ...taskCopy } = task;

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskCopy,
          title: `${task.title} (Copy)`,
          status: "todo" as TaskStatus,
          isArchived: false,
        }),
      });

      if (!res.ok) {
        const err = (await res.json()) as ApiResponse;
        throw new Error(err.error || "Failed to duplicate task");
      }

      const data = (await res.json()) as ApiResponse<Task>;
      toast.success("Task duplicated successfully!");
      router.push(`/dashboard/tasks/${data.data?._id}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to duplicate task";
      toast.error(errorMessage);
    }
  };

  const handleArchive = async (): Promise<void> => {
    if (!task || !task._id) return;

    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });

      if (!res.ok) {
        const err = (await res.json()) as ApiResponse;
        throw new Error(err?.error || "Failed to archive task");
      }

      const data = (await res.json()) as ApiResponse<Task>;
      const taskData = data.data || data;
      setTask(taskData as Task);
      toast.success("Task archived successfully!");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to archive task";
      toast.error(errorMessage);
    }
  };

  // ─── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-sm text-muted-foreground">Loading task...</p>
      </div>
    );
  }

  // ─── Error ──
  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-sm text-muted-foreground">
          {error || "Task not found"}
        </p>
        <Button
          onClick={() => router.push("/dashboard/tasks")}
          variant="outline"
        >
          Back to Tasks
        </Button>
      </div>
    );
  }

  const StatusIcon = STATUS_CONFIG[task.status]?.icon || Circle;
  const isOverdue = isTaskOverdue(task.dueDate, task.status);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/tasks")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={handleToggleStatus}
                className="text-muted-foreground hover:text-violet-500 transition-colors"
                aria-label="Toggle task status"
              >
                {task.status === "done" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </button>
            )}
            {!canEdit && (
              <div className="text-muted-foreground">
                {task.status === "done" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5" />
                )}
              </div>
            )}
            <h1 className="text-lg font-semibold truncate">{task.title}</h1>
            <Badge
              className={cn("text-[10px]", STATUS_CONFIG[task.status].badge)}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {STATUS_CONFIG[task.status].label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={handleDuplicate}
                    className="text-xs gap-2 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleArchive}
                    className="text-xs gap-2 cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5" /> Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteModalOpen(true)}
                    className="text-xs gap-2 text-destructive cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </header>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-4xl mx-auto">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList>
              <TabsTrigger value="details" className="gap-2">
                <FileText className="w-4 h-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="comments" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Comments
                {task.commentCount && task.commentCount > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {task.commentCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              {/* Description */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Description
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {task.description || "No description provided."}
                  </p>
                </CardContent>
              </Card>

              {/* Task Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Priority */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Flame className="w-4 h-4 text-muted-foreground" />
                      Priority
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={cn(PRIORITY_CONFIG[task.priority].badge)}>
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full mr-1",
                          PRIORITY_CONFIG[task.priority].dot,
                        )}
                      />
                      {PRIORITY_CONFIG[task.priority].label}
                    </Badge>
                  </CardContent>
                </Card>

                {/* Due Date */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-muted-foreground" />
                      Due Date
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {task.dueDate ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {formatDate(task.dueDate)}
                        </span>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-[10px]">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No due date
                      </span>
                    )}
                  </CardContent>
                </Card>

                {/* Assigned To */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Assigned To
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {task.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          {task.assigneeAvatar ? (
                            <AvatarImage
                              src={task.assigneeAvatar}
                              alt={task.assignedTo}
                            />
                          ) : null}
                          <AvatarFallback className="text-[10px] bg-violet-100 text-violet-700">
                            {getInitials(task.assignedTo)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {task.assignedByName || task.assignedTo}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Not assigned
                      </span>
                    )}
                  </CardContent>
                </Card>

                {/* Project */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {task.project?.name ? (
                      <span className="text-sm">{task.project.name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No project
                      </span>
                    )}
                  </CardContent>
                </Card>

                {/* Tags */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      Tags
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {task.tags && task.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {task.tags.map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        No tags
                      </span>
                    )}
                  </CardContent>
                </Card>

                {/* Subtasks */}
                {subtasksTotal > 0 && (
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                          Subtasks
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {subtasksDone}/{subtasksTotal}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Progress
                        value={completionPercentage}
                        className="h-1.5 mb-3"
                      />
                      <div className="space-y-1.5">
                        {task.subtasks?.map(
                          (subtask: SubTask, index: number) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30"
                            >
                              <input
                                type="checkbox"
                                checked={subtask.done}
                                readOnly
                                className="w-3.5 h-3.5 rounded accent-violet-500"
                              />
                              <span
                                className={cn(
                                  "text-sm",
                                  subtask.done &&
                                    "line-through text-muted-foreground",
                                )}
                              >
                                {subtask.title}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Metadata */}
                <Card className="md:col-span-2">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <span>
                          Created: {formatDate(task.createdAt || new Date())}
                        </span>
                        <span>•</span>
                        <span>
                          Updated:{" "}
                          {formatDate(
                            task.updatedAt || task.createdAt || new Date(),
                          )}
                        </span>
                      </div>
                      {task._id && (
                        <span className="font-mono">ID: {task._id}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="comments">
              <TaskComments taskId={task._id || ""} taskTitle={task.title} />
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>

      {/* Edit Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editForm.title || task.title}
                onChange={(e) =>
                  setEditForm({ ...editForm, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editForm.description || task.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={editForm.priority || task.priority}
                  onValueChange={(v: Priority) =>
                    setEditForm({ ...editForm, priority: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={editForm.dueDate || task.dueDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dueDate: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTask} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteTask}
        title={task.title}
        type="task"
        isLoading={isDeleting}
      />
    </div>
  );
}

// components/TaskFormModal.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit,
  X,
  Tag,
  Flame,
  AlertCircle,
  Circle,
  Sparkles,
  Loader2,
  Calendar,
  User,
  Clock,
  Link,
  Paperclip,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in-progress" | "review" | "done";

export interface SubTask {
  id: string;
  title: string;
  done: boolean;
}

export interface Attachment {
  name: string;
  url: string;
  type: string;
}

export interface Task {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  projectId?: string;
  project?: {
    _id: string;
    name: string;
    color?: string;
  };
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo?: string;
  assigneeAvatar?: string;
  tags?: string[];
  subtasks?: SubTask[];
  attachments?: Attachment[];
  aiSuggestions?: string;
  isArchived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Project {
  _id: string;
  id?: string;
  name: string;
  color?: string;
  description?: string;
  status?: string;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => Promise<void>;
  task?: Task | null;
  onDelete?: (id: string) => Promise<void>;
}

// ─── Priority Config ──────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: "urgent", label: "Urgent", icon: Flame, color: "text-red-500" },
  { value: "high", label: "High", icon: Flame, color: "text-orange-500" },
  {
    value: "medium",
    label: "Medium",
    icon: AlertCircle,
    color: "text-amber-500",
  },
  { value: "low", label: "Low", icon: Circle, color: "text-emerald-500" },
];

const STATUS_OPTIONS = [
  { value: "todo", label: "To Do", color: "bg-slate-100 text-slate-600" },
  {
    value: "in-progress",
    label: "In Progress",
    color: "bg-blue-100 text-blue-600",
  },
  { value: "review", label: "Review", color: "bg-purple-100 text-purple-600" },
  { value: "done", label: "Done", color: "bg-emerald-100 text-emerald-600" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskFormModal({
  open,
  onClose,
  onSave,
  task = null,
  onDelete,
}: TaskFormModalProps) {
  const isEditMode = Boolean(task?._id || task?.id);

  // ── Form state ──
  const [form, setForm] = useState<Partial<Task>>({
    title: "",
    description: "",
    projectId: "",
    priority: "medium",
    status: "todo",
    dueDate: "",
    tags: [],
    subtasks: [],
    attachments: [],
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [newAttachment, setNewAttachment] = useState({
    name: "",
    url: "",
    type: "",
  });
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);

  // ── AI states ──
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIBadge, setShowAIBadge] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ── Calendar state ──
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // ── Delete Modal state ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  /**
   * Fetch projects when modal opens
   */
  const fetchProjects = useCallback(async () => {
    debugger;
    if (!open) return;

    try {
      setLoadingProjects(true);
      const res = await fetch("/api/projects?status=active&limit=100");

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to fetch projects");
      }

      const data = await res.json();
      setProjects(data.data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open, fetchProjects]);

  /**
   * Sync form whenever the `task` prop changes OR the modal opens.
   */
  useEffect(() => {
    if (open) {
      if (task) {
        // Edit mode - populate form with task data
        setForm({
          _id: task._id || task.id,
          title: task.title || "",
          description: task.description || "",
          projectId: task.projectId || task.project?._id || "",
          priority: task.priority || "medium",
          status: task.status || "todo",
          dueDate: task.dueDate || "",
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours,
          assignedTo: task.assignedTo || "",
          assigneeAvatar: task.assigneeAvatar || "",
          tags: task.tags || [],
          subtasks: task.subtasks || [],
          attachments: task.attachments || [],
          aiSuggestions: task.aiSuggestions || "",
          isArchived: task.isArchived || false,
        });
      } else {
        // Create mode - reset form
        setForm({
          title: "",
          description: "",
          projectId: "",
          priority: "medium",
          status: "todo",
          dueDate: "",
          tags: [],
          subtasks: [],
          attachments: [],
        });
      }

      // Reset UI states
      setTagInput("");
      setAiError(null);
      setShowAIBadge(false);
      setShowAttachmentInput(false);
      setNewAttachment({ name: "", url: "", type: "" });
    }
  }, [open, task]);

  // ── AI Generate Handler ──
  const handleAIGenerate = async () => {
    if (!form.title?.trim()) {
      toast.error("Please enter a task title first!");
      return;
    }

    setIsGenerating(true);
    setAiError(null);
    setShowAIBadge(false);

    try {
      const response = await fetch("/api/ai/generate-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate suggestions");
      }

      const aiData = await response.json();

      setForm((prev) => ({
        ...prev,
        description: aiData.enhancedDescription || prev.description,
        priority: aiData.suggestedPriority || prev.priority,
        tags: aiData.suggestedTags || prev.tags,
        subtasks: aiData.suggestedSubtasks || prev.subtasks,
        aiSuggestions: JSON.stringify(aiData),
      }));

      setShowAIBadge(true);
      toast.success("AI suggestions applied!");

      setTimeout(() => setShowAIBadge(false), 5000);
    } catch (error) {
      console.error("AI generation failed:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to generate AI suggestions";
      setAiError(errorMessage);
      toast.error(errorMessage);
      setTimeout(() => setAiError(null), 4000);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Tag helpers ──
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const normalized = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
      if (!form.tags?.includes(normalized)) {
        setForm((f) => ({ ...f, tags: [...(f.tags ?? []), normalized] }));
      }
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags?.filter((t) => t !== tag) }));
  };

  // ── Subtask helpers ──
  const addSubtask = () => {
    setForm({
      ...form,
      subtasks: [
        ...(form.subtasks ?? []),
        {
          id: crypto.randomUUID?.() || Date.now().toString(),
          title: "",
          done: false,
        },
      ],
    });
  };

  const updateSubtask = (index: number, title: string) => {
    const newSubtasks = [...(form.subtasks ?? [])];
    newSubtasks[index].title = title;
    setForm({ ...form, subtasks: newSubtasks });
  };

  const toggleSubtask = (index: number) => {
    const newSubtasks = [...(form.subtasks ?? [])];
    newSubtasks[index].done = !newSubtasks[index].done;
    setForm({ ...form, subtasks: newSubtasks });
  };

  const removeSubtask = (index: number) => {
    const newSubtasks = (form.subtasks ?? []).filter((_, i) => i !== index);
    setForm({ ...form, subtasks: newSubtasks });
  };

  // ── Attachment helpers ──
  const addAttachment = () => {
    if (!newAttachment.name.trim() || !newAttachment.url.trim()) {
      toast.error("Please enter attachment name and URL");
      return;
    }

    setForm({
      ...form,
      attachments: [...(form.attachments ?? []), { ...newAttachment }],
    });
    setNewAttachment({ name: "", url: "", type: "" });
    setShowAttachmentInput(false);
    toast.success("Attachment added");
  };

  const removeAttachment = (index: number) => {
    const newAttachments = (form.attachments ?? []).filter(
      (_, i) => i !== index,
    );
    setForm({ ...form, attachments: newAttachments });
  };

  // ── Save ──
  const handleSave = async () => {
    // Validate
    if (!form.title?.trim()) {
      toast.error("Task title is required");
      return;
    }

    setIsSaving(true);

    try {
      const taskData: Task = {
        ...form,
        title: form.title.trim(),
        description: form.description?.trim() || "",
        projectId: form.projectId || undefined,
        status: form.status || "todo",
        priority: form.priority || "medium",
        tags: form.tags || [],
        subtasks: form.subtasks || [],
        attachments: form.attachments || [],
      };

      await onSave(taskData);

      // Success toast is handled in parent
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save task",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    const taskId = task?._id || task?.id;
    if (!taskId || !onDelete) return;

    setIsSaving(true);
    try {
      await onDelete(taskId);
      setShowDeleteModal(false);
      toast.success("Task deleted successfully!");
      onClose();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete task",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = form.title?.trim().length > 0;

  // ── Render ──

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
          {/* ── Header ── */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    isEditMode
                      ? "bg-blue-500"
                      : "bg-gradient-to-br from-violet-500 to-purple-500",
                  )}
                >
                  {isEditMode ? (
                    <Edit className="w-4 h-4 text-white" />
                  ) : (
                    <Plus className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold tracking-tight">
                    {isEditMode ? "Edit Task" : "Create New Task"}
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5 text-muted-foreground">
                    {isEditMode
                      ? "Update the details below and save your changes."
                      : "Fill in the details to add a task to your workspace."}
                  </DialogDescription>
                </div>
              </div>

              {/* ── AI Generate Button ── */}
              {!isEditMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAIGenerate}
                  disabled={isGenerating || !form.title?.trim()}
                  className={cn(
                    "gap-2 h-9 text-xs font-medium transition-all rounded-lg",
                    isGenerating || !form.title?.trim()
                      ? "opacity-50 cursor-not-allowed"
                      : "border-violet-200 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30",
                  )}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-500" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                      AI Suggest
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogHeader>

          {/* ── Form body ── */}
          <ScrollArea className="max-h-[60vh]">
            <div className="px-6 py-5 space-y-5">
              {/* ── AI Status Messages ── */}
              {showAIBadge && (
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex-1">
                    ✨ AI suggestions applied! Review and edit below.
                  </p>
                  <button
                    onClick={() => setShowAIBadge(false)}
                    className="text-emerald-500 hover:text-emerald-700 transition-colors p-1 rounded-lg hover:bg-emerald-500/10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {aiError && (
                <div className="bg-gradient-to-r from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700 dark:text-red-300 flex-1">
                    {aiError}
                  </p>
                  <button
                    onClick={() => setAiError(null)}
                    className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-lg hover:bg-red-500/10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* ── Title ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    Task Title <span className="text-destructive">*</span>
                  </Label>
                  {form.title?.trim() && !isGenerating && !isEditMode && (
                    <Badge
                      variant="outline"
                      className="text-[10px] gap-1 border-violet-200 text-violet-600"
                    >
                      <Sparkles className="w-3 h-3" />
                      AI ready
                    </Badge>
                  )}
                </div>
                <Input
                  value={form.title || ""}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Implement authentication flow"
                  className="text-sm h-10 rounded-lg border-muted-foreground/20 focus:border-violet-500"
                  autoFocus
                />
              </div>

              {/* ── Description ── */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Add more context about this task..."
                  className="text-sm resize-none rounded-lg border-muted-foreground/20 focus:border-violet-500 min-h-[80px]"
                  rows={3}
                />
              </div>

              <Separator className="bg-muted-foreground/10" />

              {/* ── Priority + Status ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Priority
                  </Label>
                  <Select
                    value={form.priority || "medium"}
                    onValueChange={(v: Priority) =>
                      setForm({ ...form, priority: v })
                    }
                  >
                    <SelectTrigger className="text-sm h-10 rounded-lg border-muted-foreground/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <opt.icon
                              className={cn("w-3.5 h-3.5", opt.color)}
                            />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Status
                  </Label>
                  <Select
                    value={form.status || "todo"}
                    onValueChange={(v: TaskStatus) =>
                      setForm({ ...form, status: v })
                    }
                  >
                    <SelectTrigger className="text-sm h-10 rounded-lg border-muted-foreground/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <span className="flex items-center gap-2">
                            <span
                              className={cn("w-2 h-2 rounded-full", opt.color)}
                            />
                            {opt.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Project + Due Date ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Project</Label>
                  <Select
                    value={form.projectId || ""}
                    onValueChange={(v) => setForm({ ...form, projectId: v })}
                    disabled={loadingProjects}
                  >
                    <SelectTrigger className="text-sm h-10 rounded-lg border-muted-foreground/20">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project._id} value={project._id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: project.color || "#6366f1",
                              }}
                            />
                            {project.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {loadingProjects && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading projects...
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Due Date
                  </Label>
                  <Popover
                    open={datePickerOpen}
                    onOpenChange={setDatePickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10 rounded-lg border-muted-foreground/20",
                          !form.dueDate && "text-muted-foreground",
                        )}
                      >
                        <Calendar className="mr-2 h-3.5 w-3.5" />
                        {form.dueDate ? (
                          format(new Date(form.dueDate), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={
                          form.dueDate ? new Date(form.dueDate) : undefined
                        }
                        onSelect={(date) => {
                          setForm({
                            ...form,
                            dueDate: date?.toISOString().split("T")[0] || "",
                          });
                          setDatePickerOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* ── Estimated Hours ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Estimated Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.estimatedHours ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        estimatedHours: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="e.g. 4"
                    className="text-sm h-10 rounded-lg border-muted-foreground/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Actual Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.actualHours ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        actualHours: e.target.value
                          ? parseFloat(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="e.g. 5"
                    className="text-sm h-10 rounded-lg border-muted-foreground/20"
                  />
                </div>
              </div>

              {/* ── Assignee ── */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <User className="w-3 h-3" /> Assignee
                </Label>
                <Input
                  value={form.assignedTo || ""}
                  onChange={(e) =>
                    setForm({ ...form, assignedTo: e.target.value })
                  }
                  placeholder="Assign to someone..."
                  className="text-sm h-10 rounded-lg border-muted-foreground/20"
                />
              </div>

              {/* ── Tags ── */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Tags
                </Label>

                {(form.tags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.tags?.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="gap-1 text-[11px] bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800"
                      >
                        #{tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="hover:text-violet-900 dark:hover:text-violet-200 transition-colors ml-0.5"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="relative">
                  <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Type a tag and press Enter..."
                    className="pl-8 text-sm h-10 rounded-lg border-muted-foreground/20"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Press{" "}
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">
                    Enter
                  </kbd>{" "}
                  to add a tag
                </p>
              </div>

              {/* ── Subtasks ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Subtasks</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addSubtask}
                    className="text-xs h-7 gap-1 px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>

                {(form.subtasks?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    {form.subtasks?.map((subtask, index) => (
                      <div
                        key={subtask.id || index}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition-colors group"
                      >
                        <input
                          type="checkbox"
                          checked={subtask.done}
                          onChange={() => toggleSubtask(index)}
                          className="w-4 h-4 rounded border-muted-foreground/30 cursor-pointer accent-violet-600 shrink-0"
                        />
                        <Input
                          value={subtask.title}
                          onChange={(e) => updateSubtask(index, e.target.value)}
                          className="text-sm h-8 flex-1 border-none shadow-none focus-visible:ring-0 bg-transparent px-1"
                          placeholder={`Subtask ${index + 1}...`}
                        />
                        <button
                          onClick={() => removeSubtask(index)}
                          className="text-muted-foreground/40 hover:text-destructive transition-colors p-1 rounded-lg opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {(!form.subtasks || form.subtasks.length === 0) && (
                  <p className="text-[11px] text-muted-foreground/60 italic">
                    No subtasks yet. Add some to break down this task.
                  </p>
                )}
              </div>

              {/* ── Attachments ── */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium flex items-center gap-1">
                    <Paperclip className="w-3 h-3" /> Attachments
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAttachmentInput(!showAttachmentInput)}
                    className="text-xs h-7 gap-1 px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </Button>
                </div>

                {(form.attachments?.length ?? 0) > 0 && (
                  <div className="space-y-1.5">
                    {form.attachments?.map((attachment, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 rounded-lg border border-border/50"
                      >
                        <Link className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-xs flex-1 truncate font-medium">
                          {attachment.name}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {attachment.type || "link"}
                        </Badge>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-muted-foreground/40 hover:text-destructive transition-colors p-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {showAttachmentInput && (
                  <div className="space-y-2 p-3 rounded-lg bg-muted/20 border border-border/50">
                    <Input
                      placeholder="Name (e.g. Design File)"
                      value={newAttachment.name}
                      onChange={(e) =>
                        setNewAttachment({
                          ...newAttachment,
                          name: e.target.value,
                        })
                      }
                      className="text-sm h-8 rounded-lg"
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder="URL"
                        value={newAttachment.url}
                        onChange={(e) =>
                          setNewAttachment({
                            ...newAttachment,
                            url: e.target.value,
                          })
                        }
                        className="text-sm h-8 rounded-lg flex-1"
                      />
                      <Input
                        placeholder="Type (e.g. figma, doc)"
                        value={newAttachment.type}
                        onChange={(e) =>
                          setNewAttachment({
                            ...newAttachment,
                            type: e.target.value,
                          })
                        }
                        className="text-sm h-8 rounded-lg w-28"
                      />
                      <Button
                        size="sm"
                        onClick={addAttachment}
                        className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* ── Footer ── */}
          <DialogFooter className="px-6 py-6 border-t bg-muted/10 gap-2 flex-row justify-end">
            {isEditMode && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="mr-auto h-9 text-xs px-4 rounded-lg"
                disabled={isSaving}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Delete
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-9 text-xs px-5 rounded-lg"
              disabled={isGenerating || isSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!isValid || isGenerating || isSaving}
              onClick={handleSave}
              className="h-9 text-xs px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white disabled:opacity-40 transition-all rounded-lg shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  {isEditMode ? "Saving..." : "Creating..."}
                </>
              ) : isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Generating...
                </>
              ) : isEditMode ? (
                "Save Changes"
              ) : (
                "Create Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Modal ── */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{task?.title}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                  Deleting...
                </>
              ) : (
                "Delete Task"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TaskFormModal;

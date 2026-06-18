// components/TaskFormModal.tsx
"use client";

import { useState, useEffect } from "react";
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
  GripVertical,
  ChevronDown,
} from "lucide-react";
import { format } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

// ─── AI Import ──────────────────────────────────────────────────────────────
import { generateTaskData } from "@/lib/ai";
// ─── Types ──────────────────────────────────────────────────────────────────

export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in-progress" | "review" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string;
  project: string;
  priority: Priority;
  status: TaskStatus;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo?: string;
  assigneeAvatar?: string;
  tags?: string[];
  subtasks?: { id: string; title: string; done: boolean }[];
  attachments?: { name: string; url: string; type: string }[];
  aiSuggestions?: string;
  isArchived?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  task?: Task | null;
  projects?: string[];
  members?: { name: string; avatar?: string }[];
  defaultProject?: string;
}

// ─── Static data fallbacks ──────────────────────────────────────────────────

const DEFAULT_PROJECTS = [
  "DevHub",
  "Portfolio v3",
  "E-commerce API",
  "Mobile App",
  "AI Integration",
];

const DEFAULT_MEMBERS = [
  { name: "Ali Khan", avatar: "https://avatar.vercel.sh/ali" },
  { name: "Sarah Ahmed", avatar: "https://avatar.vercel.sh/sarah" },
  { name: "Usman Malik", avatar: "https://avatar.vercel.sh/usman" },
  { name: "Ayesha Riaz", avatar: "https://avatar.vercel.sh/ayesha" },
];

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function blankForm(
  defaultProject = "DevHub",
): Omit<Task, "id" | "createdAt" | "updatedAt"> {
  return {
    title: "",
    description: "",
    project: defaultProject,
    priority: "medium",
    status: "todo",
    dueDate: new Date().toISOString().split("T")[0],
    estimatedHours: undefined,
    actualHours: undefined,
    assignedTo: "",
    assigneeAvatar: "",
    tags: [],
    subtasks: [],
    attachments: [],
    aiSuggestions: "",
    isArchived: false,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskFormModal({
  open,
  onClose,
  onSave,
  task = null,
  projects = DEFAULT_PROJECTS,
  members = DEFAULT_MEMBERS,
  defaultProject = "DevHub",
}: TaskFormModalProps) {
  const isEditMode = Boolean(task);

  // ── Form state ──
  const [form, setForm] = useState<
    Omit<Task, "id" | "createdAt" | "updatedAt">
  >(task ? { ...task } : blankForm(defaultProject));
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

  // ── Calendar state ──
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  /**
   * Sync form whenever the `task` prop changes OR the modal opens.
   */
  useEffect(() => {
    if (open) {
      setForm(task ? { ...task } : blankForm(defaultProject));
      setTagInput("");
      setAiError(null);
      setShowAIBadge(false);
      setShowAttachmentInput(false);
    }
  }, [open, task, defaultProject]);

  // ── AI Generate Handler ──

  const handleAIGenerate = async () => {
    if (!form.title.trim()) {
      setAiError("Please enter a task title first!");
      setTimeout(() => setAiError(null), 3000);
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
      setTimeout(() => setShowAIBadge(false), 5000);
    } catch (error) {
      console.error("AI generation failed:", error);
      setAiError(
        error instanceof Error
          ? error.message
          : "Failed to generate AI suggestions",
      );
      setTimeout(() => setAiError(null), 4000);
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Tag helpers ──

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const normalized = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
      if (!form.tags?.includes(normalized)) {
        setForm((f) => ({ ...f, tags: [...(f.tags ?? []), normalized] }));
      }
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setForm((f) => ({ ...f, tags: f.tags?.filter((t) => t !== tag) }));
  }

  // ── Subtask helpers ──

  function addSubtask() {
    setForm({
      ...form,
      subtasks: [
        ...(form.subtasks ?? []),
        { id: Date.now().toString(), title: "", done: false },
      ],
    });
  }

  function updateSubtask(index: number, title: string) {
    const newSubtasks = [...(form.subtasks ?? [])];
    newSubtasks[index].title = title;
    setForm({ ...form, subtasks: newSubtasks });
  }

  function toggleSubtask(index: number) {
    const newSubtasks = [...(form.subtasks ?? [])];
    newSubtasks[index].done = !newSubtasks[index].done;
    setForm({ ...form, subtasks: newSubtasks });
  }

  function removeSubtask(index: number) {
    const newSubtasks = (form.subtasks ?? []).filter((_, i) => i !== index);
    setForm({ ...form, subtasks: newSubtasks });
  }

  // ── Attachment helpers ──

  function addAttachment() {
    if (newAttachment.name.trim() && newAttachment.url.trim()) {
      setForm({
        ...form,
        attachments: [...(form.attachments ?? []), { ...newAttachment }],
      });
      setNewAttachment({ name: "", url: "", type: "" });
      setShowAttachmentInput(false);
    }
  }

  function removeAttachment(index: number) {
    const newAttachments = (form.attachments ?? []).filter(
      (_, i) => i !== index,
    );
    setForm({ ...form, attachments: newAttachments });
  }

  // ── Save ──

  function handleSave() {
    if (!form.title.trim()) return;

    const saved: Task = {
      ...form,
      id: task?.id ?? Date.now().toString(),
      createdAt: task?.createdAt ?? new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    onSave(saved);
    onClose();
  }

  const isValid = form.title.trim().length > 0;

  // ── Render ──

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden bg-gradient-to-b from-background to-muted/5">
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
                disabled={isGenerating || !form.title.trim()}
                className={cn(
                  "gap-2 h-9 text-xs font-medium transition-all rounded-lg",
                  isGenerating || !form.title.trim()
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
                {form.title.trim() && !isGenerating && !isEditMode && (
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
                value={form.title}
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
                value={form.description ?? ""}
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
                  value={form.priority}
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
                          <opt.icon className={cn("w-3.5 h-3.5", opt.color)} />
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
                  value={form.status}
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
                  value={form.project}
                  onValueChange={(v) => setForm({ ...form, project: v })}
                >
                  <SelectTrigger className="text-sm h-10 rounded-lg border-muted-foreground/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Due Date
                </Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
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
              <Select
                value={form.assignedTo ?? ""}
                onValueChange={(v) => {
                  const member = members.find((m) => m.name === v);
                  setForm({
                    ...form,
                    assignedTo: v,
                    assigneeAvatar: member?.avatar ?? "",
                  });
                }}
              >
                <SelectTrigger className="text-sm h-10 rounded-lg border-muted-foreground/20">
                  <SelectValue placeholder="Assign to someone..." />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.name} value={m.name}>
                      <span className="flex items-center gap-2">
                        <Avatar className="w-5 h-5 shrink-0">
                          <AvatarImage src={m.avatar} alt={m.name} />
                          <AvatarFallback className="text-[8px] bg-violet-100 text-violet-700">
                            {getInitials(m.name)}
                          </AvatarFallback>
                        </Avatar>
                        {m.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Tags ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1">
                <Tag className="w-3 h-3" /> Tags
              </Label>

              {/* Existing tags */}
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

              {/* Tag input */}
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
                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 cursor-move shrink-0" />
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
                      className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50"
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
        <DialogFooter className="px-6 py-4 border-t bg-muted/10 gap-2 flex-row justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 text-xs px-5 rounded-lg"
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!isValid || isGenerating}
            onClick={handleSave}
            className="h-9 text-xs px-6 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white disabled:opacity-40 transition-all rounded-lg shadow-sm"
          >
            {isGenerating ? (
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
  );
}

export default TaskFormModal;

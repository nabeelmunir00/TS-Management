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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

// ─── AI Import ──────────────────────────────────────────────────────────────
import { generateTaskData } from "@/lib/ai";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Priority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "in-progress" | "done" | "review";

export interface Task {
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

// ─── Props ──────────────────────────────────────────────────────────────────

interface TaskFormModalProps {
  /** Modal open/close state */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /**
   * Called with the final Task object when user clicks Save/Create.
   * Parent decides what to do (add to list, call API, etc.)
   */
  onSave: (task: Task) => void;
  /**
   * Pass an existing Task to pre-fill the form (edit mode).
   * Pass null / undefined for a blank form (new task mode).
   */
  task?: Task | null;
  /** Available project names shown in the Project dropdown */
  projects?: string[];
  /** Available team members shown in the Assignee dropdown */
  members?: { name: string; avatar?: string }[];
  /** Default project pre-selected when creating a new task */
  defaultProject?: string;
}

// ─── Static data fallbacks ──────────────────────────────────────────────────

const DEFAULT_PROJECTS = [
  "DevHub",
  "Portfolio v3",
  "E-commerce API",
  "Mobile App",
];

const DEFAULT_MEMBERS = [
  { name: "Ali Khan", avatar: "https://avatar.vercel.sh/ali" },
  { name: "Sarah Ahmed", avatar: "https://avatar.vercel.sh/sarah" },
  { name: "Usman Malik", avatar: "https://avatar.vercel.sh/usman" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function blankForm(defaultProject = "DevHub"): Omit<Task, "id" | "createdAt"> {
  return {
    title: "",
    description: "",
    project: defaultProject,
    priority: "medium",
    status: "todo",
    due: new Date().toISOString().split("T")[0],
    assignee: "",
    assigneeAvatar: "",
    tags: [],
    subtasks: [],
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
  const [form, setForm] = useState<Omit<Task, "id" | "createdAt">>(
    task ? { ...task } : blankForm(defaultProject),
  );
  const [tagInput, setTagInput] = useState("");

  // ── AI states ──
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIBadge, setShowAIBadge] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  /**
   * Sync form whenever the `task` prop changes OR the modal opens.
   * This ensures that if the parent swaps which task to edit while the
   * modal is already mounted, the form refreshes correctly.
   */
  useEffect(() => {
    if (open) {
      setForm(task ? { ...task } : blankForm(defaultProject));
      setTagInput("");
      setAiError(null);
      setShowAIBadge(false);
    }
  }, [open, task, defaultProject]);

  // components/TaskFormModal.tsx - Updated handleAIGenerate

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
      // ✅ Call our API route instead of direct Gemini
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

  // ── Save ──

  function handleSave() {
    if (!form.title.trim()) return;

    const saved: Task = {
      ...form,
      id: task?.id ?? Date.now().toString(),
      createdAt: task?.createdAt ?? new Date().toISOString().split("T")[0],
    };

    onSave(saved);
    onClose();
  }

  const isValid = form.title.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[540px] p-0 gap-0 overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                {isEditMode ? (
                  <Edit className="w-4 h-4 text-white" />
                ) : (
                  <Plus className="w-4 h-4 text-white" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base leading-none">
                  {isEditMode ? "Edit task" : "Create new task"}
                </DialogTitle>
                <DialogDescription className="text-xs mt-1">
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
                  "gap-1.5 h-8 text-xs transition-all",
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
        <ScrollArea className="max-h-[65vh]">
          <div className="px-6 py-5 space-y-5">
            {/* ── AI Status Messages ── */}
            {showAIBadge && (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Sparkles className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  ✨ AI suggestions applied! Review and edit below.
                </p>
                <button
                  onClick={() => setShowAIBadge(false)}
                  className="ml-auto text-emerald-500 hover:text-emerald-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {aiError && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700 dark:text-red-300">
                  {aiError}
                </p>
                <button
                  onClick={() => setAiError(null)}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ── Title ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">
                  Title <span className="text-destructive">*</span>
                </Label>
                {form.title.trim() && !isGenerating && !isEditMode && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-violet-500" />
                    AI ready
                  </span>
                )}
              </div>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Implement auth flow"
                className="text-sm"
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
                className="text-sm resize-none"
                rows={3}
              />
            </div>

            <Separator />

            {/* ── Priority + Status ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v: Priority) =>
                    setForm({ ...form, priority: v })
                  }
                >
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        <Flame className="w-3.5 h-3.5 text-red-500" /> High
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-500" />{" "}
                        Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="low">
                      <span className="flex items-center gap-2">
                        <Circle className="w-3.5 h-3.5 text-emerald-500" /> Low
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v: TaskStatus) =>
                    setForm({ ...form, status: v })
                  }
                >
                  <SelectTrigger className="text-sm h-9">
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

            {/* ── Project + Due Date ── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Project</Label>
                <Select
                  value={form.project}
                  onValueChange={(v) => setForm({ ...form, project: v })}
                >
                  <SelectTrigger className="text-sm h-9">
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
                <Label className="text-xs font-medium">Due date</Label>
                <Input
                  type="date"
                  value={form.due}
                  onChange={(e) => setForm({ ...form, due: e.target.value })}
                  className="text-sm h-9"
                />
              </div>
            </div>

            {/* ── Assignee ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Assignee</Label>
              <Select
                value={form.assignee ?? ""}
                onValueChange={(v) => {
                  const member = members.find((m) => m.name === v);
                  setForm({
                    ...form,
                    assignee: v,
                    assigneeAvatar: member?.avatar ?? "",
                  });
                }}
              >
                <SelectTrigger className="text-sm h-9">
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
              <Label className="text-xs font-medium">Tags</Label>

              {/* Existing tags */}
              {(form.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-[11px] bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 px-2 py-0.5 rounded-full"
                    >
                      #{tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-violet-900 dark:hover:text-violet-200 transition-colors"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
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
                  className="pl-8 text-sm h-9"
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Press{" "}
                <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">
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
                  className="text-xs h-6 gap-1 px-2 text-violet-600 hover:text-violet-700 hover:bg-violet-50"
                >
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>

              {(form.subtasks?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  {form.subtasks?.map((subtask, index) => (
                    <div
                      key={subtask.id || index}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={subtask.done}
                        onChange={() => toggleSubtask(index)}
                        className="w-4 h-4 rounded border-muted-foreground cursor-pointer accent-violet-600"
                      />
                      <Input
                        value={subtask.title}
                        onChange={(e) => updateSubtask(index, e.target.value)}
                        className="text-sm h-8 flex-1"
                        placeholder={`Subtask ${index + 1}...`}
                      />
                      <button
                        onClick={() => removeSubtask(index)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1"
                        aria-label="Remove subtask"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(!form.subtasks || form.subtasks.length === 0) && (
                <p className="text-[11px] text-muted-foreground">
                  No subtasks yet. Add some to break down this task.
                </p>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* ── Footer ── */}
        <DialogFooter className="px-6 py-6 border-t gap-2 flex-row justify-end bg-muted/10">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs px-4"
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!isValid || isGenerating}
            onClick={handleSave}
            className="h-8 text-xs px-4 bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Generating...
              </>
            ) : isEditMode ? (
              "Save changes"
            ) : (
              "Create task"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TaskFormModal;

// components/ProjectFormModal.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { X, FolderPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Project } from "@/types/project";
import { PROJECT_COLORS } from "@/constants/project";

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (project: Project) => Promise<void>;
  project?: Project | null;
  isLoading?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "on-hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const PRIORITY_OPTIONS = [
  { value: "high", label: "🔴 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🟢 Low" },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export function ProjectFormModal({
  open,
  onClose,
  onSave,
  project = null,
  isLoading = false,
}: ProjectFormModalProps) {
  const isEdit = !!project?._id || !!project?.id;

  // ── Form state ──
  const [form, setForm] = useState<Partial<Project>>({
    name: "",
    description: "",
    status: "active",
    priority: "medium",
    color: PROJECT_COLORS[0],
    tags: [],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    teamMembers: [],
  });
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ── Sync form with project ──
  useEffect(() => {
    if (open) {
      if (project) {
        setForm({
          name: project.name || "",
          description: project.description || "",
          status: project.status || "active",
          priority: project.priority || "medium",
          color: project.color || PROJECT_COLORS[0],
          tags: project.tags || [],
          startDate:
            project.startDate || new Date().toISOString().split("T")[0],
          endDate: project.endDate || "",
          teamMembers: project.teamMembers || [],
        });
      } else {
        setForm({
          name: "",
          description: "",
          status: "active",
          priority: "medium",
          color: PROJECT_COLORS[0],
          tags: [],
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          teamMembers: [],
        });
      }
      setTagInput("");
    }
  }, [open, project]);

  // ── Tag helpers ──
  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const normalized = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
      if (!form.tags?.includes(normalized)) {
        setForm((f) => ({ ...f, tags: [...(f.tags || []), normalized] }));
        toast.success(`Tag #${normalized} added`);
      }
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags?.filter((t) => t !== tag) }));
    toast.info(`Tag #${tag} removed`);
  };

  // ── Submit ──
  const handleSubmit = async () => {
    if (!form.name?.trim()) {
      toast.error("Project name is required");
      return;
    }

    setIsSaving(true);

    try {
      const saved: Project = {
        _id: project?._id || project?.id || "",
        id: project?.id || "",
        name: form.name.trim(),
        description: form.description?.trim() || "",
        status: form.status as Project["status"],
        priority: form.priority as Project["priority"],
        color: form.color || PROJECT_COLORS[0],
        tags: form.tags || [],
        startDate: form.startDate,
        endDate: form.endDate,
        teamMembers: form.teamMembers || [],
        tasksCount: project?.tasksCount || 0,
        completedTasks: project?.completedTasks || 0,
        isStarred: project?.isStarred || false,
        isArchived: form.status === "archived" || false,
        createdAt: project?.createdAt || new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString().split("T")[0],
      };

      await onSave(saved);
      // Toast will be handled by parent
    } catch (error) {
      console.error("❌ Submit error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save project",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = (form.name?.trim() ?? "").length > 0;
  const saving = isLoading || isSaving;

  // ── Render ──
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-violet-500" />
            {isEdit ? "Edit Project" : "New Project"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the project details below."
              : "Create a new project to organize your tasks."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Project Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. DevHub v2"
              className="text-sm h-10"
              autoFocus
              disabled={saving}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Textarea
              value={form.description || ""}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="What is this project about?"
              className="text-sm resize-none min-h-[60px]"
              rows={2}
              disabled={saving}
            />
          </div>

          {/* Color + Status + Priority */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Color</Label>
              <div className="flex flex-wrap gap-1.5">
                {PROJECT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setForm({ ...form, color })}
                    disabled={saving}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all border-2",
                      form.color === color
                        ? "border-violet-600 scale-110 ring-2 ring-violet-200"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v: Project["status"]) =>
                  setForm({ ...form, status: v })
                }
                disabled={saving}
              >
                <SelectTrigger className="text-sm h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v: Project["priority"]) =>
                  setForm({ ...form, priority: v })
                }
                disabled={saving}
              >
                <SelectTrigger className="text-sm h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Start Date</Label>
              <Input
                type="date"
                value={form.startDate || ""}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
                className="text-sm h-10"
                disabled={saving}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">End Date</Label>
              <Input
                type="date"
                value={form.endDate || ""}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="text-sm h-10"
                disabled={saving}
                min={form.startDate}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Tags</Label>
            {(form.tags?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tags?.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 text-[11px] bg-violet-50 text-violet-600 border-violet-200"
                  >
                    #{tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-violet-900 transition-colors"
                      disabled={saving}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Type tag and press Enter..."
              className="text-sm h-10"
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || saving}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isEdit ? "Saving..." : "Creating..."}
              </>
            ) : isEdit ? (
              "Update Project"
            ) : (
              "Create Project"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

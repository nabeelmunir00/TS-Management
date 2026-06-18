// components/ProjectFormModal.tsx
"use client";

import { useState, useEffect } from "react";
import { X, FolderPlus, Loader2 } from "lucide-react";
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
  onSave: (project: Project) => void;
  project?: Project | null;
}

export function ProjectFormModal({
  open,
  onClose,
  onSave,
  project = null,
}: ProjectFormModalProps) {
  const isEdit = !!project;
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

  useEffect(() => {
    if (open) {
      setForm(
        project || {
          name: "",
          description: "",
          status: "active",
          priority: "medium",
          color: PROJECT_COLORS[0],
          tags: [],
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          teamMembers: [],
        },
      );
      setTagInput("");
    }
  }, [open, project]);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const normalized = tagInput.trim().toLowerCase().replace(/\s+/g, "-");
      if (!form.tags?.includes(normalized)) {
        setForm((f) => ({ ...f, tags: [...(f.tags || []), normalized] }));
      }
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setForm((f) => ({ ...f, tags: f.tags?.filter((t) => t !== tag) }));
  };

  const handleSubmit = () => {
    if (!form.name?.trim()) return;
    setIsSaving(true);

    const saved: Project = {
      _id: project?._id || Date.now().toString(),
      id: project?.id || Date.now().toString(),
      name: form.name!,
      description: form.description || "",
      status: form.status as Project["status"],
      priority: form.priority as Project["priority"],
      color: form.color,
      tags: form.tags || [],
      startDate: form.startDate,
      endDate: form.endDate,
      teamMembers: form.teamMembers || [],
      tasksCount: 0,
      completedTasks: 0,
      isStarred: project?.isStarred || false,
      isArchived: form.status === "archived" || false,
      createdAt: project?.createdAt || new Date().toISOString().split("T")[0],
    };

    setTimeout(() => {
      onSave(saved);
      setIsSaving(false);
      onClose();
    }, 600);
  };

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
                    className={cn(
                      "w-6 h-6 rounded-full transition-all border-2",
                      form.color === color
                        ? "border-violet-600 scale-110"
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
              >
                <SelectTrigger className="text-sm h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
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
              >
                <SelectTrigger className="text-sm h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
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
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">End Date</Label>
              <Input
                type="date"
                value={form.endDate || ""}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="text-sm h-10"
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
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.name?.trim() || isSaving}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
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

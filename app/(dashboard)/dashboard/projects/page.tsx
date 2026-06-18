"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Archive,
  FolderOpen,
  FolderPlus,
  Users,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertCircle,
  LayoutGrid,
  ListFilter,
  SlidersHorizontal,
  X,
  Loader2,
  GitBranch,
  Star,
  StarOff,
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Project {
  _id: string;
  id?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  status: "active" | "completed" | "archived" | "on-hold";
  priority: "low" | "medium" | "high";
  startDate?: string;
  endDate?: string;
  teamMembers?: { name: string; avatar?: string; role?: string }[];
  tasksCount?: number;
  completedTasks?: number;
  tags?: string[];
  isStarred?: boolean;
  createdAt: string;
  updatedAt?: string;
}

type ProjectView = "list" | "grid";

// ─── Constants ──────────────────────────────────────────────────────────────

const PROJECT_COLORS = [
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#6366F1", // Indigo
  "#14B8A6", // Teal
];

const STATUS_CONFIG: Record<
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

const PRIORITY_CONFIG: Record<
  Project["priority"],
  { label: string; dot: string }
> = {
  high: { label: "High", dot: "bg-red-500" },
  medium: { label: "Medium", dot: "bg-amber-500" },
  low: { label: "Low", dot: "bg-emerald-500" },
};

// ─── Project Card ──────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onEdit,
  onDelete,
  onToggleStar,
  view = "grid",
}: {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
  onToggleStar: (id: string) => void;
  view?: ProjectView;
}) {
  const progress = project.tasksCount
    ? Math.round(((project.completedTasks || 0) / project.tasksCount) * 100)
    : 0;

  const statusInfo = STATUS_CONFIG[project.status];

  if (view === "list") {
    return (
      <div
        className={cn(
          "group relative bg-card border rounded-lg p-4 transition-all",
          "hover:border-violet-200 hover:shadow-sm",
          project.status === "archived" && "opacity-60",
        )}
      >
        <div className="flex items-center gap-4">
          {/* Color indicator */}
          <div
            className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white text-lg font-semibold"
            style={{ backgroundColor: project.color || PROJECT_COLORS[0] }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium truncate">{project.name}</h3>
              {project.isStarred && (
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              )}
              <Badge
                variant="outline"
                className={cn("text-[10px]", statusInfo.badge)}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full mr-1",
                    statusInfo.dot,
                  )}
                />
                {statusInfo.label}
              </Badge>
              <Badge variant="outline" className="text-[10px] capitalize">
                {project.priority}
              </Badge>
            </div>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {project.description}
              </p>
            )}
          </div>

          {/* Progress */}
          <div className="w-32">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Team */}
          {project.teamMembers && project.teamMembers.length > 0 && (
            <div className="flex items-center -space-x-2">
              {project.teamMembers.slice(0, 3).map((member, i) => (
                <Avatar key={i} className="w-6 h-6 border-2 border-background">
                  <AvatarImage src={member.avatar} alt={member.name} />
                  <AvatarFallback className="text-[8px] bg-violet-100 text-violet-700">
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {project.teamMembers.length > 3 && (
                <Avatar className="w-6 h-6 border-2 border-background bg-muted text-[8px]">
                  <AvatarFallback>
                    +{project.teamMembers.length - 3}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          )}

          {/* Actions */}
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
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => onToggleStar(project._id || project.id!)}
                className="text-xs gap-2 cursor-pointer"
              >
                {project.isStarred ? (
                  <StarOff className="w-3.5 h-3.5" />
                ) : (
                  <Star className="w-3.5 h-3.5" />
                )}
                {project.isStarred ? "Unstar" : "Star"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(project)}
                className="text-xs gap-2 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                <Archive className="w-3.5 h-3.5" /> Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(project._id || project.id!)}
                className="text-xs gap-2 text-destructive cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div
      className={cn(
        "group relative bg-card border rounded-lg p-4 transition-all",
        "hover:border-violet-200 hover:shadow-sm hover:-translate-y-0.5",
        project.status === "archived" && "opacity-60",
      )}
    >
      {/* Color bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
        style={{ backgroundColor: project.color || PROJECT_COLORS[0] }}
      />

      <div className="pt-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-medium truncate">{project.name}</h3>
              {project.isStarred && (
                <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
              )}
            </div>
            {project.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {project.description}
              </p>
            )}
          </div>

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
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => onToggleStar(project._id || project.id!)}
                className="text-xs gap-2 cursor-pointer"
              >
                {project.isStarred ? (
                  <StarOff className="w-3.5 h-3.5" />
                ) : (
                  <Star className="w-3.5 h-3.5" />
                )}
                {project.isStarred ? "Unstar" : "Star"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(project)}
                className="text-xs gap-2 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                <Archive className="w-3.5 h-3.5" /> Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(project._id || project.id!)}
                className="text-xs gap-2 text-destructive cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <Badge
            variant="outline"
            className={cn("text-[10px]", statusInfo.badge)}
          >
            <span
              className={cn("w-1.5 h-1.5 rounded-full mr-1", statusInfo.dot)}
            />
            {statusInfo.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] capitalize">
            {project.priority}
          </Badge>
          {project.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-[10px]">
              #{tag}
            </Badge>
          ))}
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5 mt-1" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            {project.teamMembers && project.teamMembers.length > 0 && (
              <div className="flex items-center -space-x-2">
                {project.teamMembers.slice(0, 2).map((member, i) => (
                  <Avatar
                    key={i}
                    className="w-5 h-5 border-2 border-background"
                  >
                    <AvatarImage src={member.avatar} alt={member.name} />
                    <AvatarFallback className="text-[7px] bg-violet-100 text-violet-700">
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {project.teamMembers.length > 2 && (
                  <Avatar className="w-5 h-5 border-2 border-background bg-muted text-[7px]">
                    <AvatarFallback>
                      +{project.teamMembers.length - 2}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            )}
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              {project.tasksCount || 0} tasks
            </span>
          </div>
          {project.endDate && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              {new Date(project.endDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Project Form Modal ──────────────────────────────────────────────────

function ProjectFormModal({
  open,
  onClose,
  onSave,
  project = null,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
  project?: Project | null;
}) {
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
      isStarred: false,
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

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { user, isLoaded } = useUser();

  // ── State ──
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ProjectView>("grid");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // ── Fetch Projects ──
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterPriority !== "all") params.append("priority", filterPriority);
      if (search) params.append("search", search);

      const res = await fetch(`/api/projects?${params}`);
      if (!res.ok) throw new Error("Failed to fetch projects");

      const data = await res.json();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [user?.id, filterStatus, filterPriority, search]);

  useEffect(() => {
    if (user?.id) fetchProjects();
  }, [isLoaded, user, fetchProjects]);

  // ── Handlers ──
  const openNewProject = () => {
    setEditingProject(null);
    setModalOpen(true);
  };

  const openEditProject = (project: Project) => {
    setEditingProject(project);
    setModalOpen(true);
  };

  const handleSave = async (saved: Project) => {
    try {
      const isEdit = !!saved._id;
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saved),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save project");
      }

      const data = await res.json();

      if (isEdit) {
        setProjects((prev) =>
          prev.map((p) => (p._id === saved._id ? data : p)),
        );
      } else {
        setProjects((prev) => [data, ...prev]);
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      alert(err instanceof Error ? err.message : "Failed to save project");
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;

    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete project");

      setProjects((prev) => prev.filter((p) => (p._id || p.id) !== id));
    } catch (err) {
      console.error("❌ Delete error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete project");
    }
  };

  const toggleStar = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-star" }),
      });

      if (!res.ok) throw new Error("Failed to toggle star");

      const data = await res.json();
      setProjects((prev) => prev.map((p) => (p._id === id ? data : p)));
    } catch (err) {
      console.error("❌ Toggle star error:", err);
    }
  };

  // ── Derived ──
  const filtered = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      (!q ||
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some((tag) => tag.toLowerCase().includes(q))) &&
      (filterStatus === "all" || p.status === filterStatus) &&
      (filterPriority === "all" || p.priority === filterPriority)
    );
  });

  const counts = {
    all: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    "on-hold": projects.filter((p) => p.status === "on-hold").length,
    completed: projects.filter((p) => p.status === "completed").length,
    archived: projects.filter((p) => p.status === "archived").length,
  };

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
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={fetchProjects} variant="outline" size="sm">
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
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-violet-500" />
              Projects
            </h1>
            <p className="text-xs text-muted-foreground">
              {counts.active} active · {counts["on-hold"]} on hold ·{" "}
              {counts.completed} completed
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={view === "grid" ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "rounded-none h-8 px-2.5",
                  view === "grid" &&
                    "bg-violet-600 hover:bg-violet-700 text-white",
                )}
                onClick={() => setView("grid")}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </Button>
              <Separator orientation="vertical" className="h-8" />
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
            </div>

            <Button
              size="sm"
              onClick={openNewProject}
              className="gap-1.5 h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              New Project
            </Button>
          </div>
        </header>

        {/* Status chips */}
        <div className="flex items-center gap-1.5 px-6 py-2 border-b overflow-x-auto shrink-0">
          {[
            { key: "all", label: "All" },
            { key: "active", label: "Active" },
            { key: "on-hold", label: "On Hold" },
            { key: "completed", label: "Completed" },
            { key: "archived", label: "Archived" },
          ].map((chip) => (
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
                {counts[chip.key as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-2 px-6 py-2 border-b shrink-0">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
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
                <SelectItem value="high">🔴 High</SelectItem>
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
                <FolderOpen className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-sm font-medium">No projects found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasFilters
                    ? "Try clearing your filters"
                    : "Create your first project"}
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
                    onClick={openNewProject}
                  >
                    <Plus className="w-3.5 h-3.5" /> New Project
                  </Button>
                )}
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.map((project) => (
                  <ProjectCard
                    key={project._id || project.id}
                    project={project}
                    onEdit={openEditProject}
                    onDelete={deleteProject}
                    onToggleStar={toggleStar}
                    view="grid"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-w-5xl">
                {filtered.map((project) => (
                  <ProjectCard
                    key={project._id || project.id}
                    project={project}
                    onEdit={openEditProject}
                    onDelete={deleteProject}
                    onToggleStar={toggleStar}
                    view="list"
                  />
                ))}
                <p className="text-[11px] text-muted-foreground text-center pt-2">
                  {filtered.length} of {projects.length} projects
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Project Form Modal */}
      <ProjectFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        project={editingProject}
      />
    </TooltipProvider>
  );
}

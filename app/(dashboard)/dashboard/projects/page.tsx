// app/projects/page.tsx
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  FolderOpen,
  LayoutGrid,
  ListFilter,
  SlidersHorizontal,
  X,
  Loader2,
  AlertCircle,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

import { Project } from "@/types/project";
import { STATUS_CHIPS } from "@/constants/project";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectFormModal } from "@/components/ProjectFormModal";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

type ProjectView = "list" | "grid";

// ─── Constants ──────────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: "all", label: "All" },
  { value: "high", label: "🔴 High" },
  { value: "medium", label: "🟡 Medium" },
  { value: "low", label: "🟢 Low" },
];

// ─── Main Component ──────────────────────────────────────────────────────────

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
  const [isSaving, setIsSaving] = useState(false);

  // Delete Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

      const res = await fetch(`/api/projects?${params.toString()}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch projects");
      }

      const data = await res.json();

      // Handle different response formats
      const projectsData = data.data || data;
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [user?.id, filterStatus, filterPriority, search]);

  useEffect(() => {
    if (isLoaded && user?.id) {
      fetchProjects();
    }
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

  const deleteProject = (id: string) => {
    const project = projects.find((p) => (p._id || p.id) === id);
    if (project) {
      setProjectToDelete(project);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);

    try {
      const id = projectToDelete._id || projectToDelete.id!;
      const res = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete project");
      }

      setProjects((prev) => prev.filter((p) => (p._id || p.id) !== id));
      setDeleteModalOpen(false);
      setProjectToDelete(null);
      toast.success("Project deleted successfully!");
    } catch (err) {
      console.error("❌ Delete error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to delete project",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (saved: Project) => {
    setIsSaving(true);

    try {
      let res;
      const isEdit = !!saved._id;

      if (isEdit) {
        // Edit: PATCH request with ID
        res = await fetch(`/api/projects/${saved._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saved),
        });
      } else {
        // Create: POST request
        res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saved),
        });
      }

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save project");
      }

      const data = await res.json();
      const savedProject = data.data || data;

      if (isEdit) {
        setProjects((prev) =>
          prev.map((p) => (p._id === saved._id ? savedProject : p)),
        );
        toast.success("Project updated successfully!");
      } else {
        setProjects((prev) => [savedProject, ...prev]);
        toast.success("Project created successfully!");
      }

      setModalOpen(false);
      setEditingProject(null);
    } catch (err) {
      console.error("❌ Save error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to save project",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStar = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-star" }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to toggle star");
      }

      const data = await res.json();
      const updatedProject = data.data || data;

      setProjects((prev) =>
        prev.map((p) => (p._id === id ? updatedProject : p)),
      );

      toast.success(
        updatedProject.isStarred
          ? "⭐ Project starred!"
          : "☆ Project unstarred",
      );
    } catch (err) {
      console.error("❌ Toggle star error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to toggle star");
    }
  };

  const toggleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-archive" }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to toggle archive");
      }

      const data = await res.json();
      const updatedProject = data.data || data;

      setProjects((prev) =>
        prev.map((p) => (p._id === id ? updatedProject : p)),
      );

      toast.success(
        updatedProject.isArchived
          ? "📦 Project archived!"
          : "📂 Project unarchived",
      );
    } catch (err) {
      console.error("❌ Toggle archive error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to toggle archive",
      );
    }
  };

  // ── Derived ──
  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.tags?.some((tag) => tag.toLowerCase().includes(q));

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "archived"
          ? p.isArchived === true
          : p.status === filterStatus && !p.isArchived);

      const matchesPriority =
        filterPriority === "all" || p.priority === filterPriority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [projects, search, filterStatus, filterPriority]);

  const counts = useMemo(
    () => ({
      all: projects.length,
      active: projects.filter((p) => !p.isArchived && p.status === "active")
        .length,
      "on-hold": projects.filter((p) => !p.isArchived && p.status === "on-hold")
        .length,
      completed: projects.filter(
        (p) => p.status === "completed" && !p.isArchived,
      ).length,
      archived: projects.filter((p) => p.isArchived === true).length,
    }),
    [projects],
  );

  const hasFilters =
    filterStatus !== "all" || filterPriority !== "all" || search !== "";

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("all");
    setFilterPriority("all");
    setShowFilters(false);
  };

  // ── Loading ──
  if (!isLoaded || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-sm text-muted-foreground">Loading projects...</p>
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
          onClick={fetchProjects}
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
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-violet-500" />
              Projects
            </h1>
            <p className="text-xs text-muted-foreground">
              {counts.active} active · {counts["on-hold"]} on hold ·{" "}
              {counts.completed} completed · {counts.archived} archived
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
                {PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
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
                    onToggleArchive={toggleArchive}
                    view="grid"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((project) => (
                  <ProjectCard
                    key={project._id || project.id}
                    project={project}
                    onEdit={openEditProject}
                    onDelete={deleteProject}
                    onToggleStar={toggleStar}
                    onToggleArchive={toggleArchive}
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
        onClose={() => {
          setModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSave}
        project={editingProject}
        isLoading={isSaving}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setProjectToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={projectToDelete?.name || "Untitled Project"}
        description="This will permanently delete the project and all its associated tasks."
        isLoading={isDeleting}
        type="project"
      />
    </TooltipProvider>
  );
}

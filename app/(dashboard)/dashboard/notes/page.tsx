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
  FileText,
  StickyNote,
  LayoutGrid,
  ListFilter,
  SlidersHorizontal,
  X,
  Loader2,
  AlertCircle,
  Calendar,
  Tag,
  Pin,
  PinOff,
  Clock,
  CheckCircle2,
  Sparkles,
  FolderOpen,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";

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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Note {
  _id: string;
  id?: string;
  title: string;
  content: string;
  category?: string;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  color?: string;
  reminderDate?: string;

  createdAt: string;
  updatedAt?: string;
}

interface Project {
  _id: string;
  name: string;
  color?: string;
}

type NoteView = "grid" | "list";

// ─── Constants ──────────────────────────────────────────────────────────────

const NOTE_COLORS = [
  "#FFFFFF",
  "#FEF3C7",
  "#D1FAE5",
  "#DBEAFE",
  "#E0E7FF",
  "#FCE7F3",
  "#F3E8FF",
  "#FECDD3",
  "#E5E7EB",
];

const CATEGORIES = [
  "Personal",
  "Work",
  "Ideas",
  "Tasks",
  "Meeting",
  "Study",
  "Project",
  "Other",
];

// ─── Note Card ──────────────────────────────────────────────────────────────

function NoteCard({
  note,
  onEdit,
  onDelete,
  onTogglePin,
  onToggleArchive,
  view = "grid",
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleArchive: (id: string) => void;
  view?: NoteView;
}) {
  const getInitials = (title: string) => {
    return title
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "Personal":
        return <FileText className="w-3 h-3" />;
      case "Work":
        return <Briefcase className="w-3 h-3" />;
      case "Ideas":
        return <Sparkles className="w-3 h-3" />;
      case "Tasks":
        return <CheckCircle2 className="w-3 h-3" />;
      case "Meeting":
        return <Users className="w-3 h-3" />;
      case "Study":
        return <BookOpen className="w-3 h-3" />;
      case "Project":
        return <FolderOpen className="w-3 h-3" />;
      default:
        return <StickyNote className="w-3 h-3" />;
    }
  };

  const Briefcase = ({ className }: { className?: string }) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );

  const Users = ({ className }: { className?: string }) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );

  const BookOpen = ({ className }: { className?: string }) => (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  );

  if (view === "list") {
    return (
      <div
        className={cn(
          "group relative bg-card border rounded-lg p-4 transition-all",
          "hover:border-violet-200 hover:shadow-sm",
          note.isArchived && "opacity-60",
          note.color && note.color !== "#FFFFFF" && "border-l-4",
        )}
        style={
          note.color && note.color !== "#FFFFFF"
            ? { borderLeftColor: note.color }
            : {}
        }
      >
        <div className="flex items-center gap-4">
          {/* Color indicator */}
          <div
            className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-lg font-semibold"
            style={{
              backgroundColor: note.color || "#F3F4F6",
              color:
                note.color && note.color !== "#FFFFFF" ? "#1F2937" : "#6B7280",
            }}
          >
            {getInitials(note.title)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium truncate">{note.title}</h3>
              {note.isPinned && (
                <Pin className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              )}
              {note.projectName && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1"
                  style={
                    note.projectColor
                      ? {
                          borderColor: note.projectColor,
                          color: note.projectColor,
                        }
                      : {}
                  }
                >
                  <FolderOpen className="w-3 h-3" />
                  {note.projectName}
                </Badge>
              )}
            </div>
            {note.content && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {note.content}
              </p>
            )}
          </div>

          {/* Tags */}
          {note.tags && note.tags.length > 0 && (
            <div className="flex items-center gap-1">
              {note.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  #{tag}
                </Badge>
              ))}
              {note.tags.length > 2 && (
                <Badge variant="outline" className="text-[10px]">
                  +{note.tags.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Reminder */}
          {note.reminderDate && (
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(note.reminderDate), "MMM d")}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reminder: {format(new Date(note.reminderDate), "PPP")}</p>
              </TooltipContent>
            </Tooltip>
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
                onClick={() => onTogglePin(note._id || note.id!)}
                className="text-xs gap-2 cursor-pointer"
              >
                {note.isPinned ? (
                  <PinOff className="w-3.5 h-3.5" />
                ) : (
                  <Pin className="w-3.5 h-3.5" />
                )}
                {note.isPinned ? "Unpin" : "Pin"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleArchive(note._id || note.id!)}
                className="text-xs gap-2 cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                {note.isArchived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onEdit(note)}
                className="text-xs gap-2 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                <Copy className="w-3.5 h-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(note._id || note.id!)}
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
        note.isArchived && "opacity-60",
        note.isPinned && "border-amber-200",
      )}
      style={
        note.color && note.color !== "#FFFFFF"
          ? { backgroundColor: note.color }
          : {}
      }
    >
      {/* Pin badge */}
      {note.isPinned && (
        <div className="absolute top-2 right-2">
          <Pin className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
        </div>
      )}

      <div className="pt-1">
        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium flex-1 truncate">{note.title}</h3>
        </div>

        {/* Content preview */}
        {note.content && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">
            {note.content}
          </p>
        )}

        {/* Project & Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {note.projectName && (
            <Badge
              variant="outline"
              className="text-[10px] gap-1"
              style={
                note.projectColor
                  ? { borderColor: note.projectColor, color: note.projectColor }
                  : {}
              }
            >
              <FolderOpen className="w-3 h-3" />
              {note.projectName}
            </Badge>
          )}
          {note.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px]">
              #{tag}
            </Badge>
          ))}
          {note.tags && note.tags.length > 2 && (
            <Badge variant="outline" className="text-[10px]">
              +{note.tags.length - 2}
            </Badge>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(note.createdAt), "MMM d")}
            </span>
          </div>
          {note.reminderDate && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(note.reminderDate), "MMM d")}
            </span>
          )}
        </div>
      </div>

      {/* Actions (hover) */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => onTogglePin(note._id || note.id!)}
              className="text-xs gap-2 cursor-pointer"
            >
              {note.isPinned ? (
                <PinOff className="w-3.5 h-3.5" />
              ) : (
                <Pin className="w-3.5 h-3.5" />
              )}
              {note.isPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onToggleArchive(note._id || note.id!)}
              className="text-xs gap-2 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              {note.isArchived ? "Unarchive" : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onEdit(note)}
              className="text-xs gap-2 cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(note._id || note.id!)}
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

// ─── Note Form Modal ──────────────────────────────────────────────────────

function NoteFormModal({
  open,
  onClose,
  onSave,
  note = null,
  projects = [],
}: {
  open: boolean;
  onClose: () => void;
  onSave: (note: Note) => void;
  note?: Note | null;
  projects?: Project[];
}) {
  const isEdit = !!note;
  const [form, setForm] = useState<Partial<Note>>({
    title: "",
    content: "",
    category: "",
    projectId: "",
    tags: [],
    color: "#FFFFFF",
    reminderDate: "",
  });
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        note || {
          title: "",
          content: "",
          projectId: "",
          tags: [],
          color: "#FFFFFF",
          reminderDate: "",
        },
      );
      setTagInput("");
    }
  }, [open, note]);

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
    if (!form.title?.trim()) return;
    setIsSaving(true);

    const saved: Note = {
      _id: note?._id || Date.now().toString(),
      id: note?.id || Date.now().toString(),
      title: form.title!,
      content: form.content || "",
      projectId: form.projectId || "",
      tags: form.tags || [],
      color: form.color || "#FFFFFF",
      reminderDate: form.reminderDate,
      isPinned: note?.isPinned || false,
      isArchived: note?.isArchived || false,
      createdAt: note?.createdAt || new Date().toISOString().split("T")[0],
    };

    setTimeout(() => {
      onSave(saved);
      setIsSaving(false);
      onClose();
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-violet-500" />
            {isEdit ? "Edit Note" : "New Note"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update your note details below."
              : "Capture your thoughts, ideas, and information."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Color picker */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Color</Label>
            <div className="flex flex-wrap gap-2">
              {NOTE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setForm({ ...form, color })}
                  className={cn(
                    "w-8 h-8 rounded-full transition-all border-2",
                    form.color === color
                      ? "border-violet-600 scale-110"
                      : "border-transparent hover:scale-105",
                  )}
                  style={{
                    backgroundColor: color,
                    borderColor: color === "#FFFFFF" ? "#E5E7EB" : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Note title..."
              className="text-sm h-10"
              autoFocus
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Content</Label>
            <Textarea
              value={form.content || ""}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Write your note here..."
              className="text-sm resize-none min-h-[120px]"
              rows={4}
            />
          </div>

          {/* Project + Reminder */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex iteam-center gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger className="text-sm h-10">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Label className="text-xs font-medium">Project</Label>
                  <Select
                    value={form.projectId || ""}
                    onValueChange={(v) => setForm({ ...form, projectId: v })}
                  >
                    <SelectTrigger className="text-sm h-10">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project._id} value={project._id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{
                                backgroundColor: project.color || "#6366f1",
                              }}
                            />
                            {project.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reminder</Label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !form.reminderDate && "text-muted-foreground",
                    )}
                  >
                    <Calendar className="mr-2 h-3.5 w-3.5" />
                    {form.reminderDate ? (
                      format(new Date(form.reminderDate), "PPP")
                    ) : (
                      <span>Set reminder</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={
                      form.reminderDate
                        ? new Date(form.reminderDate)
                        : undefined
                    }
                    onSelect={(date) => {
                      if (date) {
                        // Set to midnight to keep date only
                        date.setHours(0, 0, 0, 0);
                        setForm({
                          ...form,
                          reminderDate: date.toISOString().split("T")[0],
                        });
                      } else {
                        setForm({ ...form, reminderDate: "" });
                      }
                      setDatePickerOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1">
              <Tag className="w-3 h-3" /> Tags
            </Label>
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
            disabled={!form.title?.trim() || isSaving}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : isEdit ? (
              "Update Note"
            ) : (
              "Create Note"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function NotesPage() {
  const { user, isLoaded } = useUser();

  // ── State ──
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<NoteView>("grid");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterProject, setFilterProject] = useState("all");
  const [filterArchive, setFilterArchive] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  // Delete Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Fetch Notes ──
  const fetchNotes = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterCategory !== "all") params.append("category", filterCategory);
      if (filterProject !== "all") params.append("projectId", filterProject);
      if (filterArchive) params.append("archived", "true");

      const res = await fetch(`/api/notes?${params}`);
      if (!res.ok) throw new Error("Failed to fetch notes");

      const data = await res.json();
      setNotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [user?.id, search, filterCategory, filterProject, filterArchive]);

  // ── Fetch Projects ──
  const fetchProjects = useCallback(async () => {
    if (!user?.id) return;

    try {
      const res = await fetch("/api/projects?status=active");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (isLoaded && user?.id) {
      fetchNotes();
      fetchProjects();
    }
  }, [isLoaded, user, fetchNotes, fetchProjects]);

  // ── Handlers ──
  const openNewNote = () => {
    setEditingNote(null);
    setModalOpen(true);
  };

  const openEditNote = (note: Note) => {
    setEditingNote(note);
    setModalOpen(true);
  };

  const deleteNote = (id: string) => {
    const note = notes.find((n) => (n._id || n.id) === id);
    if (note) {
      setNoteToDelete(note);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;

    setIsDeleting(true);

    try {
      const id = noteToDelete._id || noteToDelete.id!;
      const res = await fetch(`/api/notes/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete note");

      setNotes((prev) => prev.filter((n) => (n._id || n.id) !== id));
      setDeleteModalOpen(false);
      setNoteToDelete(null);
    } catch (err) {
      console.error("❌ Delete error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (saved: Note) => {
    try {
      let res;

      if (editingNote) {
        res = await fetch(`/api/notes/${saved._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saved),
        });
      } else {
        res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(saved),
        });
      }

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save note");
      }

      const data = await res.json();

      if (editingNote) {
        setNotes((prev) => prev.map((n) => (n._id === saved._id ? data : n)));
      } else {
        setNotes((prev) => [data, ...prev]);
      }

      setEditingNote(null);
    } catch (err) {
      console.error("❌ Save error:", err);
      alert(err instanceof Error ? err.message : "Failed to save note");
    }
  };

  const togglePin = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-pin" }),
      });

      if (!res.ok) throw new Error("Failed to toggle pin");

      const data = await res.json();
      setNotes((prev) => prev.map((n) => (n._id === id ? data : n)));
    } catch (err) {
      console.error("❌ Toggle pin error:", err);
    }
  };

  const toggleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-archive" }),
      });

      if (!res.ok) throw new Error("Failed to toggle archive");

      const data = await res.json();
      setNotes((prev) => prev.map((n) => (n._id === id ? data : n)));
    } catch (err) {
      console.error("❌ Toggle archive error:", err);
    }
  };

  // ── Derived ──
  const filtered = notes.filter((n) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags?.some((tag) => tag.toLowerCase().includes(q));

    const matchesCategory =
      filterCategory === "all" ||
      n.tags?.includes(filterCategory.toLowerCase());

    const matchesProject =
      filterProject === "all" || n.projectId === filterProject;

    const matchesArchive = filterArchive ? n.isArchived : !n.isArchived;

    return matchesSearch && matchesCategory && matchesProject && matchesArchive;
  });

  // Sort: Pinned first, then by date
  const sorted = [...filtered].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const counts = {
    all: notes.length,
    pinned: notes.filter((n) => n.isPinned).length,
    archived: notes.filter((n) => n.isArchived).length,
    active: notes.filter((n) => !n.isArchived).length,
  };

  // Get unique tags for category filter
  const allTags = Array.from(
    new Set(notes.flatMap((n) => n.tags || [])),
  ).filter(Boolean);

  const hasFilters =
    filterCategory !== "all" ||
    filterProject !== "all" ||
    filterArchive ||
    search !== "";

  const clearFilters = () => {
    setSearch("");
    setFilterCategory("all");
    setFilterProject("all");
    setFilterArchive(false);
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
        <Button onClick={fetchNotes} variant="outline" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 border-b shrink-0">
          <div>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-violet-500" />
              Notes
            </h1>
            <p className="text-xs text-muted-foreground">
              {counts.pinned} pinned · {counts.active} active ·{" "}
              {counts.archived} archived
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
              onClick={openNewNote}
              className="gap-1.5 h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" />
              New Note
            </Button>
          </div>
        </header>

        {/* Category chips (Tags as categories) */}
        <div className="flex items-center gap-1.5 px-6 py-2 border-b overflow-x-auto shrink-0">
          <button
            onClick={() => setFilterCategory("all")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
              filterCategory === "all"
                ? "bg-violet-600 text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            All
            <span
              className={cn(
                "text-[10px] px-1.5 rounded-full",
                filterCategory === "all" ? "bg-white/20" : "bg-background",
              )}
            >
              {counts.all}
            </span>
          </button>
          {allTags.slice(0, 10).map((tag) => {
            const count = notes.filter(
              (n) => n.tags?.includes(tag) && !n.isArchived,
            ).length;
            if (count === 0) return null;
            return (
              <button
                key={tag}
                onClick={() => setFilterCategory(tag)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                  filterCategory === tag
                    ? "bg-violet-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                #{tag}
                <span
                  className={cn(
                    "text-[10px] px-1.5 rounded-full",
                    filterCategory === tag ? "bg-white/20" : "bg-background",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-2 px-6 py-2 border-b shrink-0">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search notes..."
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
          <Button
            variant={filterArchive ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 gap-1.5 text-xs",
              filterArchive && "bg-violet-600 hover:bg-violet-700 text-white",
            )}
            onClick={() => setFilterArchive(!filterArchive)}
          >
            <Archive className="w-3.5 h-3.5" />
            {filterArchive ? "Archived" : "Archive"}
          </Button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex items-center gap-3 px-6 py-2 border-b bg-muted/30 shrink-0 flex-wrap">
            <span className="text-xs text-muted-foreground">Project:</span>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="h-7 text-xs w-[150px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project._id} value={project._id}>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: project.color || "#6366f1" }}
                      />
                      {project.name}
                    </div>
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
            {sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <StickyNote className="w-12 h-12 text-muted-foreground/30 mb-4" />
                <h3 className="text-sm font-medium">No notes found</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasFilters
                    ? "Try clearing your filters"
                    : "Create your first note"}
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
                    onClick={openNewNote}
                  >
                    <Plus className="w-3.5 h-3.5" /> New Note
                  </Button>
                )}
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sorted.map((note) => (
                  <NoteCard
                    key={note._id || note.id}
                    note={note}
                    onEdit={openEditNote}
                    onDelete={deleteNote}
                    onTogglePin={togglePin}
                    onToggleArchive={toggleArchive}
                    view="grid"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-2 max-w-5xl">
                {sorted.map((note) => (
                  <NoteCard
                    key={note._id || note.id}
                    note={note}
                    onEdit={openEditNote}
                    onDelete={deleteNote}
                    onTogglePin={togglePin}
                    onToggleArchive={toggleArchive}
                    view="list"
                  />
                ))}
                <p className="text-[11px] text-muted-foreground text-center pt-2">
                  {sorted.length} of {notes.length} notes
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Note Form Modal */}
      <NoteFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingNote(null);
        }}
        onSave={handleSave}
        note={editingNote}
        projects={projects}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setNoteToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title={noteToDelete?.title || "Untitled Note"}
        description="This will permanently delete this note."
        isLoading={isDeleting}
        type="task"
      />
    </TooltipProvider>
  );
}

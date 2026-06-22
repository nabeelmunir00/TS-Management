"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Archive,
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
  Folder,
  User,
  Briefcase,
  Lightbulb,
  CalendarDays,
  GraduationCap,
  Rocket,
  Hash,
  RefreshCw,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
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
  noteId?: string;
  title: string;
  content: string;
  category?: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  color?: string;
  reminderDate?: string;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  updatedAt?: string;
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
  { id: "personal", label: "Personal", icon: User },
  { id: "work", label: "Work", icon: Briefcase },
  { id: "ideas", label: "Ideas", icon: Lightbulb },
  { id: "tasks", label: "Tasks", icon: CheckCircle2 },
  { id: "meeting", label: "Meeting", icon: CalendarDays },
  { id: "study", label: "Study", icon: GraduationCap },
  { id: "project", label: "Project", icon: Rocket },
  { id: "other", label: "Other", icon: Hash },
];

const CATEGORY_COLORS: Record<string, string> = {
  personal:
    "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
  work: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400",
  ideas:
    "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400",
  tasks:
    "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
  meeting:
    "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400",
  study:
    "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400",
  project:
    "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400",
  other:
    "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400",
};

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

  const getCategoryIcon = (categoryId?: string) => {
    if (!categoryId) return <StickyNote className="w-3 h-3" />;
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    const Icon = cat?.icon || StickyNote;
    return <Icon className="w-3 h-3" />;
  };

  const getCategoryLabel = (categoryId?: string) => {
    if (!categoryId) return "";
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    return cat?.label || categoryId;
  };

  const getCategoryColor = (categoryId?: string) => {
    if (!categoryId) return CATEGORY_COLORS.other;
    return CATEGORY_COLORS[categoryId] || CATEGORY_COLORS.other;
  };

  const isOverdue =
    note.reminderDate && new Date(note.reminderDate) < new Date();

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
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium truncate">{note.title}</h3>
              {note.isPinned && (
                <Pin className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              )}
              {note.category && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] gap-1",
                    getCategoryColor(note.category),
                  )}
                >
                  {getCategoryIcon(note.category)}
                  {getCategoryLabel(note.category)}
                </Badge>
              )}
              {isOverdue && !note.isArchived && (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Overdue
                </Badge>
              )}
            </div>
            {note.content && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {note.content}
              </p>
            )}
            {note.projectName && (
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <Folder className="w-3 h-3" />
                {note.projectName}
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
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-help">
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
        note.isPinned && "border-amber-200 dark:border-amber-800",
      )}
      style={
        note.color && note.color !== "#FFFFFF"
          ? { backgroundColor: note.color }
          : {}
      }
    >
      {/* Pin badge */}
      {note.isPinned && (
        <div className="absolute top-2 right-6">
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

        {/* Category & Tags */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {note.category && (
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] gap-1",
                getCategoryColor(note.category),
              )}
            >
              {getCategoryIcon(note.category)}
              {getCategoryLabel(note.category)}
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
          {isOverdue && !note.isArchived && (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertCircle className="w-3 h-3" />
              Overdue
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
            {note.projectName && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Folder className="w-3 h-3" />
                {note.projectName}
              </span>
            )}
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
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
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
  isLoading = false,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (note: Note) => Promise<void>;
  note?: Note | null;
  isLoading?: boolean;
}) {
  const isEdit = !!note?._id;
  const [form, setForm] = useState<Partial<Note>>({
    title: "",
    content: "",
    category: "",
    tags: [],
    color: "#FFFFFF",
    reminderDate: "",
  });
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (note) {
        setForm({
          title: note.title || "",
          content: note.content || "",
          category: note.category || "",
          tags: note.tags || [],
          color: note.color || "#FFFFFF",
          reminderDate: note.reminderDate || "",
          isPinned: note.isPinned || false,
          isArchived: note.isArchived || false,
        });
      } else {
        setForm({
          title: "",
          content: "",
          category: "",
          tags: [],
          color: "#FFFFFF",
          reminderDate: "",
          isPinned: false,
          isArchived: false,
        });
      }
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

  const handleSubmit = async () => {
    if (!form.title?.trim()) {
      toast.error("Note title is required");
      return;
    }

    setIsSaving(true);

    try {
      const saved: Note = {
        _id: note?._id || "",
        id: note?.id || "",
        title: form.title.trim(),
        content: form.content?.trim() || "",
        category: form.category || "",
        tags: form.tags || [],
        color: form.color || "#FFFFFF",
        reminderDate: form.reminderDate || "",
        isPinned: form.isPinned || false,
        isArchived: form.isArchived || false,
        createdAt: note?.createdAt || new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString().split("T")[0],
      };

      await onSave(saved);
    } catch (error) {
      console.error("❌ Submit error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save note",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isValid = form.title?.trim().length > 0;
  const saving = isLoading || isSaving;

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
                  disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
            />
          </div>

          {/* Category + Reminder */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Category</Label>
              <Select
                value={form.category || ""}
                onValueChange={(v) => setForm({ ...form, category: v })}
                disabled={saving}
              >
                <SelectTrigger className="text-sm h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Category</SelectItem>
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {cat.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
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
                    disabled={saving}
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
                    className="gap-1 text-[11px] bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400"
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<NoteView>("grid");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterArchive, setFilterArchive] = useState(false);
  const [filterPinned, setFilterPinned] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Fetch Notes ──
  const fetchNotes = useCallback(async () => {
    debugger;
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (filterCategory !== "all") params.append("category", filterCategory);
      if (filterArchive) params.append("archived", "true");
      if (filterPinned) params.append("pinned", "true");

      const res = await fetch(`/api/notes?${params.toString()}`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to fetch notes");
      }

      const data = await res.json();
      setNotes(data.data || data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [user?.id, search, filterCategory, filterArchive, filterPinned]);

  useEffect(() => {
    if (isLoaded && user?.id) {
      fetchNotes();
    }
  }, [isLoaded, user, fetchNotes]);

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

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to delete note");
      }

      setNotes((prev) => prev.filter((n) => (n._id || n.id) !== id));
      setDeleteModalOpen(false);
      setNoteToDelete(null);
      toast.success("Note deleted successfully!");
    } catch (err) {
      console.error("❌ Delete error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async (saved: Note) => {
    setIsSaving(true);

    try {
      let res;
      const isEdit = !!saved._id;

      if (isEdit) {
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
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save note");
      }

      const data = await res.json();
      const savedNote = data.data || data;

      if (isEdit) {
        setNotes((prev) =>
          prev.map((n) => (n._id === saved._id ? savedNote : n)),
        );
        toast.success("Note updated successfully!");
      } else {
        setNotes((prev) => [savedNote, ...prev]);
        toast.success("Note created successfully!");
      }

      setModalOpen(false);
      setEditingNote(null);
    } catch (err) {
      console.error("❌ Save error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const togglePin = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-pin" }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to toggle pin");
      }

      const data = await res.json();
      const updatedNote = data.data || data;

      setNotes((prev) => prev.map((n) => (n._id === id ? updatedNote : n)));
      toast.success(
        updatedNote.isPinned ? "📌 Note pinned!" : "📌 Note unpinned",
      );
    } catch (err) {
      console.error("❌ Toggle pin error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to toggle pin");
    }
  };

  const toggleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle-archive" }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to toggle archive");
      }

      const data = await res.json();
      const updatedNote = data.data || data;

      setNotes((prev) => prev.map((n) => (n._id === id ? updatedNote : n)));
      toast.success(
        updatedNote.isArchived ? "📦 Note archived!" : "📂 Note unarchived",
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
    return notes.filter((n) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags?.some((tag) => tag.toLowerCase().includes(q));

      const matchesCategory =
        filterCategory === "all" || n.category === filterCategory;

      const matchesArchive = filterArchive ? n.isArchived : !n.isArchived;
      const matchesPinned = filterPinned ? n.isPinned : true;

      return (
        matchesSearch && matchesCategory && matchesArchive && matchesPinned
      );
    });
  }, [notes, search, filterCategory, filterArchive, filterPinned]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filtered]);

  const counts = useMemo(
    () => ({
      all: notes.length,
      pinned: notes.filter((n) => n.isPinned && !n.isArchived).length,
      archived: notes.filter((n) => n.isArchived).length,
      active: notes.filter((n) => !n.isArchived).length,
    }),
    [notes],
  );

  const categoryCounts = useMemo(() => {
    return notes.reduce((acc: Record<string, number>, note) => {
      if (note.category && !note.isArchived) {
        acc[note.category] = (acc[note.category] || 0) + 1;
      }
      return acc;
    }, {});
  }, [notes]);

  const hasFilters =
    filterCategory !== "all" || filterArchive || filterPinned || search !== "";

  const clearFilters = () => {
    setSearch("");
    setFilterCategory("all");
    setFilterArchive(false);
    setFilterPinned(false);
    setShowFilters(false);
  };

  // ── Loading ──
  if (!isLoaded || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-sm text-muted-foreground">Loading notes...</p>
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
          onClick={fetchNotes}
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
              <StickyNote className="w-5 h-5 text-violet-500" />
              Notes
              <Badge variant="outline" className="ml-2 text-[10px] font-normal">
                {counts.active} active
              </Badge>
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

        {/* Category chips */}
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
            <Folder className="w-3 h-3" />
            All
            <span
              className={cn(
                "text-[10px] px-1.5 rounded-full",
                filterCategory === "all" ? "bg-white/20" : "bg-background",
              )}
            >
              {counts.active}
            </span>
          </button>
          {CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            if (count === 0) return null;
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0",
                  filterCategory === cat.id
                    ? "bg-violet-600 text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                <Icon className="w-3 h-3" />
                {cat.label}
                <span
                  className={cn(
                    "text-[10px] px-1.5 rounded-full",
                    filterCategory === cat.id ? "bg-white/20" : "bg-background",
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
          <Button
            variant={filterPinned ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-8 gap-1.5 text-xs",
              filterPinned && "bg-amber-500 hover:bg-amber-600 text-white",
            )}
            onClick={() => setFilterPinned(!filterPinned)}
          >
            <Pin className="w-3.5 h-3.5" />
            Pinned
          </Button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="flex items-center gap-3 px-6 py-2 border-b bg-muted/30 shrink-0 flex-wrap">
            <span className="text-xs text-muted-foreground">Category:</span>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-7 text-xs w-[150px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {cat.label}
                      </span>
                    </SelectItem>
                  );
                })}
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
              <div className="space-y-2">
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
        isLoading={isSaving}
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
        type="note"
      />
    </TooltipProvider>
  );
}

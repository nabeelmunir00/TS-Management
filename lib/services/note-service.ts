// lib/services/note-service.ts
import connectDB from "@/lib/db";
import NoteModel, { NoteCategory } from "@/lib/models/Note";
import ProjectModel from "@/lib/models/Project";
import { Types } from "mongoose";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateNoteInput {
  userId: string;
  projectId?: string;
  title: string;
  content?: string;
  category?: NoteCategory;
  tags?: string[];
  isPinned?: boolean;
  isArchived?: boolean;
  color?: string;
  reminderDate?: string | Date;
}

export interface UpdateNoteInput extends Partial<CreateNoteInput> {
  id: string;
  userId: string;
  action?: "toggle-pin" | "toggle-archive";
}

export interface NoteFilters {
  search?: string;
  category?: string;
  projectId?: string;
  archived?: boolean;
  pinned?: boolean;
  limit?: number;
  page?: number;
  sortBy?: "createdAt" | "updatedAt" | "title" | "reminderDate";
  sortOrder?: "asc" | "desc";
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// ─── Helper: Transform Note ─────────────────────────────────────────────────

function transformNote(note: any) {
  return {
    _id: note._id.toString(),
    id: note._id.toString(),
    noteId: note.noteId,
    title: note.title,
    content: note.content || "",
    projectId: note.projectId?._id?.toString() || note.projectId?.toString(),
    projectName: note.projectId?.name || null,
    projectColor: note.projectId?.color || null,
    isPinned: note.isPinned || false,
    isArchived: note.isArchived || false,
    category: note.category || "other",
    reminderDate: note.reminderDate
      ? new Date(note.reminderDate).toISOString().split("T")[0]
      : null,
    color: note.color || "#FFFFFF",
    tags: note.tags || [],
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    isOverdue: note.isOverdue || false,
    excerpt: note.excerpt || "",
  };
}

// ─── 1. CREATE NOTE ──────────────────────────────────────────────────────────

export async function createNote(data: CreateNoteInput) {
  try {
    await connectDB();

    // ✅ Validation
    if (!data.title || !data.title.trim()) {
      return { success: false, error: "Note title is required" };
    }

    if (data.title.length > 200) {
      return { success: false, error: "Title cannot exceed 200 characters" };
    }

    // ✅ Check project exists (if projectId provided)
    if (data.projectId) {
      const projectExists = await ProjectModel.exists({
        _id: data.projectId,
        userId: data.userId,
        isArchived: false,
      });

      if (!projectExists) {
        return {
          success: false,
          error: "Project not found or access denied",
        };
      }
    }

    // ✅ Prepare note data
    const noteData = {
      userId: data.userId,
      projectId: data.projectId
        ? new Types.ObjectId(data.projectId)
        : undefined,
      title: data.title.trim(),
      content: data.content?.trim() || "",
      category: data.category || "other",
      tags: data.tags || [],
      isPinned: data.isPinned || false,
      isArchived: data.isArchived || false,
      color: data.color || "#FFFFFF",
      reminderDate: data.reminderDate ? new Date(data.reminderDate) : undefined,
    };

    // ✅ Create note
    const note = await NoteModel.create(noteData);
    const noteObject = note.toObject();

    return {
      success: true,
      data: transformNote(noteObject),
    };
  } catch (error) {
    console.error("❌ Create note error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create note",
    };
  }
}

// ─── 2. GET ALL NOTES ────────────────────────────────────────────────────────

export async function getAllNotes(userId: string, filters?: NoteFilters) {
  try {
    await connectDB();

    const query: any = { userId };

    // ✅ Archived filter
    if (filters?.archived !== undefined) {
      query.isArchived = filters.archived;
    } else {
      query.isArchived = false;
    }

    // ✅ Pinned filter
    if (filters?.pinned !== undefined) {
      query.isPinned = filters.pinned;
    }

    // ✅ Project filter
    if (filters?.projectId) {
      if (!Types.ObjectId.isValid(filters.projectId)) {
        return { success: false, error: "Invalid project ID" };
      }
      query.projectId = new Types.ObjectId(filters.projectId);
    }

    // ✅ Category filter
    if (filters?.category && filters.category !== "all") {
      query.category = filters.category;
    }

    // ✅ Search
    if (filters?.search) {
      const searchRegex = new RegExp(filters.search, "i");
      query.$or = [
        { title: searchRegex },
        { content: searchRegex },
        { tags: searchRegex },
      ];
    }

    // ✅ Pagination
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(filters?.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    // ✅ Sorting
    const sortBy = filters?.sortBy || "createdAt";
    const sortOrder = filters?.sortOrder === "asc" ? 1 : -1;
    const sort: any = {
      isPinned: -1, // Pinned first
      [sortBy]: sortOrder,
    };

    // ✅ Execute query
    const [notes, total] = await Promise.all([
      NoteModel.find(query)
        .populate("projectId", "name color")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      NoteModel.countDocuments(query),
    ]);

    const transformedNotes = notes.map((note) => transformNote(note));

    return {
      success: true,
      data: transformedNotes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("❌ Get notes error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch notes",
    };
  }
}

// ─── 3. GET SINGLE NOTE ─────────────────────────────────────────────────────

export async function getNoteById(id: string, userId: string) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid note ID" };
    }

    const note = await NoteModel.findOne({
      _id: id,
      userId,
    })
      .populate("projectId", "name color")
      .lean();

    if (!note) {
      return { success: false, error: "Note not found" };
    }

    return {
      success: true,
      data: transformNote(note),
    };
  } catch (error) {
    console.error("❌ Get note error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch note",
    };
  }
}

// ─── 4. GET NOTE BY NOTE ID ─────────────────────────────────────────────────

export async function getNoteByNoteId(userId: string, noteId: string) {
  try {
    await connectDB();

    const note = await NoteModel.findOne({
      userId,
      noteId,
    })
      .populate("projectId", "name color")
      .lean();

    if (!note) {
      return { success: false, error: "Note not found" };
    }

    return {
      success: true,
      data: transformNote(note),
    };
  } catch (error) {
    console.error("❌ Get note by noteId error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch note",
    };
  }
}

// ─── 5. UPDATE NOTE ─────────────────────────────────────────────────────────

export async function updateNote(data: UpdateNoteInput) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(data.id)) {
      return { success: false, error: "Invalid note ID" };
    }

    // ✅ Check if note exists
    const existingNote = await NoteModel.findOne({
      _id: data.id,
      userId: data.userId,
    });

    if (!existingNote) {
      return { success: false, error: "Note not found" };
    }

    // ✅ Handle special actions
    if (data.action === "toggle-pin") {
      const note = await NoteModel.findOneAndUpdate(
        { _id: data.id, userId: data.userId },
        {
          $set: {
            isPinned: !existingNote.isPinned,
            updatedAt: new Date(),
          },
        },
        { new: true, lean: true },
      ).populate("projectId", "name color");

      return {
        success: true,
        data: transformNote(note),
      };
    }

    if (data.action === "toggle-archive") {
      const note = await NoteModel.findOneAndUpdate(
        { _id: data.id, userId: data.userId },
        {
          $set: {
            isArchived: !existingNote.isArchived,
            updatedAt: new Date(),
          },
        },
        { new: true, lean: true },
      ).populate("projectId", "name color");

      return {
        success: true,
        data: transformNote(note),
      };
    }

    // ✅ Build update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    const allowedFields = [
      "title",
      "content",
      "category",
      "tags",
      "isPinned",
      "isArchived",
      "color",
      "reminderDate",
      "projectId",
    ];

    allowedFields.forEach((field) => {
      if (data[field as keyof UpdateNoteInput] !== undefined) {
        if (field === "title") {
          updateData.title = data.title?.trim();
        } else if (field === "content") {
          updateData.content = data.content?.trim();
        } else if (field === "reminderDate" && data.reminderDate) {
          updateData.reminderDate = new Date(data.reminderDate);
        } else if (field === "projectId") {
          updateData.projectId = data.projectId
            ? new Types.ObjectId(data.projectId)
            : null;
        } else {
          updateData[field] = data[field as keyof UpdateNoteInput];
        }
      }
    });

    // ✅ Update note
    const note = await NoteModel.findOneAndUpdate(
      { _id: data.id, userId: data.userId },
      { $set: updateData },
      { new: true, runValidators: true, lean: true },
    ).populate("projectId", "name color");

    if (!note) {
      return { success: false, error: "Note not found" };
    }

    return {
      success: true,
      data: transformNote(note),
    };
  } catch (error) {
    console.error("❌ Update note error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update note",
    };
  }
}

// ─── 6. DELETE NOTE ─────────────────────────────────────────────────────────

export async function deleteNote(id: string, userId: string) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid note ID" };
    }

    const result = await NoteModel.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!result) {
      return { success: false, error: "Note not found" };
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Delete note error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete note",
    };
  }
}

// ─── 7. BULK DELETE NOTES ──────────────────────────────────────────────────

export async function bulkDeleteNotes(ids: string[], userId: string) {
  try {
    await connectDB();

    const validIds = ids.filter((id) => Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return { success: false, error: "No valid note IDs provided" };
    }

    const result = await NoteModel.deleteMany({
      _id: { $in: validIds },
      userId,
    });

    return {
      success: true,
      data: {
        deletedCount: result.deletedCount,
      },
    };
  } catch (error) {
    console.error("❌ Bulk delete notes error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete notes",
    };
  }
}

// ─── 8. GET NOTE STATS ─────────────────────────────────────────────────────

export async function getNoteStats(userId: string) {
  try {
    await connectDB();

    const [total, pinned, archived, active, categories] = await Promise.all([
      NoteModel.countDocuments({ userId }),
      NoteModel.countDocuments({ userId, isPinned: true, isArchived: false }),
      NoteModel.countDocuments({ userId, isArchived: true }),
      NoteModel.countDocuments({ userId, isArchived: false }),
      NoteModel.getCategoryStats(userId),
    ]);

    return {
      success: true,
      data: {
        total,
        pinned,
        archived,
        active,
        categories: categories.map((c) => ({
          name: c._id,
          count: c.count,
        })),
      },
    };
  } catch (error) {
    console.error("❌ Get note stats error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stats",
    };
  }
}

// ─── 9. SEARCH NOTES ───────────────────────────────────────────────────────

export async function searchNotes(
  userId: string,
  query: string,
  limit: number = 10,
) {
  try {
    await connectDB();

    if (!query.trim()) {
      return { success: true, data: [] };
    }

    const searchRegex = new RegExp(query, "i");
    const notes = await NoteModel.find({
      userId,
      isArchived: false,
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { tags: searchRegex },
      ],
    })
      .sort({ isPinned: -1, updatedAt: -1 })
      .limit(Math.min(limit, 50))
      .populate("projectId", "name color")
      .lean();

    return {
      success: true,
      data: notes.map((note) => transformNote(note)),
    };
  } catch (error) {
    console.error("❌ Search notes error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search notes",
    };
  }
}

// ─── 10. GET RECENT NOTES ──────────────────────────────────────────────────

export async function getRecentNotes(userId: string, limit: number = 5) {
  try {
    await connectDB();

    const notes = await NoteModel.find({
      userId,
      isArchived: false,
    })
      .sort({ updatedAt: -1 })
      .limit(Math.min(limit, 20))
      .populate("projectId", "name color")
      .lean();

    return {
      success: true,
      data: notes.map((note) => transformNote(note)),
    };
  } catch (error) {
    console.error("❌ Get recent notes error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch recent notes",
    };
  }
}

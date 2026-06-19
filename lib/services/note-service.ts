// lib/services/note-service.ts
import connectDB from "@/lib/db";
import Note from "@/lib/models/Note";
import Project from "@/lib/models/Project";
import { Types } from "mongoose";

export interface NoteData {
  userId: string;
  projectId?: string;
  title: string;
  content?: string;
  isPinned?: boolean;
  category?: string;
  reminderDate?: string;
  color?: string;
  tags?: string[];
  isArchived?: boolean;
}

export interface UpdateNoteData extends Partial<NoteData> {
  action?: "toggle-pin" | "toggle-archive";
}

class NoteService {
  // ─── Create Note ──────────────────────────────────────────────────────
  async createNote(data: NoteData) {
    await connectDB();

    const noteData = {
      userId: data.userId,
      projectId: data.projectId
        ? new Types.ObjectId(data.projectId)
        : undefined,
      title: data.title,
      content: data.content || "",
      isPinned: data.isPinned || false,
      color: data.color || "#ffffff",
      tags: data.tags || [],
      isArchived: data.isArchived || false,
      category: data.category || "",
      reminderDate: data.reminderDate || "",
    };

    const note = new Note(noteData);
    await note.save();

    return this.transformNote(note);
  }

  // ─── Get All Notes ────────────────────────────────────────────────────
  async getNotes(
    userId: string,
    filters?: {
      search?: string;
      category?: string;
      archived?: boolean;
      projectId?: string;
      limit?: number;
    },
  ) {
    await connectDB();

    let query: any = { userId };

    // Archived filter
    if (filters?.archived !== undefined) {
      query.isArchived = filters.archived;
    } else {
      query.isArchived = false; // Default: show only active notes
    }

    // Project filter
    if (filters?.projectId) {
      query.projectId = new Types.ObjectId(filters.projectId);
    }

    // Search
    if (filters?.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { content: { $regex: filters.search, $options: "i" } },
        { tags: { $regex: filters.search, $options: "i" } },
      ];
    }

    // Category filter (tags)
    if (filters?.category) {
      query.tags = { $in: [filters.category] };
    }

    const limit = filters?.limit || 100;

    const notes = await Note.find(query)
      .sort({ isPinned: -1, updatedAt: -1 })
      .limit(limit)
      .lean();

    return notes.map(this.transformNote);
  }

  // ─── Get Single Note ──────────────────────────────────────────────────
  async getNoteById(userId: string, noteId: string) {
    await connectDB();

    const note = await Note.findOne({
      _id: noteId,
      userId,
    })
      .populate("projectId", "name color")
      .lean();

    if (!note) return null;

    return this.transformNote(note);
  }

  // ─── Update Note ──────────────────────────────────────────────────────
  async updateNote(userId: string, noteId: string, data: UpdateNoteData) {
    await connectDB();

    // Handle special actions
    if (data.action === "toggle-pin") {
      const note = await Note.findOne({ _id: noteId, userId });
      if (!note) return null;

      note.isPinned = !note.isPinned;
      note.updatedAt = new Date();
      await note.save();

      return this.transformNote(note);
    }

    if (data.action === "toggle-archive") {
      const note = await Note.findOne({ _id: noteId, userId });
      if (!note) return null;

      note.isArchived = !note.isArchived;
      note.updatedAt = new Date();
      await note.save();

      return this.transformNote(note);
    }

    // Regular update
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.reminderDate !== undefined)
      updateData.reminderDate = data.reminderDate;
    if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;
    if (data.projectId !== undefined) {
      updateData.projectId = data.projectId
        ? new Types.ObjectId(data.projectId)
        : null;
    }

    const note = await Note.findOneAndUpdate(
      { _id: noteId, userId },
      updateData,
      { new: true, runValidators: true },
    )
      .populate("projectId", "name color")
      .lean();

    if (!note) return null;

    return this.transformNote(note);
  }

  // ─── Delete Note ──────────────────────────────────────────────────────
  async deleteNote(userId: string, noteId: string) {
    await connectDB();

    const result = await Note.findOneAndDelete({
      _id: noteId,
      userId,
    });

    return result !== null;
  }

  // ─── Bulk Delete ──────────────────────────────────────────────────────
  async bulkDeleteNotes(userId: string, noteIds: string[]) {
    await connectDB();

    const result = await Note.deleteMany({
      _id: { $in: noteIds },
      userId,
    });

    return result.deletedCount || 0;
  }

  // ─── Get Note Statistics ─────────────────────────────────────────────
  async getNoteStats(userId: string) {
    await connectDB();

    const [total, pinned, archived, active] = await Promise.all([
      Note.countDocuments({ userId }),
      Note.countDocuments({ userId, isPinned: true, isArchived: false }),
      Note.countDocuments({ userId, isArchived: true }),
      Note.countDocuments({ userId, isArchived: false }),
    ]);

    // Get categories (tags) with counts
    const categories = await Note.aggregate([
      { $match: { userId, isArchived: false } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return {
      total,
      pinned,
      archived,
      active,
      categories: categories.map((c) => ({
        name: c._id,
        count: c.count,
      })),
    };
  }

  // ─── Transform Note (Helper) ─────────────────────────────────────────
  private transformNote(note: any) {
    return {
      _id: note._id.toString(),
      id: note._id.toString(),
      title: note.title,
      content: note.content || "",
      projectId: note.projectId?._id?.toString() || note.projectId?.toString(),
      projectName: note.projectId?.name || null,
      projectColor: note.projectId?.color || null,
      isPinned: note.isPinned || false,
      isArchived: note.isArchived || false,
      category: note.category || "",
      reminderDate: note.reminderDate || "",
      color: note.color || "#ffffff",
      tags: note.tags || [],
      createdAt: note.createdAt.toISOString().split("T")[0],
      updatedAt: note.updatedAt.toISOString().split("T")[0],
    };
  }
}

export const noteService = new NoteService();
export default noteService;

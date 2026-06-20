// models/Note.ts
import mongoose, { Schema, Document, Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";

// ─── Types ──────────────────────────────────────────────────────────────────

export type NoteCategory =
  | "personal"
  | "work"
  | "ideas"
  | "tasks"
  | "meeting"
  | "study"
  | "project"
  | "other";

export interface INote extends Document {
  userId: string;
  noteId: string;
  projectId?: mongoose.Types.ObjectId;
  title: string;
  content: string;
  category: NoteCategory;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  color: string;
  reminderDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const NoteSchema = new Schema<INote>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    noteId: {
      type: String,
      required: [true, "Note ID is required"],
      unique: true,
      index: true,
      trim: true,
      default: () => `NOTE-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Note title is required"],
      trim: true,
      minlength: [1, "Title cannot be empty"],
      maxlength: [200, "Title cannot exceed 200 characters"],
      index: true,
    },
    content: {
      type: String,
      default: "",
      trim: true,
      maxlength: [10000, "Content cannot exceed 10000 characters"],
    },
    category: {
      type: String,
      enum: {
        values: [
          "personal",
          "work",
          "ideas",
          "tasks",
          "meeting",
          "study",
          "project",
          "other",
        ],
        message: "Invalid category",
      },
      default: "other",
      trim: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
      validate: {
        validator: function (tags: string[]) {
          return tags.length <= 20;
        },
        message: "Cannot have more than 20 tags",
      },
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    color: {
      type: String,
      default: "#FFFFFF",
      validate: {
        validator: function (value: string) {
          return /^#([0-9A-F]{3}){1,2}$/i.test(value);
        },
        message: "Color must be a valid hex color code",
      },
    },
    reminderDate: {
      type: Date,
      required: false,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: true,
    },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

NoteSchema.index({ userId: 1, isArchived: 1, isPinned: 1 });
NoteSchema.index({ userId: 1, category: 1, isArchived: 1 });
NoteSchema.index({ userId: 1, projectId: 1, isArchived: 1 });
NoteSchema.index({ userId: 1, reminderDate: 1 });
NoteSchema.index({ userId: 1, createdAt: -1 });
NoteSchema.index({ userId: 1, title: "text", content: "text" });
NoteSchema.index({ noteId: 1 });

// ─── Virtuals ──────────────────────────────────────────────────────────────────

NoteSchema.virtual("isOverdue").get(function (this: INote) {
  if (!this.reminderDate) return false;
  return this.reminderDate < new Date() && !this.isArchived;
});

NoteSchema.virtual("excerpt").get(function (this: INote) {
  if (this.content.length <= 150) return this.content;
  return this.content.slice(0, 150) + "...";
});

// ─── Statics Interface ──────────────────────────────────────────────────────

interface INoteModel extends Model<INote> {
  findByNoteId(userId: string, noteId: string): Promise<INote | null>;
  findPinned(userId: string): Promise<INote[]>;
  findArchived(userId: string): Promise<INote[]>;
  getCategoryStats(userId: string): Promise<any[]>;
}

// ─── Static Methods ──────────────────────────────────────────────────────────

NoteSchema.statics.findByNoteId = async function (
  userId: string,
  noteId: string,
): Promise<INote | null> {
  return this.findOne({ userId, noteId }).exec();
};

NoteSchema.statics.findPinned = async function (
  userId: string,
): Promise<INote[]> {
  return this.find({
    userId,
    isPinned: true,
    isArchived: false,
  })
    .sort({ updatedAt: -1 })
    .lean();
};

NoteSchema.statics.findArchived = async function (
  userId: string,
): Promise<INote[]> {
  return this.find({
    userId,
    isArchived: true,
  })
    .sort({ updatedAt: -1 })
    .lean();
};

NoteSchema.statics.getCategoryStats = async function (
  userId: string,
): Promise<any[]> {
  return this.aggregate([
    { $match: { userId, isArchived: false } },
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
  ]);
};

// ─── Middleware ──────────────────────────────────────────────────────────────

NoteSchema.pre("save", async function (this: INote) {
  if (this.isNew && !this.noteId) {
    this.noteId = `NOTE-${uuidv4().slice(0, 8).toUpperCase()}`;
  }
});

// ─── Model ──────────────────────────────────────────────────────────────────

const NoteModel: INoteModel =
  (mongoose.models.Note as INoteModel) ||
  mongoose.model<INote, INoteModel>("Note", NoteSchema);

export default NoteModel;

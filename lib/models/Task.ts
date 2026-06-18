// models/Task.ts
import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in-progress" | "review" | "done";

export interface ISubtask {
  title: string;
  done: boolean;
}

export interface IAttachment {
  name: string;
  url: string;
  type: string;
}

export interface ITask extends Document {
  userId: string;
  projectId?: mongoose.Types.ObjectId;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: Date;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo?: string;
  tags: string[];
  subtasks: ISubtask[];
  attachments: IAttachment[];
  aiSuggestions?: string;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const TaskSchema = new Schema<ITask>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false,
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      default: "",
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: ["todo", "in-progress", "review", "done"],
      default: "todo",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    dueDate: {
      type: Date,
      required: false,
    },
    estimatedHours: {
      type: Number,
      min: 0,
      max: 1000,
      required: false,
    },
    actualHours: {
      type: Number,
      min: 0,
      max: 1000,
      required: false,
    },
    assignedTo: {
      type: String,
      required: false,
    },
    tags: {
      type: [String],
      default: [],
    },
    subtasks: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
        },
        done: {
          type: Boolean,
          default: false,
        },
      },
    ],
    attachments: [
      {
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true,
        },
      },
    ],
    aiSuggestions: {
      type: String,
      required: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: true,
    },
  },
);

// ─── Indexes for Performance ──────────────────────────────────────────────

TaskSchema.index({ userId: 1, status: 1 });
TaskSchema.index({ userId: 1, priority: 1 });
TaskSchema.index({ userId: 1, dueDate: 1 });
TaskSchema.index({ userId: 1, projectId: 1 });
TaskSchema.index({ tags: 1 });

// ─── Middleware ────────────────────────────────────────────────────────────

// Update timestamps on save
TaskSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// ─── Model ──────────────────────────────────────────────────────────────────

const TaskModel: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>("Task", TaskSchema);

export default TaskModel;

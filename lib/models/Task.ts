// models/Task.ts
import mongoose, { Schema, Document, Model } from "mongoose";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Priority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in-progress" | "review" | "done";

export interface ISubtask {
  title: string;
  done: boolean;
  _id?: mongoose.Types.ObjectId;
}

export interface IAttachment {
  name: string;
  url: string;
  type: string;
  _id?: mongoose.Types.ObjectId;
}

export interface ITask extends Document {
  userId: string;
  taskId: string;
  projectId?: mongoose.Types.ObjectId;
  projectName?: string;
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
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  isOverdue: boolean;
  completionPercentage: number;
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const TaskSchema = new Schema<ITask>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    taskId: {
      type: String,
      required: [true, "Task ID is required"],
      unique: true,
      index: true,
      trim: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: false,
      index: true,
    },
    projectName: {
      type: String,
      required: false,
      trim: true,
      maxlength: [100, "Project name cannot exceed 100 characters"],
    },
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [1, "Title cannot be empty"],
      maxlength: [200, "Title cannot exceed 200 characters"],
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: ["todo", "in-progress", "review", "done"],
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },
    dueDate: {
      type: Date,
      required: false,
      index: true,
      validate: {
        validator: function (value: Date) {
          return !value || value >= new Date(Date.now() - 86400000); // Can't be more than 1 day in past
        },
        message: "Due date cannot be in the past",
      },
    },
    estimatedHours: {
      type: Number,
      min: [0, "Estimated hours cannot be negative"],
      max: [1000, "Estimated hours cannot exceed 1000"],
      required: false,
    },
    actualHours: {
      type: Number,
      min: [0, "Actual hours cannot be negative"],
      max: [1000, "Actual hours cannot exceed 1000"],
      required: false,
    },
    assignedTo: {
      type: String,
      required: false,
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
    subtasks: [
      {
        title: {
          type: String,
          required: [true, "Subtask title is required"],
          trim: true,
          maxlength: [100, "Subtask title cannot exceed 100 characters"],
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
          required: [true, "Attachment name is required"],
          trim: true,
          maxlength: [255, "Attachment name cannot exceed 255 characters"],
        },
        url: {
          type: String,
          required: [true, "Attachment URL is required"],
          trim: true,
        },
        type: {
          type: String,
          required: [true, "Attachment type is required"],
          trim: true,
          enum: ["image", "document", "spreadsheet", "pdf", "other"],
        },
      },
    ],
    aiSuggestions: {
      type: String,
      required: false,
      maxlength: [5000, "AI suggestions cannot exceed 5000 characters"],
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
      required: false,
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

// Compound indexes for common queries
TaskSchema.index({ userId: 1, status: 1, isArchived: 1 });
TaskSchema.index({ userId: 1, projectId: 1, status: 1 });
TaskSchema.index({ userId: 1, priority: 1, isArchived: 1 });
TaskSchema.index({ userId: 1, dueDate: 1 });
TaskSchema.index({ userId: 1, createdAt: -1 });
TaskSchema.index({ userId: 1, title: "text" });

// ─── Virtuals ──────────────────────────────────────────────────────────────────

TaskSchema.virtual("isOverdue").get(function (this: ITask) {
  if (!this.dueDate) return false;
  return this.dueDate < new Date() && this.status !== "done";
});

TaskSchema.virtual("completionPercentage").get(function (this: ITask) {
  if (!this.subtasks || this.subtasks.length === 0) {
    return this.status === "done" ? 100 : 0;
  }
  const doneCount = this.subtasks.filter((st) => st.done).length;
  return Math.round((doneCount / this.subtasks.length) * 100);
});

// ─── Middleware ──────────────────────────────────────────────────────────────

// Pre-save: Generate taskId
TaskSchema.pre("save", async function (this: ITask) {
  if (this.isNew && !this.taskId) {
    const count = await TaskModel.countDocuments({ userId: this.userId });
    this.taskId = `TASK-${String(count + 1).padStart(3, "0")}`;
  }

  // Auto-set completedAt when status changes to 'done'
  if (this.isModified("status") && this.status === "done") {
    this.completedAt = new Date();
  }

  // Clear completedAt if status changes from 'done'
  if (this.isModified("status") && this.status !== "done") {
    this.completedAt = undefined;
  }

  // Calculate actual hours if not provided and status is done
  if (
    this.isModified("status") &&
    this.status === "done" &&
    !this.actualHours
  ) {
    // If estimated hours exist, use that as actual
    if (this.estimatedHours) {
      this.actualHours = this.estimatedHours;
    }
  }
});

// Pre-find: Filter archived by default
TaskSchema.pre(/^find/, function (this: mongoose.Query<any, ITask>) {
  // Only apply if not explicitly asked to include archived
  if (this.getOptions().includeArchived !== true) {
    this.where({ isArchived: false });
  }
});

// ─── Statics ──────────────────────────────────────────────────────────────────

interface ITaskModel extends Model<ITask> {
  findByTaskId(userId: string, taskId: string): Promise<ITask | null>;
  findOverdue(userId: string): Promise<ITask[]>;
  findCompleted(userId: string): Promise<ITask[]>;
  getDashboardStats(userId: string): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    overdue: number;
    highPriority: number;
  }>;
}

// ─── Static Methods ──────────────────────────────────────────────────────────

TaskSchema.statics.findByTaskId = async function (
  userId: string,
  taskId: string,
): Promise<ITask | null> {
  return this.findOne({ userId, taskId }).exec();
};

TaskSchema.statics.findOverdue = async function (
  userId: string,
): Promise<ITask[]> {
  return this.find({
    userId,
    dueDate: { $lt: new Date() },
    status: { $ne: "done" },
  }).sort({ dueDate: 1 });
};

TaskSchema.statics.findCompleted = async function (
  userId: string,
): Promise<ITask[]> {
  return this.find({
    userId,
    status: "done",
  })
    .sort({ completedAt: -1 })
    .limit(50);
};

TaskSchema.statics.getDashboardStats = async function (
  userId: string,
): Promise<{
  total: number;
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  overdue: number;
  highPriority: number;
}> {
  const [stats] = await this.aggregate([
    {
      $match: {
        userId,
        isArchived: false,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        todo: {
          $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] },
        },
        inProgress: {
          $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
        },
        review: {
          $sum: { $cond: [{ $eq: ["$status", "review"] }, 1, 0] },
        },
        done: {
          $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
        },
        highPriority: {
          $sum: {
            $cond: [{ $in: ["$priority", ["high", "urgent"]] }, 1, 0],
          },
        },
        overdue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $lt: ["$dueDate", new Date()] },
                  { $ne: ["$status", "done"] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

  return (
    stats || {
      total: 0,
      todo: 0,
      inProgress: 0,
      review: 0,
      done: 0,
      overdue: 0,
      highPriority: 0,
    }
  );
};

// ─── Model ──────────────────────────────────────────────────────────────────

const TaskModel: ITaskModel =
  (mongoose.models.Task as ITaskModel) ||
  mongoose.model<ITask, ITaskModel>("Task", TaskSchema);

export default TaskModel;

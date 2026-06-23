// models/Project.ts
import mongoose, { Schema, Document, Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import TaskModel from "./Task";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "on-hold" | "completed" | "archived";
export type ProjectPriority = "low" | "medium" | "high" | "critical";
export type TaskStatus = "todo" | "in-progress" | "review" | "done";

export interface ITeamMember {
  userId: string;
  name: string;
  avatar?: string;
  role: string;
  email?: string;
  joinedAt?: Date;
  _id?: mongoose.Types.ObjectId;
}

export interface IProject extends Document {
  userId: string;
  projectId: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  isFavorite: boolean;
  isArchived: boolean;
  tags: string[];
  startDate?: Date;
  endDate?: Date;
  teamMembers: ITeamMember[];
  tasksCount: number;
  completedTasks: number;
  createdAt: Date;
  updatedAt: Date;

  // Virtuals
  progress: number;
  isOverdue: boolean;
  isActive: boolean;
}

// ─── Schema ─────────────────────────────────────────────────────────────────

const ProjectSchema = new Schema<IProject>(
  {
    userId: {
      type: String,
      required: [true, "User ID is required"],
      index: true,
    },
    projectId: {
      type: String,
      required: [true, "Project ID is required"],
      unique: true,
      index: true,
      trim: true,
      default: () => `PROJ-${uuidv4().slice(0, 8).toUpperCase()}`,
    },
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [1, "Project name cannot be empty"],
      maxlength: [100, "Project name cannot exceed 100 characters"],
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    color: {
      type: String,
      default: "#6366f1",
      validate: {
        validator: function (value: string) {
          return /^#([0-9A-F]{3}){1,2}$/i.test(value);
        },
        message: "Color must be a valid hex color code",
      },
    },
    icon: {
      type: String,
      default: "",
      trim: true,
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high", "critical"],
        message: "Priority must be low, medium, high, or critical",
      },
      default: "medium",
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ["active", "on-hold", "completed", "archived"],
        message: "Status must be active, on-hold, completed, or archived",
      },
      default: "active",
      index: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
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
    startDate: {
      type: Date,
      required: false,
    },
    endDate: {
      type: Date,
      required: false,
      validate: {
        validator: function (this: any, value: Date) {
          if (!this.startDate || !value) return true;
          return value >= this.startDate;
        },
        message: "End date cannot be before start date",
      },
    },
    teamMembers: [
      {
        userId: {
          type: String,
          required: [true, "User ID is required"],
          index: true,
        },
        name: {
          type: String,
          required: [true, "Team member name is required"],
          trim: true,
          maxlength: [100, "Name cannot exceed 100 characters"],
        },
        avatar: {
          type: String,
          required: false,
          trim: true,
        },
        role: {
          type: String,
          required: [true, "Role is required"],
          trim: true,
          maxlength: [50, "Role cannot exceed 50 characters"],
        },
        email: {
          type: String,
          required: false,
          trim: true,
          match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    tasksCount: {
      type: Number,
      default: 0,
      min: [0, "Tasks count cannot be negative"],
    },
    completedTasks: {
      type: Number,
      default: 0,
      min: [0, "Completed tasks count cannot be negative"],
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

ProjectSchema.index({ userId: 1, status: 1, isArchived: 1 });
ProjectSchema.index({ userId: 1, isFavorite: 1, isArchived: 1 });
ProjectSchema.index({ userId: 1, priority: 1, isArchived: 1 });
ProjectSchema.index({ userId: 1, createdAt: -1 });
ProjectSchema.index({ userId: 1, name: "text" });

// ─── Virtuals ──────────────────────────────────────────────────────────────────

ProjectSchema.virtual("progress").get(function (this: IProject) {
  if (this.tasksCount === 0) return 0;
  return Math.round((this.completedTasks / this.tasksCount) * 100);
});

ProjectSchema.virtual("isOverdue").get(function (this: IProject) {
  if (!this.endDate) return false;
  return (
    this.endDate < new Date() &&
    this.status !== "completed" &&
    this.status !== "archived"
  );
});

ProjectSchema.virtual("isActive").get(function (this: IProject) {
  return this.status === "active" && !this.isArchived;
});

// ─── Statics Interface ──────────────────────────────────────────────────────

interface IProjectModel extends Model<IProject> {
  // ✅ Simple flag-based update
  updateTaskCounts(
    projectId: mongoose.Types.ObjectId,
    action: "taskCreated" | "taskDeleted" | "taskCompleted" | "taskUncompleted",
  ): Promise<void>;

  // ✅ Recalculate (safety net)
  recalculateTaskCounts(projectId: mongoose.Types.ObjectId): Promise<void>;

  // ✅ Other static methods
  findByProjectId(userId: string, projectId: string): Promise<IProject | null>;
  findActive(userId: string): Promise<IProject[]>;
  findFavorite(userId: string): Promise<IProject[]>;
  getDashboardStats(userId: string): Promise<any>;
  getProjectsWithTaskStats(userId: string): Promise<any[]>;
}

// ─── ⭐ MAIN: updateTaskCounts with Simple Flags ───────────────────────────

/**
 * ✅ SIMPLE & PRODUCTION-READY
 * Each action has a specific purpose
 *
 * @param projectId - Project ID to update
 * @param action - 'taskCreated' | 'taskDeleted' | 'taskCompleted' | 'taskUncompleted'
 *
 * Usage:
 * - taskCreated: New task added → tasksCount +1
 * - taskDeleted: Task removed → tasksCount -1
 * - taskCompleted: Task marked as done → completedTasks +1
 * - taskUncompleted: Task unmarked from done → completedTasks -1
 */
ProjectSchema.statics.updateTaskCounts = async function (
  projectId: mongoose.Types.ObjectId,
  action: "taskCreated" | "taskDeleted" | "taskCompleted" | "taskUncompleted",
): Promise<void> {
  try {
    switch (action) {
      case "taskCreated":
        await this.updateOne({ _id: projectId }, { $inc: { tasksCount: 1 } });
        console.log(`✅ Project ${projectId}: +1 task (created)`);
        break;

      case "taskDeleted":
        await this.updateOne({ _id: projectId }, { $inc: { tasksCount: -1 } });
        console.log(`✅ Project ${projectId}: -1 task (deleted)`);
        break;

      case "taskCompleted":
        await this.updateOne(
          { _id: projectId },
          { $inc: { completedTasks: 1 } },
        );
        console.log(`✅ Project ${projectId}: +1 completed (task done)`);
        break;

      case "taskUncompleted":
        await this.updateOne(
          { _id: projectId },
          { $inc: { completedTasks: -1 } },
        );
        console.log(`✅ Project ${projectId}: -1 completed (task undone)`);
        break;

      default:
        console.warn(`⚠️ Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`❌ Failed to update project ${projectId} counts:`, error);
    throw error;
  }
};

// ─── RECALCULATE: Safety Net ──────────────────────────────────────────────

/**
 * ✅ RECALCULATE COUNTS FROM SCRATCH
 * Use this as a safety net if counts get out of sync
 */
ProjectSchema.statics.recalculateTaskCounts = async function (
  projectId: mongoose.Types.ObjectId,
): Promise<void> {
  try {
    const taskStats = await TaskModel.aggregate([
      {
        $match: {
          projectId: projectId,
          isArchived: false,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ["$status", "done"] }, 1, 0],
            },
          },
        },
      },
    ]);

    const updateData =
      taskStats.length > 0
        ? {
            tasksCount: taskStats[0].total,
            completedTasks: taskStats[0].completed,
          }
        : {
            tasksCount: 0,
            completedTasks: 0,
          };

    await this.updateOne({ _id: projectId }, { $set: updateData });

    console.log(`✅ Project ${projectId} recalculated:`, updateData);
  } catch (error) {
    console.error(
      `❌ Failed to recalculate project ${projectId} counts:`,
      error,
    );
    throw error;
  }
};

// ─── Other Static Methods ──────────────────────────────────────────────────

ProjectSchema.statics.findByProjectId = async function (
  userId: string,
  projectId: string,
): Promise<IProject | null> {
  return this.findOne({ userId, projectId }).exec();
};

ProjectSchema.statics.findActive = async function (
  userId: string,
): Promise<IProject[]> {
  return this.find({
    userId,
    status: { $in: ["active", "on-hold"] },
    isArchived: false,
  }).sort({ isFavorite: -1, createdAt: -1 });
};

ProjectSchema.statics.findFavorite = async function (
  userId: string,
): Promise<IProject[]> {
  return this.find({
    userId,
    isFavorite: true,
    isArchived: false,
  }).sort({ createdAt: -1 });
};

ProjectSchema.statics.getDashboardStats = async function (
  userId: string,
): Promise<any> {
  const [stats] = await this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
        onHold: { $sum: { $cond: [{ $eq: ["$status", "on-hold"] }, 1, 0] } },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        archived: { $sum: { $cond: [{ $eq: ["$status", "archived"] }, 1, 0] } },
        favorite: { $sum: { $cond: [{ $eq: ["$isFavorite", true] }, 1, 0] } },
      },
    },
  ]);

  return (
    stats || {
      total: 0,
      active: 0,
      onHold: 0,
      completed: 0,
      archived: 0,
      favorite: 0,
    }
  );
};

ProjectSchema.statics.getProjectsWithTaskStats = async function (
  userId: string,
): Promise<any[]> {
  return this.aggregate([
    {
      $match: { userId, isArchived: false },
    },
    {
      $lookup: {
        from: "tasks",
        localField: "_id",
        foreignField: "projectId",
        as: "tasks",
      },
    },
    {
      $addFields: {
        tasksCount: { $size: "$tasks" },
        completedTasks: {
          $size: {
            $filter: {
              input: "$tasks",
              as: "task",
              cond: { $eq: ["$$task.status", "done"] },
            },
          },
        },
        progress: {
          $cond: [
            { $eq: [{ $size: "$tasks" }, 0] },
            0,
            {
              $multiply: [
                {
                  $divide: [
                    {
                      $size: {
                        $filter: {
                          input: "$tasks",
                          as: "task",
                          cond: { $eq: ["$$task.status", "done"] },
                        },
                      },
                    },
                    { $size: "$tasks" },
                  ],
                },
                100,
              ],
            },
          ],
        },
      },
    },
    {
      $project: {
        _id: 1,
        projectId: 1,
        name: 1,
        description: 1,
        color: 1,
        icon: 1,
        priority: 1,
        status: 1,
        isFavorite: 1,
        isArchived: 1,
        tags: 1,
        startDate: 1,
        endDate: 1,
        tasksCount: 1,
        completedTasks: 1,
        progress: 1,
        teamMembers: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
    {
      $sort: { isFavorite: -1, createdAt: -1 },
    },
  ]);
};

// ─── Middleware ──────────────────────────────────────────────────────────────

// Pre-save: Auto-set dates
ProjectSchema.pre("save", async function (this: IProject) {
  // Auto-set endDate when status changes to completed
  if (this.isModified("status") && this.status === "completed") {
    this.endDate = new Date();
  }

  // Auto-set startDate when status changes to active
  if (
    this.isModified("status") &&
    this.status === "active" &&
    !this.startDate
  ) {
    this.startDate = new Date();
  }
});

// ─── Model ──────────────────────────────────────────────────────────────────

const ProjectModel: IProjectModel =
  (mongoose.models.Project as IProjectModel) ||
  mongoose.model<IProject, IProjectModel>("Project", ProjectSchema);

export default ProjectModel;

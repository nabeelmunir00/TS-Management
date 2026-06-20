// lib/services/task-service.ts
import TaskModel, { TaskStatus, Priority } from "../models/Task";
import ProjectModel from "../models/Project";
import connectDB from "../db";
import { Types } from "mongoose";
import { cache } from "react";
import { v4 as uuidv4 } from "uuid";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  userId: string;
  projectId?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string | Date;
  estimatedHours?: number;
  actualHours?: number;
  assignedTo?: string;
  tags?: string[];
  subtasks?: { title: string; done?: boolean }[];
  attachments?: { name: string; url: string; type: string }[];
  aiSuggestions?: string;
  isArchived?: boolean;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
  userId: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: Priority;
  projectId?: string;
  assignedTo?: string;
  search?: string;
  isArchived?: boolean;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "dueDate" | "priority" | "status" | "title";
  sortOrder?: "asc" | "desc";
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// ─── 1. CREATE TASK ──────────────────────────────────────────────────────────

export async function createTask(data: CreateTaskInput) {
  try {
    await connectDB();

    // ✅ Validation
    const validationError = validateCreateTask(data);
    if (validationError) {
      return { success: false, error: validationError };
    }

    // ✅ Check if project exists (if projectId provided)
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

    // ✅ Prepare task data
    const taskData = {
      taskId: `TASK-${uuidv4().slice(0, 8).toUpperCase()}`,
      userId: data.userId,
      projectId: data.projectId
        ? new Types.ObjectId(data.projectId)
        : undefined,
      title: data.title.trim(),
      description: data.description?.trim() || "",
      status: data.status || "todo",
      priority: data.priority || "medium",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      estimatedHours: data.estimatedHours,
      actualHours: data.actualHours,
      assignedTo: data.assignedTo,
      tags: data.tags || [],
      subtasks:
        data.subtasks?.map((s) => ({
          title: s.title.trim(),
          done: s.done || false,
        })) || [],
      attachments: data.attachments || [],
      aiSuggestions: data.aiSuggestions,
      isArchived: data.isArchived || false,
    };

    // ✅ Create task
    const task = await TaskModel.create(taskData);
    const taskObject = task.toObject();

    // ✅ Update project counts
    if (data.projectId) {
      const projectId = new Types.ObjectId(data.projectId);

      // Increment total tasks
      await ProjectModel.updateTaskCounts(projectId, "taskCreated");

      // If task is created as "done", increment completed tasks
      if (taskData.status === "done") {
        await ProjectModel.updateTaskCounts(projectId, "taskCompleted");
      }
    }

    return {
      success: true,
      data: taskObject,
    };
  } catch (error) {
    console.error("❌ Create task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

// ─── 2. GET ALL TASKS (with Pagination) ─────────────────────────────────────

export async function getAllTasks(userId: string, filters?: TaskFilters) {
  try {
    await connectDB();

    const query: any = { userId };

    // ✅ Apply filters
    if (filters?.status) query.status = filters.status;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.assignedTo) query.assignedTo = filters.assignedTo;

    if (filters?.projectId) {
      if (!Types.ObjectId.isValid(filters.projectId)) {
        return { success: false, error: "Invalid project ID" };
      }
      query.projectId = new Types.ObjectId(filters.projectId);
    }

    if (filters?.isArchived !== undefined) {
      query.isArchived = filters.isArchived;
    } else {
      query.isArchived = false; // Default: exclude archived
    }

    // ✅ Date range filter
    if (filters?.fromDate || filters?.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
      if (filters.toDate) query.createdAt.$lte = filters.toDate;
    }

    // ✅ Search in title and description (text search)
    if (filters?.search) {
      const searchRegex = new RegExp(filters.search, "i");
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
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
    const sort: any = { [sortBy]: sortOrder };

    // ✅ Execute query with count
    const [tasks, total] = await Promise.all([
      TaskModel.find(query).sort(sort).skip(skip).limit(limit).lean().exec(),
      TaskModel.countDocuments(query),
    ]);

    return {
      success: true,
      data: tasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("❌ Get tasks error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tasks",
    };
  }
}

// ─── 3. GET SINGLE TASK ──────────────────────────────────────────────────────

export async function getTaskById(
  id: string,
  userId: string,
  includeArchived = false,
) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid task ID" };
    }

    const query: any = { _id: id, userId };
    if (!includeArchived) {
      query.isArchived = false;
    }

    const task = await TaskModel.findOne(query)
      .populate({
        path: "projectId",
        select: "name color icon",
      })
      .lean();

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    return { success: true, data: task };
  } catch (error) {
    console.error("❌ Get task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch task",
    };
  }
}

// ─── 4. UPDATE TASK ──────────────────────────────────────────────────────────

export async function updateTask(data: UpdateTaskInput) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(data.id)) {
      return { success: false, error: "Invalid task ID" };
    }

    // ✅ Check if task exists
    const existingTask = await TaskModel.findOne({
      _id: data.id,
      userId: data.userId,
    });

    if (!existingTask) {
      return { success: false, error: "Task not found" };
    }

    // ✅ Check if status is changing
    const statusChanged = data.status && data.status !== existingTask.status;
    const wasCompleted = existingTask.status === "done";
    const willBeCompleted = data.status === "done";

    // ✅ Build update object
    const updateData: any = {};
    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "dueDate",
      "estimatedHours",
      "actualHours",
      "assignedTo",
      "tags",
      "subtasks",
      "attachments",
      "aiSuggestions",
      "isArchived",
    ];

    allowedFields.forEach((field) => {
      if (data[field as keyof UpdateTaskInput] !== undefined) {
        if (field === "title") {
          updateData.title = data.title?.trim();
        } else if (field === "description") {
          updateData.description = data.description?.trim();
        } else if (field === "dueDate" && data.dueDate) {
          updateData.dueDate = new Date(data.dueDate);
        } else if (field === "projectId" && data.projectId) {
          updateData.projectId = new Types.ObjectId(data.projectId);
        } else {
          updateData[field] = data[field as keyof UpdateTaskInput];
        }
      }
    });

    // ✅ Validate project if changing
    if (data.projectId) {
      const projectExists = await ProjectModel.exists({
        _id: data.projectId,
        userId: data.userId,
      });

      if (!projectExists) {
        return {
          success: false,
          error: "Project not found or access denied",
        };
      }
    }

    // ✅ Update task
    const task = await TaskModel.findOneAndUpdate(
      { _id: data.id, userId: data.userId },
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        lean: true,
      },
    );

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    // ✅ Update project counts if status changed
    if (statusChanged && task.projectId) {
      const projectId = task.projectId;

      // If task became completed
      if (!wasCompleted && willBeCompleted) {
        await ProjectModel.updateTaskCounts(projectId, "taskCompleted");
      }
      // If task became uncompleted
      else if (wasCompleted && !willBeCompleted) {
        await ProjectModel.updateTaskCounts(projectId, "taskUncompleted");
      }
    }

    // ✅ If project changed, update both projects
    if (
      data.projectId &&
      data.projectId !== existingTask.projectId?.toString()
    ) {
      const newProjectId = new Types.ObjectId(data.projectId);

      // Update old project (decrement)
      if (existingTask.projectId) {
        await ProjectModel.updateTaskCounts(
          existingTask.projectId,
          "taskDeleted",
        );
        if (wasCompleted) {
          await ProjectModel.updateTaskCounts(
            existingTask.projectId,
            "taskUncompleted",
          );
        }
      }

      // Update new project (increment)
      await ProjectModel.updateTaskCounts(newProjectId, "taskCreated");
      if (willBeCompleted) {
        await ProjectModel.updateTaskCounts(newProjectId, "taskCompleted");
      }
    }

    return { success: true, data: task };
  } catch (error) {
    console.error("❌ Update task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task",
    };
  }
}

// ─── 5. DELETE TASK ──────────────────────────────────────────────────────────

export async function deleteTask(id: string, userId: string) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid task ID" };
    }

    // ✅ Get task before deletion
    const task = await TaskModel.findOne({ _id: id, userId });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    const projectId = task.projectId;
    const wasCompleted = task.status === "done";
    const taskId = task.taskId || task._id;

    // ✅ Delete task
    await TaskModel.findOneAndDelete({ _id: id, userId });

    // ✅ Update project counts
    if (projectId) {
      // Decrease total tasks
      await ProjectModel.updateTaskCounts(projectId, "taskDeleted");

      // If task was completed, decrease completed count
      if (wasCompleted) {
        await ProjectModel.updateTaskCounts(projectId, "taskUncompleted");
      }
    }

    console.log(`✅ Task ${taskId} deleted successfully`);

    return {
      success: true,
      data: {
        taskId: taskId,
        projectId: projectId,
        wasCompleted,
      },
    };
  } catch (error) {
    console.error("❌ Delete task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete task",
    };
  }
}

// ─── 6. TOGGLE TASK STATUS ──────────────────────────────────────────────────

export async function toggleTaskStatus(id: string, userId: string) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid task ID" };
    }

    // ✅ Get task before toggle
    const task = await TaskModel.findOne({ _id: id, userId });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    const previousStatus = task.status;
    const projectId = task.projectId;

    // ✅ Cycle through statuses
    const statusCycle: Record<TaskStatus, TaskStatus> = {
      todo: "in-progress",
      "in-progress": "review",
      review: "done",
      done: "todo",
    };

    task.status = statusCycle[task.status] || "todo";
    await task.save();

    // ✅ Update project counts if completion status changed
    if (projectId) {
      const wasCompleted = previousStatus === "done";
      const isNowCompleted = task.status === "done";

      if (!wasCompleted && isNowCompleted) {
        // Task became completed
        await ProjectModel.updateTaskCounts(projectId, "taskCompleted");
      } else if (wasCompleted && !isNowCompleted) {
        // Task became uncompleted
        await ProjectModel.updateTaskCounts(projectId, "taskUncompleted");
      }
    }

    return {
      success: true,
      data: task.toObject(),
    };
  } catch (error) {
    console.error("❌ Toggle task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle task",
    };
  }
}

// ─── 7. ARCHIVE / UNARCHIVE TASK ────────────────────────────────────────────

export async function archiveTask(
  id: string,
  userId: string,
  archive: boolean = true,
) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid task ID" };
    }

    const task = await TaskModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isArchived: archive } },
      { new: true, lean: true },
    );

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    // ✅ Recalculate project counts when archiving/unarchiving
    if (task.projectId) {
      await ProjectModel.recalculateTaskCounts(task.projectId);
    }

    return { success: true, data: task };
  } catch (error) {
    console.error("❌ Archive task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive task",
    };
  }
}

// ─── 8. GET TASK STATISTICS ──────────────────────────────────────────────────

export async function getTaskStats(userId: string) {
  try {
    await connectDB();

    const [stats, priorityStats, overdueStats] = await Promise.all([
      // ✅ Status stats
      TaskModel.aggregate([
        { $match: { userId, isArchived: false } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      // ✅ Priority stats
      TaskModel.aggregate([
        { $match: { userId, isArchived: false } },
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
      ]),

      // ✅ Overdue count
      TaskModel.countDocuments({
        userId,
        isArchived: false,
        dueDate: { $lt: new Date() },
        status: { $ne: "done" },
      }),
    ]);

    const result = {
      status: {
        todo: 0,
        "in-progress": 0,
        review: 0,
        done: 0,
        total: 0,
      },
      priority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
      },
      overdue: overdueStats,
    };

    stats.forEach((stat) => {
      result.status[stat._id as keyof typeof result.status] = stat.count;
      result.status.total += stat.count;
    });

    priorityStats.forEach((stat) => {
      result.priority[stat._id as keyof typeof result.priority] = stat.count;
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("❌ Get stats error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stats",
    };
  }
}

// ─── 9. BULK OPERATIONS ──────────────────────────────────────────────────────

export async function bulkDeleteTasks(ids: string[], userId: string) {
  try {
    await connectDB();

    const validIds = ids.filter((id) => Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return { success: false, error: "No valid task IDs provided" };
    }

    // ✅ Get tasks before deletion
    const tasks = await TaskModel.find({
      _id: { $in: validIds },
      userId,
    }).select("projectId status");

    if (tasks.length === 0) {
      return { success: false, error: "No tasks found to delete" };
    }

    // ✅ Group by project
    const projectMap = new Map<string, { total: number; completed: number }>();

    tasks.forEach((task) => {
      const projectId = task.projectId?.toString();
      if (!projectId) return;

      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, { total: 0, completed: 0 });
      }

      const data = projectMap.get(projectId)!;
      data.total += 1;
      if (task.status === "done") {
        data.completed += 1;
      }
    });

    // ✅ Delete tasks
    const deleteResult = await TaskModel.deleteMany({
      _id: { $in: validIds },
      userId,
    });

    // ✅ Update each project
    for (const [projectId, data] of projectMap) {
      const projectObjectId = new Types.ObjectId(projectId);

      // Decrease total tasks
      await ProjectModel.updateTaskCounts(projectObjectId, "taskDeleted");

      // If completed tasks were deleted
      if (data.completed > 0) {
        for (let i = 0; i < data.completed; i++) {
          await ProjectModel.updateTaskCounts(
            projectObjectId,
            "taskUncompleted",
          );
        }
      }
    }

    return {
      success: true,
      data: {
        deletedCount: deleteResult.deletedCount,
        affectedProjects: projectMap.size,
      },
    };
  } catch (error) {
    console.error("❌ Bulk delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete tasks",
    };
  }
}

export async function bulkUpdateStatus(
  ids: string[],
  userId: string,
  status: TaskStatus,
) {
  try {
    await connectDB();

    const validIds = ids.filter((id) => Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return { success: false, error: "No valid task IDs provided" };
    }

    // ✅ Get tasks before update
    const tasks = await TaskModel.find({
      _id: { $in: validIds },
      userId,
    }).select("projectId status");

    // ✅ Update tasks
    const result = await TaskModel.updateMany(
      { _id: { $in: validIds }, userId },
      { $set: { status } },
    );

    // ✅ Update project counts for each affected task
    for (const task of tasks) {
      if (task.projectId) {
        const wasCompleted = task.status === "done";
        const willBeCompleted = status === "done";

        if (!wasCompleted && willBeCompleted) {
          await ProjectModel.updateTaskCounts(task.projectId, "taskCompleted");
        } else if (wasCompleted && !willBeCompleted) {
          await ProjectModel.updateTaskCounts(
            task.projectId,
            "taskUncompleted",
          );
        }
      }
    }

    return {
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
      },
    };
  } catch (error) {
    console.error("❌ Bulk update error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update tasks",
    };
  }
}

// ─── 10. GET TASKS BY PROJECT ──────────────────────────────────────────────

export async function getTasksByProject(
  projectId: string,
  userId: string,
  filters?: Omit<TaskFilters, "projectId">,
) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(projectId)) {
      return { success: false, error: "Invalid project ID" };
    }

    const query: any = {
      userId,
      projectId: new Types.ObjectId(projectId),
      isArchived: false,
    };

    if (filters?.status) query.status = filters.status;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.assignedTo) query.assignedTo = filters.assignedTo;

    if (filters?.search) {
      const searchRegex = new RegExp(filters.search, "i");
      query.$or = [{ title: searchRegex }, { description: searchRegex }];
    }

    const tasks = await TaskModel.find(query).sort({ createdAt: -1 }).lean();

    return { success: true, data: tasks };
  } catch (error) {
    console.error("❌ Get tasks by project error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tasks",
    };
  }
}

// ─── 11. GET RECENT TASKS ───────────────────────────────────────────────────

export async function getRecentTasks(userId: string, limit: number = 5) {
  try {
    await connectDB();

    const tasks = await TaskModel.find({
      userId,
      isArchived: false,
    })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 20))
      .lean();

    return { success: true, data: tasks };
  } catch (error) {
    console.error("❌ Get recent tasks error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch recent tasks",
    };
  }
}

// ─── 12. SEARCH TASKS ───────────────────────────────────────────────────────

export async function searchTasks(
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
    const tasks = await TaskModel.find({
      userId,
      isArchived: false,
      $or: [
        { title: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 20))
      .lean();

    return { success: true, data: tasks };
  } catch (error) {
    console.error("❌ Search tasks error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search tasks",
    };
  }
}

// ─── Validation Helpers ──────────────────────────────────────────────────────

function validateCreateTask(data: CreateTaskInput): string | null {
  if (!data.title || !data.title.trim()) {
    return "Task title is required";
  }

  if (data.title.trim().length > 200) {
    return "Task title cannot exceed 200 characters";
  }

  if (data.description && data.description.length > 2000) {
    return "Description cannot exceed 2000 characters";
  }

  if (data.estimatedHours !== undefined && data.estimatedHours < 0) {
    return "Estimated hours cannot be negative";
  }

  if (data.actualHours !== undefined && data.actualHours < 0) {
    return "Actual hours cannot be negative";
  }

  if (data.dueDate) {
    const dueDate = new Date(data.dueDate);
    if (isNaN(dueDate.getTime())) {
      return "Invalid due date format";
    }
  }

  if (data.tags && data.tags.length > 20) {
    return "Cannot have more than 20 tags";
  }

  return null;
}

// ─── React Cache for Server Components ──────────────────────────────────────

export const getCachedTasks = cache(
  async (userId: string, filters?: TaskFilters) => {
    return getAllTasks(userId, filters);
  },
);

export const getCachedTask = cache(async (id: string, userId: string) => {
  return getTaskById(id, userId);
});

export const getCachedTaskStats = cache(async (userId: string) => {
  return getTaskStats(userId);
});

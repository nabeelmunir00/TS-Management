// lib/task-service.ts
import TaskModel, { TaskStatus, Priority } from "../models/Task";
import connectDB from "../db";
import { Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  userId: string;
  projectId?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: Priority;
  dueDate?: string;
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
}

// ─── 1. CREATE TASK ────────────────────────────────────────────────────────────

export async function createTask(data: CreateTaskInput) {
  try {
    await connectDB();

    // Validate required fields
    if (!data.title || !data.title.trim()) {
      return {
        success: false,
        error: "Task title is required",
      };
    }
    const task = await TaskModel.create({
      userId: data.userId,
      projectId: data.projectId
        ? new Types.ObjectId(data.projectId)
        : undefined,
      title: data.title.trim(),
      description: data.description || "",
      status: data.status || "todo",
      priority: data.priority || "medium",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      estimatedHours: data.estimatedHours,
      actualHours: data.actualHours,
      assignedTo: data.assignedTo,
      tags: data.tags || [],
      subtasks:
        data.subtasks?.map((s) => ({
          title: s.title,
          done: s.done || false,
        })) || [],
      attachments: data.attachments || [],
      aiSuggestions: data.aiSuggestions,
      isArchived: data.isArchived || false,
    });

    return {
      success: true,
      data: task.toObject(),
    };
  } catch (error) {
    console.error("❌ Create task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

// ─── 2. GET ALL TASKS ──────────────────────────────────────────────────────────

export async function getAllTasks(userId: string, filters?: TaskFilters) {
  try {
    await connectDB();

    const query: any = { userId };

    // Apply filters
    if (filters?.status) query.status = filters.status;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.projectId) {
      query.projectId = new Types.ObjectId(filters.projectId);
    }
    if (filters?.assignedTo) query.assignedTo = filters.assignedTo;
    if (filters?.isArchived !== undefined) {
      query.isArchived = filters.isArchived;
    }

    // Search in title and description
    if (filters?.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { description: { $regex: filters.search, $options: "i" } },
      ];
    }

    const tasks = await TaskModel.find(query).sort({ createdAt: -1 }).lean();

    return {
      success: true,
      data: tasks,
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

export async function getTaskById(id: string, userId: string) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid task ID" };
    }

    const task = await TaskModel.findOne({ _id: id, userId }).lean();

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

// ─── 4. UPDATE TASK ────────────────────────────────────────────────────────────

export async function updateTask(data: UpdateTaskInput) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(data.id)) {
      return { success: false, error: "Invalid task ID" };
    }

    const updateData: any = {};

    // Only include fields that are provided
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.status) updateData.status = data.status;
    if (data.priority) updateData.priority = data.priority;
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
    if (data.estimatedHours !== undefined) {
      updateData.estimatedHours = data.estimatedHours;
    }
    if (data.actualHours !== undefined)
      updateData.actualHours = data.actualHours;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.tags) updateData.tags = data.tags;
    if (data.subtasks) updateData.subtasks = data.subtasks;
    if (data.attachments) updateData.attachments = data.attachments;
    if (data.aiSuggestions !== undefined) {
      updateData.aiSuggestions = data.aiSuggestions;
    }
    if (data.isArchived !== undefined) updateData.isArchived = data.isArchived;
    if (data.projectId) {
      updateData.projectId = new Types.ObjectId(data.projectId);
    }

    // Update updatedAt automatically (mongoose timestamps handles this)

    const task = await TaskModel.findOneAndUpdate(
      { _id: data.id, userId: data.userId },
      { $set: updateData },
      { new: true, runValidators: true },
    ).lean();

    if (!task) {
      return { success: false, error: "Task not found" };
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

// ─── 5. DELETE TASK ────────────────────────────────────────────────────────────

export async function deleteTask(id: string, userId: string) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid task ID" };
    }

    const result = await TaskModel.findOneAndDelete({ _id: id, userId });

    if (!result) {
      return { success: false, error: "Task not found" };
    }

    return { success: true };
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

    const task = await TaskModel.findOne({ _id: id, userId });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    // Cycle through statuses: todo → in-progress → review → done → todo
    const statusCycle: Record<TaskStatus, TaskStatus> = {
      todo: "in-progress",
      "in-progress": "review",
      review: "done",
      done: "todo",
    };

    task.status = statusCycle[task.status] || "todo";
    await task.save();

    return { success: true, data: task.toObject() };
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
      { new: true },
    ).lean();

    if (!task) {
      return { success: false, error: "Task not found" };
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

    const stats = await TaskModel.aggregate([
      { $match: { userId, isArchived: false } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const result = {
      total: 0,
      todo: 0,
      "in-progress": 0,
      review: 0,
      done: 0,
    };

    stats.forEach((stat) => {
      result[stat._id as keyof typeof result] = stat.count;
      result.total += stat.count;
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

// ─── 9. BULK DELETE TASKS ────────────────────────────────────────────────────

export async function bulkDeleteTasks(ids: string[], userId: string) {
  try {
    await connectDB();

    const validIds = ids.filter((id) => Types.ObjectId.isValid(id));

    if (validIds.length === 0) {
      return { success: false, error: "No valid task IDs provided" };
    }

    const result = await TaskModel.deleteMany({
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
    console.error("❌ Bulk delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete tasks",
    };
  }
}

// ─── 10. GET TASKS BY PROJECT ───────────────────────────────────────────────

export async function getTasksByProject(projectId: string, userId: string) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(projectId)) {
      return { success: false, error: "Invalid project ID" };
    }

    const tasks = await TaskModel.find({
      userId,
      projectId: new Types.ObjectId(projectId),
      isArchived: false,
    })
      .sort({ createdAt: -1 })
      .lean();

    return { success: true, data: tasks };
  } catch (error) {
    console.error("❌ Get tasks by project error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch tasks",
    };
  }
}

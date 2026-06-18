// lib/task-service.ts
import TaskModel, { ITask, TaskStatus, Priority } from "@/models/Task";
import connectDB from "./mongodb";
import { Types } from "mongoose";

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
  assignedTo?: string;
  tags?: string[];
  subtasks?: { title: string; done?: boolean }[];
  attachments?: { name: string; url: string; type: string }[];
  aiSuggestions?: string;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
  userId: string;
}

// ─── Create Task ────────────────────────────────────────────────────────────

export async function createTask(data: CreateTaskInput) {
  try {
    await connectDB();

    const task = await TaskModel.create({
      userId: data.userId,
      projectId: data.projectId
        ? new Types.ObjectId(data.projectId)
        : undefined,
      title: data.title,
      description: data.description || "",
      status: data.status || "todo",
      priority: data.priority || "medium",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      estimatedHours: data.estimatedHours,
      assignedTo: data.assignedTo,
      tags: data.tags || [],
      subtasks:
        data.subtasks?.map((s) => ({
          title: s.title,
          done: s.done || false,
        })) || [],
      attachments: data.attachments || [],
      aiSuggestions: data.aiSuggestions,
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

// ─── Get All Tasks ──────────────────────────────────────────────────────────

export async function getAllTasks(
  userId: string,
  filters?: {
    status?: TaskStatus;
    priority?: Priority;
    projectId?: string;
    assignedTo?: string;
    search?: string;
    isArchived?: boolean;
  },
) {
  try {
    await connectDB();

    const query: any = { userId };

    if (filters?.status) query.status = filters.status;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.projectId)
      query.projectId = new Types.ObjectId(filters.projectId);
    if (filters?.assignedTo) query.assignedTo = filters.assignedTo;
    if (filters?.isArchived !== undefined)
      query.isArchived = filters.isArchived;

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

// ─── Get Single Task ──────────────────────────────────────────────────────

export async function getTaskById(id: string, userId: string) {
  try {
    await connectDB();

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

// ─── Update Task ────────────────────────────────────────────────────────────

export async function updateTask(data: UpdateTaskInput) {
  try {
    await connectDB();

    const updateData: any = {};

    if (data.title) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.status) updateData.status = data.status;
    if (data.priority) updateData.priority = data.priority;
    if (data.dueDate) updateData.dueDate = new Date(data.dueDate);
    if (data.estimatedHours !== undefined)
      updateData.estimatedHours = data.estimatedHours;
    if (data.assignedTo !== undefined) updateData.assignedTo = data.assignedTo;
    if (data.tags) updateData.tags = data.tags;
    if (data.subtasks) updateData.subtasks = data.subtasks;
    if (data.attachments) updateData.attachments = data.attachments;
    if (data.aiSuggestions !== undefined)
      updateData.aiSuggestions = data.aiSuggestions;
    if (data.projectId)
      updateData.projectId = new Types.ObjectId(data.projectId);

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

// ─── Delete Task ────────────────────────────────────────────────────────────

export async function deleteTask(id: string, userId: string) {
  try {
    await connectDB();

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

// ─── Toggle Task Status ────────────────────────────────────────────────────

export async function toggleTaskStatus(id: string, userId: string) {
  try {
    await connectDB();

    const task = await TaskModel.findOne({ _id: id, userId });

    if (!task) {
      return { success: false, error: "Task not found" };
    }

    const statusMap: Record<TaskStatus, TaskStatus> = {
      todo: "in-progress",
      "in-progress": "review",
      review: "done",
      done: "todo",
    };

    task.status = statusMap[task.status] || "todo";
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

// ─── Archive/Unarchive Task ──────────────────────────────────────────────

export async function archiveTask(
  id: string,
  userId: string,
  archive: boolean = true,
) {
  try {
    await connectDB();

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

// ─── Get Task Statistics ────────────────────────────────────────────────────

export async function getTaskStats(userId: string) {
  try {
    await connectDB();

    const stats = await TaskModel.aggregate([
      { $match: { userId } },
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

    stats.forEach((stat: any) => {
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

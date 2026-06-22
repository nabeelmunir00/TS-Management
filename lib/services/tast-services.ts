// lib/services/task-service.ts
import TaskModel, { TaskStatus, Priority, ITask } from "../models/Task";
import ProjectModel from "../models/Project";
import ActivityModel from "../models/Activity";
import connectDB from "../db";
import { Types } from "mongoose";
import { cache } from "react";
import { v4 as uuidv4 } from "uuid";
import TeamMember from "../models/TeamMember";
import "../models/Organization"; // ✅ Register Organization schema

// ─── Types ───────────────────────────────────────────────────────────────────

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
  assignedTo?: string; // clerk userId of assignee
  assignedByName?: string; // display name
  assignedToAvatar?: string; // avatar url
  assignedBy?: string; // clerk userId of assigner
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

export interface PaginatedResponse {
  tasks: ITask[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// ─── Helper: Log Activity ─────────────────────────────────────────────────────

async function logActivity(
  userId: string,
  action: "create" | "update" | "delete" | "complete" | "archive" | "unarchive",
  entityType: "task" | "project" | "note",
  entityId: Types.ObjectId,
  entityName: string,
  changes?: any,
) {
  try {
    await ActivityModel.create({
      userId,
      action,
      entityType,
      entityId,
      entityName,
      changes,
    });
  } catch (error) {
    console.error("❌ Failed to log activity:", error);
  }
}

// ─── Helper: Get org member IDs ───────────────────────────────────────────────
/**
 * Returns all active memberIds in the same org as `userId`.
 * If user is not in any org, returns null (caller handles solo fallback).
 */
async function getOrgMemberIds(userId: string): Promise<string[] | null> {
  // ✅ Use .select() instead of .populate() — no schema registration issue
  const userMembership = await TeamMember.findOne({
    userId,
    status: "active",
  })
    .select("organizationId userId")
    .lean();

  if (!userMembership) return null;

  const members = await TeamMember.find({
    organizationId: userMembership.organizationId,
    status: "active",
  })
    .select("userId")
    .lean();

  return members.map((m) => m.userId);
}

// ─── 1. CREATE TASK ───────────────────────────────────────────────────────────

export async function createTask(data: CreateTaskInput) {
  try {
    await connectDB();

    const validationError = validateCreateTask(data);
    if (validationError) return { success: false, error: validationError };

    if (data.projectId) {
      const projectExists = await ProjectModel.exists({
        _id: data.projectId,
        userId: data.userId,
        isArchived: false,
      });
      if (!projectExists) {
        return { success: false, error: "Project not found or access denied" };
      }
    }

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
      // ✅ Assignment fields
      assignedTo: data.assignedTo || undefined,
      assignedByName: data.assignedByName || undefined,
      assignedToAvatar: data.assignedToAvatar || undefined,
      assignedBy: data.assignedBy || data.userId,
      assignedAt: data.assignedTo ? new Date() : undefined,
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

    const task = await TaskModel.create(taskData);
    const taskObject = task.toObject();

    if (data.projectId) {
      const projectId = new Types.ObjectId(data.projectId);
      await ProjectModel.updateTaskCounts(projectId, "taskCreated");
      if (taskData.status === "done") {
        await ProjectModel.updateTaskCounts(projectId, "taskCompleted");
      }
    }

    await logActivity(data.userId, "create", "task", task._id, task.title);

    return { success: true, data: taskObject };
  } catch (error) {
    console.error("❌ Create task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

// ─── 2. GET ALL TASKS ─────────────────────────────────────────────────────────
/**
 * KEY FIX:
 * Show tasks where:
 *   (a) Task creator is in same org as current user  OR
 *   (b) Task is assigned to current user             OR
 *   (c) Task is created by current user (solo fallback)
 *
 * This means:
 *   - User 1 creates task → assigned to User 2
 *   - User 2 logs in → sees the task (assignedTo matches)
 *   - User 1 logs in → sees the task (userId matches)
 */
export async function getAllTasks(userId: string, filters?: TaskFilters) {
  try {
    await connectDB();

    // ✅ Build visibility condition
    const memberIds = await getOrgMemberIds(userId);

    let visibilityCondition: any;

    if (memberIds && memberIds.length > 0) {
      // In an org: show tasks created by any member OR assigned to any member
      visibilityCondition = {
        $or: [
          { userId: { $in: memberIds } },
          { assignedTo: { $in: memberIds } },
        ],
      };
    } else {
      // Solo user: show own tasks + tasks assigned to them
      visibilityCondition = {
        $or: [{ userId }, { assignedTo: userId }],
      };
    }

    // ─── Build query ───────────────────────────────────────────────────────
    const query: any = { ...visibilityCondition };

    // Archived filter
    query.isArchived = filters?.isArchived ?? false;

    // Status / priority / assignedTo filters
    if (filters?.status) query.status = filters.status;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.assignedTo) query.assignedTo = filters.assignedTo;

    if (filters?.projectId) {
      if (!Types.ObjectId.isValid(filters.projectId)) {
        return { success: false, error: "Invalid project ID" };
      }
      query.projectId = new Types.ObjectId(filters.projectId);
    }

    // Date range
    if (filters?.fromDate || filters?.toDate) {
      query.createdAt = {};
      if (filters.fromDate) query.createdAt.$gte = filters.fromDate;
      if (filters.toDate) query.createdAt.$lte = filters.toDate;
    }

    // ✅ Search — override $or carefully
    if (filters?.search) {
      const searchRegex = new RegExp(filters.search, "i");
      // Combine visibility + search with $and
      const searchCondition = {
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex },
        ],
      };
      query.$and = [visibilityCondition, searchCondition];
      // Remove top-level $or since it's now inside $and
      delete query.$or;
    }

    // Pagination
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(filters?.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    // Sorting
    const sortBy = filters?.sortBy || "createdAt";
    const sortOrder = filters?.sortOrder === "asc" ? 1 : -1;
    const sort: any = { [sortBy]: sortOrder };

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

// ─── 3. GET SINGLE TASK ───────────────────────────────────────────────────────

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

    // ✅ Allow fetching if user created it OR is assigned to it
    const query: any = {
      _id: id,
      $or: [{ userId }, { assignedTo: userId }],
    };
    if (!includeArchived) query.isArchived = false;

    const task = await TaskModel.findOne(query)
      .populate({ path: "projectId", select: "name color icon" })
      .lean();

    if (!task) return { success: false, error: "Task not found" };

    return { success: true, data: task };
  } catch (error) {
    console.error("❌ Get task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch task",
    };
  }
}

// ─── 4. UPDATE TASK ───────────────────────────────────────────────────────────

export async function updateTask(data: UpdateTaskInput) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(data.id)) {
      return { success: false, error: "Invalid task ID" };
    }

    // ✅ Allow update if user created it OR is assigned to it
    const existingTask = await TaskModel.findOne({
      _id: data.id,
      $or: [{ userId: data.userId }, { assignedTo: data.userId }],
    });

    if (!existingTask) return { success: false, error: "Task not found" };

    const statusChanged = data.status && data.status !== existingTask.status;
    const wasCompleted = existingTask.status === "done";
    const willBeCompleted = data.status === "done";

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
      "assignedByName",
      "assignedToAvatar",
      "assignedBy",
      "tags",
      "subtasks",
      "attachments",
      "aiSuggestions",
      "isArchived",
    ];

    allowedFields.forEach((field) => {
      if (data[field as keyof UpdateTaskInput] !== undefined) {
        if (field === "title") updateData.title = data.title?.trim();
        else if (field === "description")
          updateData.description = data.description?.trim();
        else if (field === "dueDate" && data.dueDate)
          updateData.dueDate = new Date(data.dueDate);
        else if (field === "projectId" && data.projectId)
          updateData.projectId = new Types.ObjectId(data.projectId);
        else updateData[field] = data[field as keyof UpdateTaskInput];
      }
    });

    // ✅ Set assignedAt when assignedTo changes
    if (data.assignedTo !== undefined) {
      updateData.assignedAt = data.assignedTo ? new Date() : undefined;
    }

    if (data.projectId) {
      const projectExists = await ProjectModel.exists({
        _id: data.projectId,
        userId: data.userId,
      });
      if (!projectExists)
        return { success: false, error: "Project not found or access denied" };
    }

    const task = await TaskModel.findOneAndUpdate(
      { _id: data.id },
      { $set: updateData },
      { new: true, runValidators: true, lean: true },
    );

    if (!task) return { success: false, error: "Task not found" };

    if (statusChanged && task.projectId) {
      if (!wasCompleted && willBeCompleted) {
        await ProjectModel.updateTaskCounts(task.projectId, "taskCompleted");
      } else if (wasCompleted && !willBeCompleted) {
        await ProjectModel.updateTaskCounts(task.projectId, "taskUncompleted");
      }
    }

    await logActivity(data.userId, "update", "task", task._id, task.title, {
      changes: updateData,
    });

    return { success: true, data: task };
  } catch (error) {
    console.error("❌ Update task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update task",
    };
  }
}

// ─── 5. DELETE TASK ───────────────────────────────────────────────────────────

export async function deleteTask(id: string, userId: string) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(id))
      return { success: false, error: "Invalid task ID" };

    // Only creator can delete
    const task = await TaskModel.findOne({ _id: id, userId });
    if (!task) return { success: false, error: "Task not found" };

    const projectId = task.projectId;
    const wasCompleted = task.status === "done";
    const taskTitle = task.title;

    await TaskModel.findOneAndDelete({ _id: id, userId });

    if (projectId) {
      await ProjectModel.updateTaskCounts(projectId, "taskDeleted");
      if (wasCompleted)
        await ProjectModel.updateTaskCounts(projectId, "taskUncompleted");
    }

    await logActivity(userId, "delete", "task", task._id, taskTitle);

    return { success: true, data: { taskId: id, projectId, wasCompleted } };
  } catch (error) {
    console.error("❌ Delete task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete task",
    };
  }
}

// ─── 6. TOGGLE TASK STATUS ────────────────────────────────────────────────────

export async function toggleTaskStatus(id: string, userId: string) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(id))
      return { success: false, error: "Invalid task ID" };

    // ✅ Allow toggle if creator or assignee
    const task = await TaskModel.findOne({
      _id: id,
      $or: [{ userId }, { assignedTo: userId }],
    });
    if (!task) return { success: false, error: "Task not found" };

    const previousStatus = task.status;
    const projectId = task.projectId;
    const taskTitle = task.title;

    const statusCycle: Record<TaskStatus, TaskStatus> = {
      todo: "in-progress",
      "in-progress": "review",
      review: "done",
      done: "todo",
    };

    task.status = statusCycle[task.status] || "todo";
    await task.save();

    if (projectId) {
      const wasCompleted = previousStatus === "done";
      const isNowCompleted = task.status === "done";

      if (!wasCompleted && isNowCompleted) {
        await ProjectModel.updateTaskCounts(projectId, "taskCompleted");
        await logActivity(userId, "complete", "task", task._id, taskTitle);
      } else if (wasCompleted && !isNowCompleted) {
        await ProjectModel.updateTaskCounts(projectId, "taskUncompleted");
      }
    }

    return { success: true, data: task.toObject() };
  } catch (error) {
    console.error("❌ Toggle task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to toggle task",
    };
  }
}

// ─── 7. ARCHIVE / UNARCHIVE ───────────────────────────────────────────────────

export async function archiveTask(id: string, userId: string, archive = true) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(id))
      return { success: false, error: "Invalid task ID" };

    const task = await TaskModel.findOneAndUpdate(
      { _id: id, userId },
      { $set: { isArchived: archive } },
      { new: true, lean: true },
    );
    if (!task) return { success: false, error: "Task not found" };

    if (task.projectId)
      await ProjectModel.recalculateTaskCounts(task.projectId);
    await logActivity(
      userId,
      archive ? "archive" : "unarchive",
      "task",
      task._id,
      task.title,
    );

    return { success: true, data: task };
  } catch (error) {
    console.error("❌ Archive task error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to archive task",
    };
  }
}

// ─── 8. GET TASK STATS ────────────────────────────────────────────────────────

export async function getTaskStats(userId: string) {
  try {
    await connectDB();

    const memberIds = await getOrgMemberIds(userId);
    const matchQuery: any = { isArchived: false };

    if (memberIds) {
      matchQuery.$or = [
        { userId: { $in: memberIds } },
        { assignedTo: { $in: memberIds } },
      ];
    } else {
      matchQuery.$or = [{ userId }, { assignedTo: userId }];
    }

    const [stats, priorityStats, overdueStats] = await Promise.all([
      TaskModel.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      TaskModel.aggregate([
        { $match: matchQuery },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),
      TaskModel.countDocuments({
        ...matchQuery,
        dueDate: { $lt: new Date() },
        status: { $ne: "done" },
      }),
    ]);

    const result = {
      status: { todo: 0, "in-progress": 0, review: 0, done: 0, total: 0 },
      priority: { low: 0, medium: 0, high: 0, urgent: 0 },
      overdue: overdueStats,
    };

    stats.forEach((s) => {
      result.status[s._id as keyof typeof result.status] = s.count;
      result.status.total += s.count;
    });
    priorityStats.forEach((s) => {
      result.priority[s._id as keyof typeof result.priority] = s.count;
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

// ─── 9. BULK OPERATIONS ───────────────────────────────────────────────────────

export async function bulkDeleteTasks(ids: string[], userId: string) {
  try {
    await connectDB();

    const validIds = ids.filter((id) => Types.ObjectId.isValid(id));
    if (validIds.length === 0)
      return { success: false, error: "No valid task IDs" };

    const tasks = await TaskModel.find({
      _id: { $in: validIds },
      userId,
    }).select("projectId status title");
    if (tasks.length === 0) return { success: false, error: "No tasks found" };

    const projectMap = new Map<string, { total: number; completed: number }>();
    tasks.forEach((t) => {
      const pid = t.projectId?.toString();
      if (!pid) return;
      if (!projectMap.has(pid)) projectMap.set(pid, { total: 0, completed: 0 });
      const d = projectMap.get(pid)!;
      d.total++;
      if (t.status === "done") d.completed++;
    });

    const deleteResult = await TaskModel.deleteMany({
      _id: { $in: validIds },
      userId,
    });

    for (const [pid, d] of projectMap) {
      const pId = new Types.ObjectId(pid);
      await ProjectModel.updateTaskCounts(pId, "taskDeleted");
      for (let i = 0; i < d.completed; i++) {
        await ProjectModel.updateTaskCounts(pId, "taskUncompleted");
      }
    }

    for (const t of tasks) {
      await logActivity(userId, "delete", "task", t._id, t.title || "Untitled");
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
    if (validIds.length === 0)
      return { success: false, error: "No valid task IDs" };

    const tasks = await TaskModel.find({
      _id: { $in: validIds },
      userId,
    }).select("projectId status title");
    const result = await TaskModel.updateMany(
      { _id: { $in: validIds }, userId },
      { $set: { status } },
    );

    for (const t of tasks) {
      if (t.projectId) {
        const wasCompleted = t.status === "done";
        const willBeCompleted = status === "done";
        if (!wasCompleted && willBeCompleted) {
          await ProjectModel.updateTaskCounts(t.projectId, "taskCompleted");
          await logActivity(
            userId,
            "complete",
            "task",
            t._id,
            t.title || "Untitled",
          );
        } else if (wasCompleted && !willBeCompleted) {
          await ProjectModel.updateTaskCounts(t.projectId, "taskUncompleted");
        }
      }
    }

    return { success: true, data: { modifiedCount: result.modifiedCount } };
  } catch (error) {
    console.error("❌ Bulk update error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update tasks",
    };
  }
}

// ─── 10. GET TASKS BY PROJECT ─────────────────────────────────────────────────

export async function getTasksByProject(
  projectId: string,
  userId: string,
  filters?: Omit<TaskFilters, "projectId">,
) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(projectId))
      return { success: false, error: "Invalid project ID" };

    const memberIds = await getOrgMemberIds(userId);
    const visibilityCondition = memberIds
      ? {
          $or: [
            { userId: { $in: memberIds } },
            { assignedTo: { $in: memberIds } },
          ],
        }
      : { $or: [{ userId }, { assignedTo: userId }] };

    const query: any = {
      ...visibilityCondition,
      projectId: new Types.ObjectId(projectId),
      isArchived: false,
    };

    if (filters?.status) query.status = filters.status;
    if (filters?.priority) query.priority = filters.priority;
    if (filters?.assignedTo) query.assignedTo = filters.assignedTo;

    if (filters?.search) {
      const searchRegex = new RegExp(filters.search, "i");
      query.$and = [
        visibilityCondition,
        { $or: [{ title: searchRegex }, { description: searchRegex }] },
      ];
      delete query.$or;
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

// ─── 11. GET RECENT TASKS ─────────────────────────────────────────────────────

export async function getRecentTasks(userId: string, limit = 5) {
  try {
    await connectDB();

    const memberIds = await getOrgMemberIds(userId);
    const query: any = { isArchived: false };

    if (memberIds) {
      query.$or = [
        { userId: { $in: memberIds } },
        { assignedTo: { $in: memberIds } },
      ];
    } else {
      query.$or = [{ userId }, { assignedTo: userId }];
    }

    const tasks = await TaskModel.find(query)
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

// ─── 12. SEARCH TASKS ─────────────────────────────────────────────────────────

export async function searchTasks(userId: string, query: string, limit = 10) {
  try {
    await connectDB();
    if (!query.trim()) return { success: true, data: [] };

    const searchRegex = new RegExp(query, "i");
    const tasks = await TaskModel.find({
      $or: [{ userId }, { assignedTo: userId }],
      isArchived: false,
      $and: [
        {
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { tags: searchRegex },
          ],
        },
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

// ─── 13. GET TASK DASHBOARD STATS ────────────────────────────────────────────

export async function getTaskDashboardStats(userId: string) {
  try {
    await connectDB();

    const memberIds = await getOrgMemberIds(userId);
    const matchQuery: any = { isArchived: false };

    if (memberIds) {
      matchQuery.$or = [
        { userId: { $in: memberIds } },
        { assignedTo: { $in: memberIds } },
      ];
    } else {
      matchQuery.$or = [{ userId }, { assignedTo: userId }];
    }

    const stats = await TaskModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
          },
          todo: { $sum: { $cond: [{ $eq: ["$status", "todo"] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ["$status", "review"] }, 1, 0] } },
          highPriority: {
            $sum: { $cond: [{ $in: ["$priority", ["high", "urgent"]] }, 1, 0] },
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

    const result = stats[0] || {
      total: 0,
      completed: 0,
      inProgress: 0,
      todo: 0,
      review: 0,
      highPriority: 0,
      overdue: 0,
    };

    return {
      success: true,
      data: {
        ...result,
        completionRate:
          result.total > 0
            ? Math.round((result.completed / result.total) * 100)
            : 0,
      },
    };
  } catch (error) {
    console.error("❌ Get task dashboard stats error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stats",
    };
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateCreateTask(data: CreateTaskInput): string | null {
  if (!data.title?.trim()) return "Task title is required";
  if (data.title.trim().length > 200)
    return "Title cannot exceed 200 characters";
  if (data.description && data.description.length > 2000)
    return "Description cannot exceed 2000 characters";
  if (data.estimatedHours !== undefined && data.estimatedHours < 0)
    return "Estimated hours cannot be negative";
  if (data.actualHours !== undefined && data.actualHours < 0)
    return "Actual hours cannot be negative";
  if (data.dueDate && isNaN(new Date(data.dueDate).getTime()))
    return "Invalid due date format";
  if (data.tags && data.tags.length > 20)
    return "Cannot have more than 20 tags";
  return null;
}

// ─── React Cache ──────────────────────────────────────────────────────────────

export const getCachedTasks = cache((userId: string, filters?: TaskFilters) =>
  getAllTasks(userId, filters),
);
export const getCachedTask = cache((id: string, userId: string) =>
  getTaskById(id, userId),
);
export const getCachedTaskStats = cache((userId: string) =>
  getTaskStats(userId),
);
export const getCachedTaskDashboardStats = cache((userId: string) =>
  getTaskDashboardStats(userId),
);

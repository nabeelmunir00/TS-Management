// lib/services/dashboard-service.ts
import connectDB from "@/lib/db";
import TaskModel from "@/lib/models/Task";
import ProjectModel from "@/lib/models/Project";
import NoteModel from "@/lib/models/Note";
import ActivityModel from "@/lib/models/Activity";

export interface DashboardStats {
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    review: number;
    highPriority: number;
    overdue: number;
    completionRate: number;
  };
  projects: {
    total: number;
    active: number;
    onHold: number;
    completed: number;
    archived: number;
  };
  notes: {
    total: number;
    pinned: number;
    archived: number;
    active: number;
  };
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    entityName: string;
    createdAt: string;
  }[];
  weeklyProgress: {
    day: string;
    completed: number;
    created: number;
  }[];
}

export async function getDashboardStats(
  userId: string,
): Promise<DashboardStats> {
  await connectDB();

  // ─── Get Task Stats ──────────────────────────────────────────────
  const taskStats = await TaskModel.aggregate([
    { $match: { userId, isArchived: false } },
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

  const tasks = taskStats[0] || {
    total: 0,
    completed: 0,
    inProgress: 0,
    todo: 0,
    review: 0,
    highPriority: 0,
    overdue: 0,
  };

  // ─── Get Project Stats ────────────────────────────────────────────
  const projectStats = await ProjectModel.aggregate([
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
      },
    },
  ]);

  const projects = projectStats[0] || {
    total: 0,
    active: 0,
    onHold: 0,
    completed: 0,
    archived: 0,
  };

  // ─── Get Note Stats ──────────────────────────────────────────────
  const noteStats = await NoteModel.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pinned: { $sum: { $cond: [{ $eq: ["$isPinned", true] }, 1, 0] } },
        archived: { $sum: { $cond: [{ $eq: ["$isArchived", true] }, 1, 0] } },
        active: { $sum: { $cond: [{ $eq: ["$isArchived", false] }, 1, 0] } },
      },
    },
  ]);

  const notes = noteStats[0] || {
    total: 0,
    pinned: 0,
    archived: 0,
    active: 0,
  };

  // ─── Get Recent Activity ─────────────────────────────────────────
  const recentActivity = await ActivityModel.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  // ─── Get Weekly Progress ─────────────────────────────────────────
  const weeklyProgress = await getWeeklyProgress(userId);

  // ─── Calculate Completion Rate ──────────────────────────────────
  const completionRate =
    tasks.total > 0 ? Math.round((tasks.completed / tasks.total) * 100) : 0;

  return {
    tasks: {
      ...tasks,
      completionRate,
    },
    projects,
    notes,
    recentActivity: recentActivity.map((activity: any) => ({
      id: activity._id.toString(),
      action: activity.action,
      entityType: activity.entityType,
      entityName: activity.entityName,
      createdAt: activity.createdAt.toISOString(),
    })),
    weeklyProgress,
  };
}

// ─── Get Weekly Progress ────────────────────────────────────────────

async function getWeeklyProgress(userId: string) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const tasks = await TaskModel.find({
    userId,
    isArchived: false,
    createdAt: { $gte: startOfWeek, $lt: endOfWeek },
  }).select("status createdAt");

  const completed = await TaskModel.find({
    userId,
    isArchived: false,
    status: "done",
    updatedAt: { $gte: startOfWeek, $lt: endOfWeek },
  }).select("updatedAt");

  // Group by day
  const dayMap = new Map();
  days.forEach((day) => {
    dayMap.set(day, { created: 0, completed: 0 });
  });

  tasks.forEach((task) => {
    const day = days[task.createdAt.getDay() - 1] || "Mon";
    const data = dayMap.get(day);
    if (data) data.created += 1;
  });

  completed.forEach((task) => {
    const day = days[task.updatedAt.getDay() - 1] || "Mon";
    const data = dayMap.get(day);
    if (data) data.completed += 1;
  });

  return days.map((day) => ({
    day,
    created: dayMap.get(day)?.created || 0,
    completed: dayMap.get(day)?.completed || 0,
  }));
}

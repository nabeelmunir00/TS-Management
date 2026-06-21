// lib/services/team-dashboard-service.ts
import connectDB from "@/lib/db";
import Organization from "@/lib/models/Organization";
import TeamMember from "@/lib/models/TeamMember";
import TaskModel from "@/lib/models/Task";
import ProjectModel from "@/lib/models/Project";
import ActivityModel from "@/lib/models/Activity";
import { Types } from "mongoose";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TeamDashboardStats {
  organization: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  };
  members: {
    total: number;
    active: number;
    invited: number;
    admins: number;
  };
  tasks: {
    total: number;
    completed: number;
    inProgress: number;
    overdue: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
  };
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    entityName: string;
    user: {
      email: string;
      name?: string;
    };
    createdAt: string;
  }[];
  memberActivity: {
    userId: string;
    email: string;
    name?: string;
    taskCount: number;
    completedTasks: number;
    lastActiveAt?: string;
  }[];
  weeklyStats: {
    day: string;
    tasks: number;
    completed: number;
  }[];
}

// ─── Main Function ──────────────────────────────────────────────────────────

export async function getTeamDashboardStats(
  organizationId: string,
  userId: string,
): Promise<TeamDashboardStats> {
  await connectDB();

  // ─── Get Organization ────────────────────────────────────────────────────
  const organization = await Organization.findById(organizationId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  // ─── Check if user is member ────────────────────────────────────────────
  const isMember = await TeamMember.findOne({
    organizationId,
    userId,
    status: "active",
  });

  if (!isMember) {
    throw new Error("You are not a member of this organization");
  }

  // ─── Get Members ────────────────────────────────────────────────────────
  const members = await TeamMember.find({
    organizationId,
    status: { $in: ["active", "pending", "invited"] },
  });

  const memberIds = members
    .filter((m) => m.status === "active")
    .map((m) => m.userId);

  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === "active").length;
  const invitedMembers = members.filter((m) => m.status === "invited").length;
  const adminMembers = members.filter(
    (m) => m.role === "admin" || m.role === "owner",
  ).length;

  // ─── Get Tasks Stats ────────────────────────────────────────────────────
  const taskStats = await TaskModel.aggregate([
    {
      $match: {
        userId: { $in: memberIds },
        isArchived: false,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
        },
        inProgress: {
          $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
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
    overdue: 0,
  };

  // ─── Get Projects Stats ──────────────────────────────────────────────────
  const projectStats = await ProjectModel.aggregate([
    {
      $match: {
        userId: { $in: memberIds },
        isArchived: false,
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: {
          $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
        },
        completed: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
      },
    },
  ]);

  const projects = projectStats[0] || {
    total: 0,
    active: 0,
    completed: 0,
  };

  // ─── Get Recent Activity ─────────────────────────────────────────────────
  const recentActivity = await ActivityModel.find({
    userId: { $in: memberIds },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  // ─── Get Member Activity ─────────────────────────────────────────────────
  const memberActivity = await TaskModel.aggregate([
    {
      $match: {
        userId: { $in: memberIds },
        isArchived: false,
      },
    },
    {
      $group: {
        _id: "$userId",
        taskCount: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
        },
      },
    },
  ]);

  // Get member details with email
  const memberActivityWithDetails = await Promise.all(
    memberActivity.map(async (stat) => {
      const member = members.find((m) => m.userId === stat._id);
      return {
        userId: stat._id,
        email: member?.email || "Unknown",
        name: member?.name || member?.email?.split("@")[0] || "Unknown",
        taskCount: stat.taskCount,
        completedTasks: stat.completedTasks,
        lastActiveAt: member?.lastActiveAt,
      };
    }),
  );

  // Sort by task count
  memberActivityWithDetails.sort((a, b) => b.taskCount - a.taskCount);

  // ─── Get Weekly Stats ────────────────────────────────────────────────────
  const weeklyStats = await getWeeklyTeamStats(memberIds);

  // ─── Transform Activity ──────────────────────────────────────────────────
  const transformedActivity = recentActivity.map((activity: any) => {
    const member = members.find((m) => m.userId === activity.userId);
    return {
      id: activity._id.toString(),
      action: activity.action,
      entityType: activity.entityType,
      entityName: activity.entityName,
      user: {
        email: member?.email || "Unknown",
        name: member?.name || member?.email?.split("@")[0] || "Unknown",
      },
      createdAt: activity.createdAt.toISOString(),
    };
  });

  return {
    organization: {
      id: organization._id.toString(),
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt.toISOString(),
    },
    members: {
      total: totalMembers,
      active: activeMembers,
      invited: invitedMembers,
      admins: adminMembers,
    },
    tasks,
    projects,
    recentActivity: transformedActivity.slice(0, 10),
    memberActivity: memberActivityWithDetails.slice(0, 10),
    weeklyStats,
  };
}

// ─── Get Weekly Team Stats ─────────────────────────────────────────────────

async function getWeeklyTeamStats(memberIds: string[]) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  const tasks = await TaskModel.find({
    userId: { $in: memberIds },
    isArchived: false,
    createdAt: { $gte: startOfWeek, $lt: endOfWeek },
  }).select("status createdAt");

  const completed = await TaskModel.find({
    userId: { $in: memberIds },
    isArchived: false,
    status: "done",
    updatedAt: { $gte: startOfWeek, $lt: endOfWeek },
  }).select("updatedAt");

  // Group by day
  const dayMap = new Map();
  days.forEach((day) => {
    dayMap.set(day, { tasks: 0, completed: 0 });
  });

  tasks.forEach((task: any) => {
    const day = days[task.createdAt.getDay() - 1] || "Mon";
    const data = dayMap.get(day);
    if (data) data.tasks += 1;
  });

  completed.forEach((task: any) => {
    const day = days[task.updatedAt.getDay() - 1] || "Mon";
    const data = dayMap.get(day);
    if (data) data.completed += 1;
  });

  return days.map((day) => ({
    day,
    tasks: dayMap.get(day)?.tasks || 0,
    completed: dayMap.get(day)?.completed || 0,
  }));
}

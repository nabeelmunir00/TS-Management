// lib/services/project-service.ts
import connectDB from "@/lib/db";
import ProjectModel from "@/lib/models/Project";
import { Types } from "mongoose";
import { ProjectStatus, ProjectPriority, IProject } from "@/lib/models/Project";
import { v4 as uuidv4 } from "uuid";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CreateProjectInput {
  productId: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  priority?: ProjectPriority;
  status?: ProjectStatus;
  isFavorite?: boolean;
  isArchived?: boolean;
  tags?: string[];
  startDate?: string | Date;
  endDate?: string | Date;
  teamMembers?: {
    userId: string;
    name: string;
    avatar?: string;
    role: string;
    email?: string;
  }[];
}

export interface UpdateProjectInput extends Partial<CreateProjectInput> {
  id: string;
  userId: string;
  action?: "toggle-star" | "toggle-archive";
  isStarred?: boolean;
}

export interface ProjectFilters {
  search?: string;
  status?: string;
  priority?: string;
  favorite?: boolean;
  isArchived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse {
  projects: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// ─── Helper Functions ──────────────────────────────────────────────────────────

function transformProject(project: IProject): any {
  return {
    _id: project._id.toString(),
    id: project._id.toString(),
    projectId: project.projectId,
    name: project.name,
    description: project.description || "",
    color: project.color || "#6366f1",
    icon: project.icon || "",
    status: project.status || "active",
    priority: project.priority || "medium",
    isStarred: project.isFavorite || false,
    isArchived: project.isArchived || false,
    tags: project.tags || [],
    startDate: project.startDate
      ? project.startDate.toISOString().split("T")[0]
      : undefined,
    endDate: project.endDate
      ? project.endDate.toISOString().split("T")[0]
      : undefined,
    teamMembers: project.teamMembers || [],
    tasksCount: project.tasksCount || 0,
    completedTasks: project.completedTasks || 0,
    progress: project.progress || 0,
    isOverdue: project.isOverdue || false,
    isActive: project.isActive || false,
    createdAt: project.createdAt.toISOString().split("T")[0],
    updatedAt: project.updatedAt.toISOString().split("T")[0],
  };
}

// ─── 1. CREATE PROJECT ──────────────────────────────────────────────────────

export async function createProject(data: CreateProjectInput) {
  try {
    await connectDB();

    // ✅ Validation
    if (!data.name || !data.name.trim()) {
      return {
        success: false,
        error: "Project name is required",
      };
    }

    if (data.name.length > 100) {
      return {
        success: false,
        error: "Project name cannot exceed 100 characters",
      };
    }

    // ✅ Prepare project data
    const projectData = {
      projectId: `Project-${uuidv4().slice(0, 8).toUpperCase()}`,
      userId: data.userId,
      name: data.name.trim(),
      description: data.description?.trim() || "",
      color: data.color || "#6366f1",
      icon: data.icon || "",
      priority: data.priority || "medium",
      status: data.status || "active",
      isFavorite: data.isFavorite || false,
      isArchived: data.isArchived || false,
      tags: data.tags || [],
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      teamMembers: data.teamMembers || [],
      tasksCount: 0,
      completedTasks: 0,
    };

    // ✅ Create project
    const project = await ProjectModel.create(projectData);
    const projectObject = project.toObject();

    return {
      success: true,
      data: transformProject(projectObject as IProject),
    };
  } catch (error) {
    console.error("❌ Create project error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create project",
    };
  }
}

// ─── 2. GET ALL PROJECTS ───────────────────────────────────────────────────

export async function getAllProjects(userId: string, filters?: ProjectFilters) {
  try {
    await connectDB();

    const query: any = { userId };

    // ✅ Search filter
    if (filters?.search) {
      const searchRegex = new RegExp(filters.search, "i");
      query.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
      ];
    }

    // ✅ Status filter
    if (filters?.status === "archived") {
      query.isArchived = true;
    } else if (filters?.status === "active") {
      query.isArchived = false;
      query.status = { $ne: "archived" };
    } else if (filters?.status && filters.status !== "all") {
      query.status = filters.status;
    }

    // ✅ Priority filter
    if (filters?.priority && filters.priority !== "all") {
      query.priority = filters.priority;
    }

    // ✅ Favorite filter
    if (filters?.favorite) {
      query.isFavorite = true;
    }

    // ✅ Archived filter (if explicitly requested)
    if (filters?.isArchived !== undefined) {
      query.isArchived = filters.isArchived;
    }

    // ✅ Pagination
    const page = Math.max(1, filters?.page || 1);
    const limit = Math.min(filters?.limit || DEFAULT_LIMIT, MAX_LIMIT);
    const skip = (page - 1) * limit;

    // ✅ Sorting
    const sortBy = filters?.sortBy || "createdAt";
    const sortOrder = filters?.sortOrder === "asc" ? 1 : -1;
    const sort: any = {
      isFavorite: -1, // Favorites always first
      [sortBy]: sortOrder,
    };

    // ✅ Execute query
    const [projects, total] = await Promise.all([
      ProjectModel.find(query).sort(sort).skip(skip).limit(limit).lean().exec(),
      ProjectModel.countDocuments(query),
    ]);

    // ✅ Transform projects
    const transformedProjects = projects.map((project) =>
      transformProject(project as IProject),
    );

    return {
      success: true,
      data: transformedProjects,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error("❌ Get projects error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch projects",
    };
  }
}

// ─── 3. GET SINGLE PROJECT ────────────────────────────────────────────────

export async function getProjectById(id: string, userId: string) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid project ID" };
    }

    const project = await ProjectModel.findOne({
      _id: id,
      userId,
    }).lean();

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    return {
      success: true,
      data: transformProject(project as IProject),
    };
  } catch (error) {
    console.error("❌ Get project error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch project",
    };
  }
}

// ─── 4. UPDATE PROJECT ─────────────────────────────────────────────────────

export async function updateProject(data: UpdateProjectInput) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(data.id)) {
      return { success: false, error: "Invalid project ID" };
    }

    // ✅ Check if project exists
    const existingProject = await ProjectModel.findOne({
      _id: data.id,
      userId: data.userId,
    });

    if (!existingProject) {
      return { success: false, error: "Project not found" };
    }

    // ✅ Handle special actions
    if (data.action === "toggle-star") {
      const project = await ProjectModel.findOneAndUpdate(
        { _id: data.id, userId: data.userId },
        {
          $set: {
            isFavorite: !existingProject.isFavorite,
            updatedAt: new Date(),
          },
        },
        { new: true, lean: true },
      );

      return {
        success: true,
        data: transformProject(project as IProject),
      };
    }

    if (data.action === "toggle-archive") {
      const project = await ProjectModel.findOneAndUpdate(
        { _id: data.id, userId: data.userId },
        {
          $set: {
            isArchived: !existingProject.isArchived,
            updatedAt: new Date(),
          },
        },
        { new: true, lean: true },
      );

      return {
        success: true,
        data: transformProject(project as IProject),
      };
    }

    // ✅ Build update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Allowed fields
    const allowedFields = [
      "name",
      "description",
      "color",
      "icon",
      "priority",
      "status",
      "isFavorite",
      "isArchived",
      "tags",
      "teamMembers",
      "tasksCount",
      "completedTasks",
      "startDate",
      "endDate",
    ];

    allowedFields.forEach((field) => {
      if (data[field as keyof UpdateProjectInput] !== undefined) {
        if (field === "name") {
          updateData.name = data.name?.trim();
        } else if (field === "description") {
          updateData.description = data.description?.trim();
        } else if (field === "startDate" && data.startDate) {
          updateData.startDate = new Date(data.startDate);
        } else if (field === "endDate" && data.endDate) {
          updateData.endDate = new Date(data.endDate);
        } else if (field === "isFavorite") {
          updateData.isFavorite = data.isFavorite;
        } else if (field === "isStarred") {
          updateData.isFavorite = data.isStarred;
        } else {
          updateData[field] = data[field as keyof UpdateProjectInput];
        }
      }
    });

    // ✅ Update project
    const project = await ProjectModel.findOneAndUpdate(
      { _id: data.id, userId: data.userId },
      { $set: updateData },
      { new: true, runValidators: true, lean: true },
    );

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    return {
      success: true,
      data: transformProject(project as IProject),
    };
  } catch (error) {
    console.error("❌ Update project error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update project",
    };
  }
}

// ─── 5. DELETE PROJECT ─────────────────────────────────────────────────────

export async function deleteProject(id: string, userId: string) {
  try {
    await connectDB();

    if (!Types.ObjectId.isValid(id)) {
      return { success: false, error: "Invalid project ID" };
    }

    // ✅ Delete project (cascade delete will handle tasks)
    const project = await ProjectModel.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Delete project error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete project",
    };
  }
}

// ─── 6. GET PROJECT STATS ─────────────────────────────────────────────────

export async function getProjectStats(userId: string) {
  try {
    await connectDB();

    const [stats, favoriteCount, archivedCount] = await Promise.all([
      // ✅ Status stats
      ProjectModel.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]),

      // ✅ Favorite count
      ProjectModel.countDocuments({
        userId,
        isFavorite: true,
        isArchived: false,
      }),

      // ✅ Archived count
      ProjectModel.countDocuments({
        userId,
        isArchived: true,
      }),
    ]);

    const result = {
      total: 0,
      active: 0,
      "on-hold": 0,
      completed: 0,
      archived: 0,
      favorite: favoriteCount,
      archivedCount,
    };

    stats.forEach((stat) => {
      result[stat._id as keyof typeof result] = stat.count;
      result.total += stat.count;
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("❌ Get project stats error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch stats",
    };
  }
}

// ─── 7. GET PROJECTS WITH TASK STATS ─────────────────────────────────────

export async function getProjectsWithTaskStats(userId: string) {
  try {
    await connectDB();

    const projects = await ProjectModel.aggregate([
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

    const transformedProjects = projects.map((project) => ({
      ...project,
      _id: project._id.toString(),
      id: project._id.toString(),
      isStarred: project.isFavorite || false,
    }));

    return { success: true, data: transformedProjects };
  } catch (error) {
    console.error("❌ Get projects with task stats error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch projects",
    };
  }
}

// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  createTask,
  getAllTasks,
  getTaskStats,
  bulkDeleteTasks,
  bulkUpdateStatus,
  getRecentTasks,
} from "@/lib/services/task-services";
import { auth } from "@clerk/nextjs/server";
import { TaskStatus } from "@/lib/models/Task";
import { RateLimiter } from "@/lib/rate-limiter";

// ─── Constants ──────────────────────────────────────────────────────────────────

const RATE_LIMIT_REQUESTS = 100;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

// ─── GET: Fetch Tasks ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // ✅ Authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    // ✅ Rate Limiting
    const rateLimitResult = await RateLimiter.check(userId, {
      maxRequests: RATE_LIMIT_REQUESTS,
      windowMs: RATE_LIMIT_WINDOW,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
          },
        },
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // ✅ Parse query parameters
    const status = searchParams.get("status") as any;
    const priority = searchParams.get("priority") as any;
    const projectId = searchParams.get("projectId") as any;
    const assignedTo = searchParams.get("assignedTo") as any;
    const search = searchParams.get("search") as any;
    const stats = searchParams.get("stats") === "true";
    const recent = searchParams.get("recent") === "true";

    // ✅ Pagination parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "10"),
      100, // Max limit
    );
    const sortBy = (searchParams.get("sortBy") as any) || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") as any) || "desc";

    // ✅ Get statistics
    if (stats) {
      const statsResult = await getTaskStats(userId);
      if (!statsResult.success) {
        return NextResponse.json({ error: statsResult.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: statsResult.data,
      });
    }

    // ✅ Get recent tasks
    if (recent) {
      const recentResult = await getRecentTasks(
        userId,
        Math.min(parseInt(searchParams.get("limit") || "5"), 20),
      );

      if (!recentResult.success) {
        return NextResponse.json(
          { error: recentResult.error },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: recentResult.data,
      });
    }

    // ✅ Get all tasks with filters
    const result = await getAllTasks(userId, {
      status,
      priority,
      projectId,
      assignedTo,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
      isArchived: searchParams.get("archived") === "true" ? true : false,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("❌ GET /api/tasks error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch tasks",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

// ─── POST: Create Task ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // ✅ Authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    // ✅ Rate Limiting (stricter for POST)
    const rateLimitResult = await RateLimiter.check(userId, {
      maxRequests: 50,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please slow down.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
          },
        },
      );
    }

    // ✅ Parse and validate body
    const body = await request.json().catch(() => {
      throw new Error("Invalid JSON payload");
    });

    // ✅ Validate required fields
    const validationErrors = validateTaskInput(body);
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationErrors,
        },
        { status: 400 },
      );
    }

    // ✅ Create task
    const result = await createTask({
      ...body,
      userId,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          details: process.env.NODE_ENV === "development" ? result : undefined,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        message: "Task created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ POST /api/tasks error:", error);
    return NextResponse.json(
      {
        error: "Failed to create task",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

// ─── DELETE: Bulk Delete Tasks ─────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    // ✅ Authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    // ✅ Rate Limiting
    const rateLimitResult = await RateLimiter.check(userId, {
      maxRequests: 20,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please slow down.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
          },
        },
      );
    }

    // ✅ Parse body
    const body = await request.json().catch(() => {
      throw new Error("Invalid JSON payload");
    });

    const { ids, action = "delete" } = body;

    // ✅ Validate IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Task IDs are required and must be an array" },
        { status: 400 },
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { error: "Cannot delete more than 100 tasks at once" },
        { status: 400 },
      );
    }

    // ✅ Handle bulk update status
    if (action === "update-status" && body.status) {
      const statusResult = await bulkUpdateStatus(
        ids,
        userId,
        body.status as TaskStatus,
      );

      if (!statusResult.success || !statusResult.data) {
        return NextResponse.json(
          { error: statusResult.error || "Failed to update task status" },
          { status: 500 },
        );
      }

      const updatedData = statusResult.data;

      return NextResponse.json({
        success: true,
        data: updatedData,
        message: `${updatedData?.modifiedCount} tasks updated successfully`,
      });
    }

    // ✅ Handle bulk delete
    const result = await bulkDeleteTasks(ids, userId);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error || "Failed to delete tasks" },
        { status: 500 },
      );
    }

    const deletedData = result.data;

    return NextResponse.json({
      success: true,
      data: deletedData,
      message: `${deletedData.deletedCount} tasks deleted successfully`,
    });
  } catch (error) {
    console.error("❌ DELETE /api/tasks error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete tasks",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

// ─── PATCH: Bulk Update Tasks ──────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    // ✅ Authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    // ✅ Rate Limiting
    const rateLimitResult = await RateLimiter.check(userId, {
      maxRequests: 30,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please slow down.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
          },
        },
      );
    }

    // ✅ Parse body
    const body = await request.json().catch(() => {
      throw new Error("Invalid JSON payload");
    });

    const { ids, status, priority, isArchived, projectId } = body;

    // ✅ Validate IDs
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Task IDs are required and must be an array" },
        { status: 400 },
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { error: "Cannot update more than 100 tasks at once" },
        { status: 400 },
      );
    }

    // ✅ Build update data
    const updateData: any = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (isArchived !== undefined) updateData.isArchived = isArchived;
    if (projectId) updateData.projectId = projectId;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update provided" },
        { status: 400 },
      );
    }

    // ✅ Execute update
    const result = await bulkUpdateStatus(ids, userId, status || "todo");

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `Tasks updated successfully`,
    });
  } catch (error) {
    console.error("❌ PATCH /api/tasks error:", error);
    return NextResponse.json(
      {
        error: "Failed to update tasks",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

// ─── Validation Helper ──────────────────────────────────────────────────────

function validateTaskInput(body: any): string[] {
  const errors: string[] = [];

  if (!body.title || !body.title.trim()) {
    errors.push("Task title is required");
  } else if (body.title.length > 200) {
    errors.push("Task title cannot exceed 200 characters");
  }

  if (body.description && body.description.length > 2000) {
    errors.push("Description cannot exceed 2000 characters");
  }

  if (
    body.status &&
    !["todo", "in-progress", "review", "done"].includes(body.status)
  ) {
    errors.push("Invalid status value");
  }

  if (
    body.priority &&
    !["low", "medium", "high", "urgent"].includes(body.priority)
  ) {
    errors.push("Invalid priority value");
  }

  if (body.estimatedHours !== undefined && body.estimatedHours < 0) {
    errors.push("Estimated hours cannot be negative");
  }

  if (body.actualHours !== undefined && body.actualHours < 0) {
    errors.push("Actual hours cannot be negative");
  }

  if (body.dueDate && new Date(body.dueDate) < new Date()) {
    errors.push("Due date cannot be in the past");
  }

  if (body.tags && body.tags.length > 20) {
    errors.push("Cannot have more than 20 tags");
  }

  return errors;
}

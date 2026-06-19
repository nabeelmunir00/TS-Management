// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createProject,
  getAllProjects,
  getProjectStats,
  getProjectsWithTaskStats,
} from "@/lib/services/project-service";
import { RateLimiter } from "@/lib/rate-limiter";

// ─── GET: Fetch Projects ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    // ✅ Rate Limiting
    const rateLimitResult = await RateLimiter.check(`projects:${userId}`, {
      maxRequests: 100,
      windowMs: 60 * 1000,
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
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const favorite = searchParams.get("favorite") === "true";
    const stats = searchParams.get("stats") === "true";
    const withTaskStats = searchParams.get("withTaskStats") === "true";

    // ✅ Pagination
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as
      | "asc"
      | "desc";

    // ✅ Get statistics
    if (stats) {
      const statsResult = await getProjectStats(userId);
      if (!statsResult.success) {
        return NextResponse.json({ error: statsResult.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: statsResult.data,
      });
    }

    // ✅ Get projects with task stats
    if (withTaskStats) {
      const result = await getProjectsWithTaskStats(userId);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }

    // ✅ Get all projects
    const result = await getAllProjects(userId, {
      search,
      status,
      priority,
      favorite,
      page,
      limit,
      sortBy,
      sortOrder,
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
    console.error("❌ GET /api/projects error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch projects",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

// ─── POST: Create Project ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    // ✅ Rate Limiting
    const rateLimitResult = await RateLimiter.check(`projects:${userId}`, {
      maxRequests: 30,
      windowMs: 60 * 1000,
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

    const body = await request.json();

    // ✅ Validation
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 },
      );
    }

    // ✅ Create project
    const result = await createProject({
      ...body,
      userId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        message: "Project created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ POST /api/projects error:", error);
    return NextResponse.json(
      {
        error: "Failed to create project",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

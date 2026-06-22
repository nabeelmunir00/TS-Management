// app/api/projects/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getProjectById,
  updateProject,
  deleteProject,
} from "@/lib/services/project-service";
import { RateLimiter } from "@/lib/rate-limiter";

// ─── GET: Single Project ──────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const { id } = await params;

    // ✅ Rate Limiting
    const rateLimitResult = await RateLimiter.check(`project:${userId}:${id}`, {
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

    const result = await getProjectById(id, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Project not found" ? 404 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("❌ GET /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 },
    );
  }
}

// ─── PATCH: Update Project ─────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const { id } = await params;

    // ✅ Rate Limiting
    const rateLimitResult = await RateLimiter.check(`project:${userId}:${id}`, {
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
    const { action, ...updateData } = body;

    // ✅ Handle action-based updates
    if (action === "toggle-star" || action === "toggle-archive") {
      const result = await updateProject({
        id,
        userId,
        action,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.error === "Project not found" ? 404 : 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        message:
          action === "toggle-star"
            ? "Project star toggled"
            : "Project archive toggled",
      });
    }

    // ✅ Regular update
    const result = await updateProject({
      id,
      userId,
      ...updateData,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Project not found" ? 404 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: "Project updated successfully",
    });
  } catch (error) {
    console.error("❌ PATCH /api/projects/[id] error:", error);
    return NextResponse.json(
      {
        error: "Failed to update project",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

// ─── DELETE: Delete Project ─────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const { id } = await params;

    // ✅ Rate Limiting
    const rateLimitResult = await RateLimiter.check(`project:${userId}:${id}`, {
      maxRequests: 20,
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

    const result = await deleteProject(id, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Project not found" ? 404 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error("❌ DELETE /api/projects/[id] error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete project",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

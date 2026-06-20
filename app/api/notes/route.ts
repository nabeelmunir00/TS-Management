// app/api/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  createNote,
  getAllNotes,
  getNoteStats,
  bulkDeleteNotes,
} from "@/lib/services/note-service";
import { RateLimiter } from "@/lib/rate-limiter";

// ─── GET: Fetch Notes ──────────────────────────────────────────────────────

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
    const rateLimitResult = await RateLimiter.check(`notes:${userId}`, {
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
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const archived = searchParams.get("archived") === "true";
    const pinned = searchParams.get("pinned") === "true";
    const stats = searchParams.get("stats") === "true";

    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const sortBy = (searchParams.get("sortBy") || "createdAt") as any;
    const sortOrder = (searchParams.get("sortOrder") || "desc") as
      | "asc"
      | "desc";

    // ✅ Get stats
    if (stats) {
      const statsResult = await getNoteStats(userId);
      if (!statsResult.success) {
        return NextResponse.json({ error: statsResult.error }, { status: 500 });
      }
      return NextResponse.json({
        success: true,
        data: statsResult.data,
      });
    }

    // ✅ Get notes
    const result = await getAllNotes(userId, {
      search,
      category,
      projectId,
      archived,
      pinned,
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
    console.error("❌ GET /api/notes error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch notes",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

// ─── POST: Create Note ─────────────────────────────────────────────────────

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
    const rateLimitResult = await RateLimiter.check(`notes:${userId}`, {
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

    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: "Note title is required" },
        { status: 400 },
      );
    }

    const result = await createNote({
      userId,
      title: body.title.trim(),
      content: body.content || "",
      category: body.category || "other",
      tags: body.tags || [],
      isPinned: body.isPinned || false,
      isArchived: body.isArchived || false,
      color: body.color || "#FFFFFF",
      reminderDate: body.reminderDate,
      projectId: body.projectId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        message: "Note created successfully",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("❌ POST /api/notes error:", error);
    return NextResponse.json(
      {
        error: "Failed to create note",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

// ─── DELETE: Bulk Delete ──────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    // ✅ Rate Limiting
    const rateLimitResult = await RateLimiter.check(`notes:${userId}`, {
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

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Note IDs are required" },
        { status: 400 },
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { error: "Cannot delete more than 100 notes at once" },
        { status: 400 },
      );
    }

    const result = await bulkDeleteNotes(ids, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: `${result.data.deletedCount} notes deleted successfully`,
    });
  } catch (error) {
    console.error("❌ DELETE /api/notes error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete notes",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

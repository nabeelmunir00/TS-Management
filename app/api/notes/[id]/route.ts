// app/api/notes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getNoteById,
  updateNote,
  deleteNote,
} from "@/lib/services/note-service";
import { RateLimiter } from "@/lib/rate-limiter";

// ─── GET: Single Note ──────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
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
    const rateLimitResult = await RateLimiter.check(`note:${userId}:${id}`, {
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

    const result = await getNoteById(id, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Note not found" ? 404 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("❌ GET /api/notes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch note" },
      { status: 500 },
    );
  }
}

// ─── PATCH: Update Note ────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
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
    const rateLimitResult = await RateLimiter.check(`note:${userId}:${id}`, {
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

    const result = await updateNote({
      id,
      userId,
      ...body,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Note not found" ? 404 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: "Note updated successfully",
    });
  } catch (error) {
    console.error("❌ PATCH /api/notes/[id] error:", error);
    return NextResponse.json(
      {
        error: "Failed to update note",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

// ─── DELETE: Delete Note ──────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
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
    const rateLimitResult = await RateLimiter.check(`note:${userId}:${id}`, {
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

    const result = await deleteNote(id, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Note not found" ? 404 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("❌ DELETE /api/notes/[id] error:", error);
    return NextResponse.json(
      {
        error: "Failed to delete note",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

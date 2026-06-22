// app/api/tasks/[id]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createComment, getTaskComments } from "@/lib/services/comment-service";
import { RateLimiter } from "@/lib/rate-limiter";

// ─── GET: Get Task Comments ──────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const result = await getTaskComments(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("❌ GET /api/tasks/[id]/comments error:", error);
    return NextResponse.json(
      { error: "Failed to fetch comments" },
      { status: 500 },
    );
  }
}

// ─── POST: Create Comment ───────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Rate Limiting
    const rateLimitResult = await RateLimiter.check(`comment:${userId}:${id}`, {
      maxRequests: 20,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many comments. Please slow down.",
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

    if (!body.content || !body.content.trim()) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 },
      );
    }

    const result = await createComment({
      taskId: id,
      userId,
      content: body.content,
      parentId: body.parentId,
      mentions: body.mentions || [],
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: "Comment added successfully",
    });
  } catch (error) {
    console.error("❌ POST /api/tasks/[id]/comments error:", error);
    return NextResponse.json(
      { error: "Failed to create comment" },
      { status: 500 },
    );
  }
}

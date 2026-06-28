// app/api/tasks/[id]/comments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createComment, getTaskComments } from "@/lib/services/comment-service";
import { RateLimiter } from "@/lib/rate-limiter";

// ─── GET: Get Task Comments ──────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
  { params }: { params: Promise<{ id: string }> },
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

    // ✅ Create comment
    const result = await createComment({
      taskId: id,
      userId: userId,
      content: body.content,
      parentId: body.parentId || null,
      mentions: body.mentions || [],
      email: body.email || "",
      userName: body.userName || "User",
      avatar: body.avatar || "",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    try {
      const io = (global as any).io;
      if (io) {
        const commentData = {
          ...result.data,
          content: result.data.content,
          _id: result.data._id,
          createdAt: result.data.createdAt,
          userId: userId,
          userName: body.userName || "User",
          userAvatar: body.avatar || "",
        };

        // Emit to all clients in the task room
        io.to(`task:${id}`).emit("comment:new", commentData);
        console.log(`📤 Socket emitted comment:new for task ${id}`);
      } else {
        console.warn(
          "⚠️ Socket.io not initialized. Real-time updates disabled.",
        );
      }
    } catch (socketError) {
      console.error("❌ Socket emit error:", socketError);
      // Don't fail the request if socket fails
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

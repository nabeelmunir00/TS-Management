// app/api/comments/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  updateComment,
  deleteComment,
  addReaction,
} from "@/lib/services/comment-service";

// ─── PATCH: Update Comment ──────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // ✅ Fixed: params is Promise
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params; // ✅ Await the params
    const body = await request.json();

    const result = await updateComment({
      commentId: id,
      userId,
      content: body.content,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.includes("unauthorized") ? 403 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: "Comment updated successfully",
    });
  } catch (error) {
    console.error("❌ PATCH /api/comments/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update comment" },
      { status: 500 },
    );
  }
}

// ─── DELETE: Delete Comment ─────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // ✅ Fixed: params is Promise
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params; // ✅ Await the params

    const result = await deleteComment(id, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error?.includes("unauthorized") ? 403 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("❌ DELETE /api/comments/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 },
    );
  }
}

// ─── POST: Add Reaction ─────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }, // ✅ Fixed: params is Promise
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params; // ✅ Await the params
    const body = await request.json();

    if (!body.reaction) {
      return NextResponse.json(
        { error: "Reaction type is required" },
        { status: 400 },
      );
    }

    const result = await addReaction({
      commentId: id,
      userId,
      reaction: body.reaction,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("❌ POST /api/comments/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to add reaction" },
      { status: 500 },
    );
  }
}

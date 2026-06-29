// app/api/tasks/[id]/comments/[commentId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import CommentModel from "@/lib/models/Comment";

// ─── DELETE: Remove comment ───────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const { id, commentId } = await params;

    const comment = await CommentModel.findOne({
      _id: commentId,
      taskId: id,
      userId, // only owner can delete
    });

    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    await CommentModel.findByIdAndDelete(commentId);

    // ── Emit delete event ──
    const io = (global as any).io;
    if (io) {
      io.to(`task:${id}`).emit("comment:deleted", {
        commentId: commentId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /comments error:", err);
    return NextResponse.json(
      { error: "Failed to delete comment" },
      { status: 500 },
    );
  }
}

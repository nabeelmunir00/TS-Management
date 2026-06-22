// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  getTaskById,
  updateTask,
  deleteTask,
  toggleTaskStatus,
  archiveTask,
} from "@/lib/services/tast-services";
import { auth } from "@clerk/nextjs/server";

// ─── GET: Get Single Task ──────────────────────────────────────────────────

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
    const includeArchived =
      request.nextUrl.searchParams.get("archived") === "true";

    const result = await getTaskById(id, userId, includeArchived);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Task not found" ? 404 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("❌ GET /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 },
    );
  }
}

// ─── PUT: Update Task ──────────────────────────────────────────────────────

export async function PUT(
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
    const body = await request.json();

    const result = await updateTask({
      id,
      userId,
      ...body,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Task not found" ? 404 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("❌ PUT /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

// ─── PATCH: Partial Update Task ────────────────────────────────────────────

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
    const body = await request.json();
    const { action, ...updateData } = body;

    // ✅ Handle special actions
    if (action === "toggle-status") {
      const result = await toggleTaskStatus(id, userId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.error === "Task not found" ? 404 : 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        message: "Task status toggled successfully",
      });
    }

    if (action === "archive" || action === "unarchive") {
      const archive = action === "archive";
      const result = await archiveTask(id, userId, archive);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: result.error === "Task not found" ? 404 : 500 },
        );
      }

      return NextResponse.json({
        success: true,
        data: result.data,
        message: `Task ${archive ? "archived" : "unarchived"} successfully`,
      });
    }

    // ✅ Regular update
    const result = await updateTask({
      id,
      userId,
      ...updateData,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Task not found" ? 404 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      message: "Task updated successfully",
    });
  } catch (error) {
    console.error("❌ PATCH /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

// ─── DELETE: Delete Task ──────────────────────────────────────────────────

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

    const result = await deleteTask(id, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Task not found" ? 404 : 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.error("❌ DELETE /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}

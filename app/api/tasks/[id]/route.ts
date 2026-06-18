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

// ─── GET: Get single task ──────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await getTaskById(params.id, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Task not found" ? 404 : 500 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("❌ GET /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 },
    );
  }
}

// ─── PUT: Update task ──────────────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (body.title !== undefined && !body.title.trim()) {
      return NextResponse.json(
        { error: "Task title cannot be empty" },
        { status: 400 },
      );
    }

    const result = await updateTask({
      id: params.id,
      userId,
      ...body,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Task not found" ? 404 : 500 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("❌ PUT /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

// ─── DELETE: Delete task ──────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await deleteTask(params.id, userId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Task not found" ? 404 : 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ DELETE /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 },
    );
  }
}

// ─── PATCH: Partial updates (toggle status, archive, etc.) ──────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    let result;

    switch (action) {
      case "toggle-status":
        result = await toggleTaskStatus(params.id, userId);
        break;
      case "archive":
        result = await archiveTask(params.id, userId, true);
        break;
      case "unarchive":
        result = await archiveTask(params.id, userId, false);
        break;
      default:
        return NextResponse.json(
          {
            error: "Invalid action. Use: toggle-status, archive, unarchive",
          },
          { status: 400 },
        );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.error === "Task not found" ? 404 : 500 },
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("❌ PATCH /api/tasks/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 },
    );
  }
}

// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  createTask,
  getAllTasks,
  getTaskStats,
  bulkDeleteTasks,
} from "@/lib/services/tast-services";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") as any;
    const priority = searchParams.get("priority") as any;
    const projectId = searchParams.get("projectId") as any;
    const assignedTo = searchParams.get("assignedTo") as any;
    const search = searchParams.get("search") as any;
    const stats = searchParams.get("stats") === "true";

    // Get statistics
    if (stats) {
      const statsResult = await getTaskStats(userId);
      if (!statsResult.success) {
        return NextResponse.json({ error: statsResult.error }, { status: 500 });
      }
      return NextResponse.json(statsResult.data);
    }

    const result = await getAllTasks(userId, {
      status,
      priority,
      projectId,
      assignedTo,
      search,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("❌ GET /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 },
      );
    }

    // Create task with userId
    const result = await createTask({
      ...body,
      userId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error("❌ POST /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 },
    );
  }
}

// ─── Bulk Delete ──────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Task IDs are required" },
        { status: 400 },
      );
    }

    const result = await bulkDeleteTasks(ids, userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("❌ DELETE /api/tasks error:", error);
    return NextResponse.json(
      { error: "Failed to delete tasks" },
      { status: 500 },
    );
  }
}

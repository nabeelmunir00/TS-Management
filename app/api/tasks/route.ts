// app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createTask, getAllTasks, getTaskStats } from "@/lib/task-service";
import { auth } from "@clerk/nextjs/server"; // If using Clerk

export async function GET(request: NextRequest) {
  try {
    // ── Get user from auth ──
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") ?? undefined;
    const priority = searchParams.get("priority") ?? undefined;
    const projectId = searchParams.get("projectId") ?? undefined;
    const assignedTo = searchParams.get("assignedTo") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const stats = searchParams.get("stats") === "true";

    // ── Get stats if requested ──
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
    // ── Get user from auth ──
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // ── Validate required fields ──
    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 },
      );
    }

    // ── Add userId to body ──
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

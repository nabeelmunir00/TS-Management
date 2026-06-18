import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";

async function getTaskId(context: { params: { id: string } }) {
  const params = await context.params;
  return params.id;
}

// ─── GET: Single project ──────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    const id = await getTaskId(context);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const project = await Project.findOne({
      _id: id,
      userId,
    }).lean();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Transform response
    const transformedProject = {
      _id: project._id.toString(),
      id: project._id.toString(),
      name: project.name,
      description: project.description || "",
      color: project.color || "#6366f1",
      icon: project.icon || "",
      status: project.isArchived ? "archived" : "active",
      priority: project.priority || "medium",
      isStarred: project.isFavorite || false,
      isArchived: project.isArchived || false,
      tags: project.tags || [],
      startDate: project.startDate
        ? project.startDate.toISOString().split("T")[0]
        : undefined,
      endDate: project.endDate
        ? project.endDate.toISOString().split("T")[0]
        : undefined,
      teamMembers: project.teamMembers || [],
      tasksCount: project.tasksCount || 0,
      completedTasks: project.completedTasks || 0,
      createdAt: project.createdAt.toISOString().split("T")[0],
      updatedAt: project.updatedAt.toISOString().split("T")[0],
    };

    return NextResponse.json(transformedProject);
  } catch (error) {
    console.error("❌ GET /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project" },
      { status: 500 },
    );
  }
}

// ─── PATCH: Update project ────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    const id = await getTaskId(context);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { action } = body;

    // Handle special actions
    if (action === "toggle-star") {
      const project = await Project.findOne({ _id: id, userId });
      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 },
        );
      }

      project.isFavorite = !project.isFavorite;
      project.updatedAt = new Date();
      await project.save();

      const transformedProject = {
        _id: project._id.toString(),
        id: project._id.toString(),
        name: project.name,
        description: project.description || "",
        color: project.color || "#6366f1",
        icon: project.icon || "",
        status: project.status,
        priority: project.priority || "medium",
        isStarred: project.isFavorite || false,
        isArchived: project.isArchived || false,
        tags: project.tags || [],
        startDate: project.startDate
          ? project.startDate.toISOString().split("T")[0]
          : undefined,
        endDate: project.endDate
          ? project.endDate.toISOString().split("T")[0]
          : undefined,
        teamMembers: project.teamMembers || [],
        tasksCount: project.tasksCount || 0,
        completedTasks: project.completedTasks || 0,
        createdAt: project.createdAt.toISOString().split("T")[0],
        updatedAt: project.updatedAt.toISOString().split("T")[0],
      };

      return NextResponse.json(transformedProject);
    }

    if (action === "toggle-archive") {
      const project = await Project.findOne({ _id: id, userId });
      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 },
        );
      }

      project.isArchived = !project.isArchived;
      project.updatedAt = new Date();
      await project.save();

      const transformedProject = {
        _id: project._id.toString(),
        id: project._id.toString(),
        name: project.name,
        description: project.description || "",
        color: project.color || "#6366f1",
        icon: project.icon || "",
        status: project.status || "active",
        priority: project.priority || "medium",
        isStarred: project.isFavorite || false,
        isArchived: project.isArchived || false,
        tags: project.tags || [],
        startDate: project.startDate
          ? project.startDate.toISOString().split("T")[0]
          : undefined,
        endDate: project.endDate
          ? project.endDate.toISOString().split("T")[0]
          : undefined,
        teamMembers: project.teamMembers || [],
        tasksCount: project.tasksCount || 0,
        completedTasks: project.completedTasks || 0,
        createdAt: project.createdAt.toISOString().split("T")[0],
        updatedAt: project.updatedAt.toISOString().split("T")[0],
      };

      return NextResponse.json(transformedProject);
    }

    // ─── Regular Update ──────────────────────────────────────────────────
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Basic fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.icon !== undefined) updateData.icon = body.icon;

    // 🔥 FIX: Priority - now properly stored in model
    if (body.priority !== undefined) {
      updateData.priority = body.priority;
    }

    // Tags and team members
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.teamMembers !== undefined)
      updateData.teamMembers = body.teamMembers;

    // Task counts
    if (body.tasksCount !== undefined) updateData.tasksCount = body.tasksCount;
    if (body.completedTasks !== undefined)
      updateData.completedTasks = body.completedTasks;

    // Dates
    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate
        ? new Date(body.startDate)
        : undefined;
    }
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : undefined;
    }
    if (body.status !== undefined) {
      // Map status to isArchived
      updateData.status = body.status;
    }

    // 🔥 FIX: Status handling
    if (body.status !== undefined) {
      // Map status to isArchived
      updateData.isArchived = body.status === "archived";
    }

    // Handle isArchived directly if provided
    if (body.isArchived !== undefined) {
      updateData.isArchived = body.isArchived;
    }

    // Handle favorite/starred
    if (body.isStarred !== undefined) {
      updateData.isFavorite = body.isStarred;
    }

    // Debug log
    console.log("🔄 Update Data:", updateData);

    const project = await Project.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true, runValidators: true },
    ).lean();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Transform response
    const transformedProject = {
      _id: project._id.toString(),
      id: project._id.toString(),
      name: project.name,
      description: project.description || "",
      color: project.color || "#6366f1",
      icon: project.icon || "",
      status: project.status || "active",
      priority: project.priority || "medium",
      isStarred: project.isFavorite || false,
      isArchived: project.isArchived || false,
      tags: project.tags || [],
      startDate: project.startDate
        ? project.startDate.toISOString().split("T")[0]
        : undefined,
      endDate: project.endDate
        ? project.endDate.toISOString().split("T")[0]
        : undefined,
      teamMembers: project.teamMembers || [],
      tasksCount: project.tasksCount || 0,
      completedTasks: project.completedTasks || 0,
      createdAt: project.createdAt.toISOString().split("T")[0],
      updatedAt: project.updatedAt.toISOString().split("T")[0],
    };

    return NextResponse.json(transformedProject);
  } catch (error) {
    console.error("❌ PATCH /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update project" },
      { status: 500 },
    );
  }
}

// ─── DELETE: Delete project ──────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    const id = await getTaskId(context);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const result = await Project.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!result) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Project deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ DELETE /api/projects/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete project" },
      { status: 500 },
    );
  }
}

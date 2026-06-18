import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";

// ─── GET: Single project ──────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const project = await Project.findOne({
      _id: params.id,
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
      priority: "medium",
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
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();
    const { action } = body;

    // Handle special actions
    if (action === "toggle-star") {
      const project = await Project.findOne({ _id: params.id, userId });
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
        status: project.isArchived ? "archived" : "active",
        priority: "medium",
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
      const project = await Project.findOne({ _id: params.id, userId });
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
        status: project.isArchived ? "archived" : "active",
        priority: "medium",
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

    // Regular update
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.teamMembers !== undefined)
      updateData.teamMembers = body.teamMembers;
    if (body.tasksCount !== undefined) updateData.tasksCount = body.tasksCount;
    if (body.completedTasks !== undefined)
      updateData.completedTasks = body.completedTasks;
    if (body.startDate !== undefined)
      updateData.startDate = body.startDate
        ? new Date(body.startDate)
        : undefined;
    if (body.endDate !== undefined)
      updateData.endDate = body.endDate ? new Date(body.endDate) : undefined;
    if (body.isStarred !== undefined) updateData.isFavorite = body.isStarred;
    if (body.isArchived !== undefined) updateData.isArchived = body.isArchived;

    const project = await Project.findOneAndUpdate(
      { _id: params.id, userId },
      updateData,
      { new: true, runValidators: true },
    ).lean();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const transformedProject = {
      _id: project._id.toString(),
      id: project._id.toString(),
      name: project.name,
      description: project.description || "",
      color: project.color || "#6366f1",
      icon: project.icon || "",
      status: project.isArchived ? "archived" : "active",
      priority: "medium",
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
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const result = await Project.findOneAndDelete({
      _id: params.id,
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

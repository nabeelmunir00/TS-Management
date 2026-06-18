import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";

// ─── GET: Fetch all projects ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // active, archived, all
    const priority = searchParams.get("priority"); // Not in model, will handle later
    const favorite = searchParams.get("favorite"); // true/false

    let query: any = { userId };

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }

    // Status filter
    if (status === "archived") {
      query.isArchived = true;
    } else if (status === "active") {
      query.isArchived = false;
    } else {
      // 'all' - don't filter
    }

    // Favorite filter
    if (favorite === "true") {
      query.isFavorite = true;
    }

    const projects = await Project.find(query)
      .sort({ isFavorite: -1, updatedAt: -1 })
      .lean();

    // Transform to match frontend interface
    const transformedProjects = projects.map((project) => ({
      _id: project._id.toString(),
      id: project._id.toString(),
      name: project.name,
      description: project.description || "",
      color: project.color || "#6366f1",
      icon: project.icon || "",
      status: project.isArchived ? "archived" : "active",
      priority: "medium", // Default since not in model
      isStarred: project.isFavorite || false,
      isArchived: project.isArchived || false,
      tags: project.tags || [],
      startDate: project.startDate,
      endDate: project.endDate,
      teamMembers: project.teamMembers || [],
      tasksCount: project.tasksCount || 0,
      completedTasks: project.completedTasks || 0,
      createdAt: project.createdAt.toISOString().split("T")[0],
      updatedAt: project.updatedAt.toISOString().split("T")[0],
    }));

    return NextResponse.json(transformedProjects);
  } catch (error) {
    console.error("❌ GET /api/projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}

// ─── POST: Create new project ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const body = await req.json();

    // Map frontend fields to model fields
    const projectData = {
      userId,
      name: body.name,
      description: body.description || "",
      color: body.color || "#6366f1",
      icon: body.icon || "",
      isFavorite: body.isStarred || body.isFavorite || false,
      isArchived: body.status === "archived" || false,
      tags: body.tags || [],
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      teamMembers: body.teamMembers || [],
      tasksCount: body.tasksCount || 0,
      completedTasks: body.completedTasks || 0,
      updatedAt: new Date(),
    };

    const project = new Project(projectData);
    await project.save();

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

    return NextResponse.json(transformedProject, { status: 201 });
  } catch (error) {
    console.error("❌ POST /api/projects error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}

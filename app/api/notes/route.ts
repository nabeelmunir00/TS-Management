// app/api/notes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { noteService } from "@/lib/services/note-service";

// ─── GET: Fetch all notes ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const category = searchParams.get("category") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const archived = searchParams.get("archived") === "true";
    const limit = parseInt(searchParams.get("limit") || "100");

    const notes = await noteService.getNotes(userId, {
      search,
      category,
      archived,
      projectId,
      limit,
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("❌ GET /api/notes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 },
    );
  }
}

// ─── POST: Create new note ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate required fields
    if (!body.title || !body.title.trim()) {
      return NextResponse.json(
        { error: "Note title is required" },
        { status: 400 },
      );
    }

    const note = await noteService.createNote({
      userId,
      title: body.title.trim(),
      content: body.content || "",
      isPinned: body.isPinned || false,
      color: body.color || "#ffffff",
      tags: body.tags || [],
      category: body.category || "",
      reminderDate: body.reminderDate || "",
      isArchived: body.isArchived || false,
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("❌ POST /api/notes error:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 },
    );
  }
}

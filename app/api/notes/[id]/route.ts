// app/api/notes/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { noteService } from "@/lib/services/note-service";

async function getNoteId(context: { params: { id: string } }) {
  const params = await context.params;
  return params.id;
}

// ─── GET: Single note ──────────────────────────────────────────────────
export async function GET(
  req: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const noteId = await getNoteId(context);

    const note = await noteService.getNoteById(userId, noteId);

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("❌ GET /api/notes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch note" },
      { status: 500 },
    );
  }
}

// ─── PATCH: Update note ─────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const noteId = await getNoteId(context);
    const body = await req.json();

    const note = await noteService.updateNote(userId, noteId, body);

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(note);
  } catch (error) {
    console.error("❌ PATCH /api/notes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 },
    );
  }
}

// ─── DELETE: Delete note ───────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const noteId = await getNoteId(context);

    const deleted = await noteService.deleteNote(userId, noteId);

    if (!deleted) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Note deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ DELETE /api/notes/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 },
    );
  }
}

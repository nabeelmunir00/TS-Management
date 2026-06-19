// app/api/notes/bulk/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { noteService } from "@/lib/services/note-service";

// ─── DELETE: Bulk delete notes ─────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Note IDs are required" },
        { status: 400 },
      );
    }

    const deletedCount = await noteService.bulkDeleteNotes(userId, ids);

    return NextResponse.json({
      message: `${deletedCount} notes deleted successfully`,
      deletedCount,
    });
  } catch (error) {
    console.error("❌ DELETE /api/notes/bulk error:", error);
    return NextResponse.json(
      { error: "Failed to delete notes" },
      { status: 500 },
    );
  }
}

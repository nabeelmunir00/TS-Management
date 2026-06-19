// app/api/notes/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { noteService } from "@/lib/services/note-service";

// ─── GET: Note statistics ──────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await noteService.getNoteStats(userId);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("❌ GET /api/notes/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch note statistics" },
      { status: 500 },
    );
  }
}

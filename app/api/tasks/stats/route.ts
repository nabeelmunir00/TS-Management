import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import Note from "@/lib/models/Note";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const [total, pinned] = await Promise.all([
      Note.countDocuments({ userId }),
      Note.countDocuments({ userId, isPinned: true, isArchived: false }),
    ]);

    return NextResponse.json({ total, pinned });
  } catch (error) {
    console.error("❌ GET /api/notes/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch note stats" },
      { status: 500 },
    );
  }
}

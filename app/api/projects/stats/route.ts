import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";
import Project from "@/lib/models/Project";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const [total, active] = await Promise.all([
      Project.countDocuments({ userId }),
      Project.countDocuments({ userId, isArchived: false }),
    ]);

    return NextResponse.json({ total, active });
  } catch (error) {
    console.error("❌ GET /api/projects/stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch project stats" },
      { status: 500 },
    );
  }
}

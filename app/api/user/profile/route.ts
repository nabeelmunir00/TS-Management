// app/api/user/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getUserStats } from "@/lib/services/user-service";
import { RateLimiter } from "@/lib/rate-limiter";

// ─── GET: Get User Profile ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate Limiting
    const rateLimitResult = await RateLimiter.check(`profile:${userId}`, {
      maxRequests: 20,
      windowMs: 60 * 1000,
    });

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429 },
      );
    }

    // ✅ Get user from Clerk
    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    // ✅ Get user stats
    const stats = await getUserStats(userId);

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        fullName: user.fullName || "",
        username: user.username || "",
        avatar: user.imageUrl || "",
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        stats: stats || {
          totalTasks: 0,
          completedTasks: 0,
          totalProjects: 0,
          totalNotes: 0,
          organizations: 0,
          joinedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error("❌ GET /api/user/profile error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 },
    );
  }
}

// ─── PATCH: Update User Profile ────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, username } = body;

    // ✅ Update user in Clerk
    const client = await clerkClient();
    const updatedUser = await client.users.updateUser(userId, {
      firstName,
      lastName,
      username,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        firstName: updatedUser.firstName || "",
        lastName: updatedUser.lastName || "",
        fullName: updatedUser.fullName || "",
        username: updatedUser.username || "",
        avatar: updatedUser.imageUrl || "",
      },
    });
  } catch (error) {
    console.error("❌ PATCH /api/user/profile error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }
}

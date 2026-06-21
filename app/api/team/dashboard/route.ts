// app/api/team/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getTeamDashboardStats } from "@/lib/services/team-dashboard-service";
import { RateLimiter } from "@/lib/rate-limiter";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized - Please sign in" },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 },
      );
    }

    // Rate Limiting
    const rateLimitResult = await RateLimiter.check(
      `team-dashboard:${userId}:${organizationId}`,
      {
        maxRequests: 30,
        windowMs: 60 * 1000,
      },
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimitResult.retryAfter?.toString() || "60",
          },
        },
      );
    }

    const stats = await getTeamDashboardStats(organizationId, userId);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("❌ GET /api/team/dashboard error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch team dashboard",
      },
      { status: 500 },
    );
  }
}

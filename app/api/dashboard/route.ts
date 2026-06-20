// app/api/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDashboardStats } from "@/lib/services/dashboard-service";
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

    // Rate Limiting
    const rateLimitResult = await RateLimiter.check(`dashboard:${userId}`, {
      maxRequests: 50,
      windowMs: 60 * 1000,
    });

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

    const stats = await getDashboardStats(userId);

    // ✅ Debug: Log the response structure
    console.log("📊 Dashboard API - Projects:", stats.projects);
    console.log("📊 Dashboard API - Recent Tasks:", stats.recentTasks?.length);

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("❌ GET /api/dashboard error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch dashboard stats",
        details:
          process.env.NODE_ENV === "development"
            ? (error as Error).message
            : undefined,
      },
      { status: 500 },
    );
  }
}

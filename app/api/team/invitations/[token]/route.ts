// app/api/team/invitations/[token]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getInvitationDetails } from "@/lib/services/team-service";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const result = await getInvitationDetails(token);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    console.error("❌ GET /api/team/invitations/[token] error:", error);
    return NextResponse.json(
      { error: "Failed to get invitation details" },
      { status: 500 },
    );
  }
}

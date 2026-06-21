// app/api/team/invitations/accept/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { acceptInvitation } from "@/lib/services/team-service";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { token } = body;
    const client = await clerkClient();

    const user = await client.users.getUser(userId);
    const email = user.emailAddresses[0].emailAddress;

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const result = await acceptInvitation({
      token,
      userId,
      email,
    });
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error) {
    console.error("❌ POST /api/team/invitations/accept error:", error);
    return NextResponse.json(
      { error: "Failed to accept invitation" },
      { status: 500 },
    );
  }
}

// app/api/generate-task/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateTaskData } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const { title, description } = await request.json();
    const result = await generateTaskData(title, description);
    console.log("Result", result);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate task data" },
      { status: 500 },
    );
  }
}

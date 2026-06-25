// app/api/ai/generate-task/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateTaskData } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, description } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // ✅ Call lib/ai.ts — Gemini 1.5 Flash with improved prompt
    const result = await generateTaskData(title.trim(), description?.trim());

    return NextResponse.json({
      enhancedDescription: result.enhancedDescription,
      suggestedPriority: result.suggestedPriority,
      suggestedTags: result.suggestedTags,
      suggestedSubtasks: result.suggestedSubtasks,
    });
  } catch (err: any) {
    console.error("[AI Generate Task]", err);
    return NextResponse.json(
      { error: err?.message ?? "AI generation failed" },
      { status: 500 },
    );
  }
}

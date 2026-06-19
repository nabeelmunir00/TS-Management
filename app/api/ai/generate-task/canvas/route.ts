// app/api/ai/generate-task/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env.local");
  return new GoogleGenerativeAI(apiKey);
}

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json();

    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 500,
      },
    });

    const prompt = `
You are a project management AI assistant. Analyze this task and generate structured data.

Task Title: "${title}"
${description ? `Description: "${description}"` : "No description provided"}

Return ONLY valid JSON (no markdown, no backticks, no explanation):
{
  "enhancedDescription": "Professional 1-2 sentence description",
  "suggestedPriority": "high|medium|low",
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "suggestedSubtasks": [
    { "id": "1", "title": "Subtask title", "done": false }
  ]
}

Rules:
- Tags: 2-4, lowercase, hyphen-separated
- Priority: high if urgent/critical, medium if important, low if nice-to-have
- Subtasks: 2-4 clear actionable steps
`.trim();

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned invalid JSON");
      parsed = JSON.parse(match[0]);
    }

    return NextResponse.json({
      enhancedDescription: parsed.enhancedDescription || description || title,
      suggestedPriority: parsed.suggestedPriority || "medium",
      suggestedTags: parsed.suggestedTags || [],
      suggestedSubtasks: (parsed.suggestedSubtasks ?? []).map(
        (s: any, i: number) => ({
          id: s.id ?? Date.now().toString() + i,
          title: s.title,
          done: false,
        }),
      ),
    });
  } catch (err: any) {
    console.error("[AI Generate Task]", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}

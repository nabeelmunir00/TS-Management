import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a project management assistant. Generate task suggestions in JSON format.
          Return a JSON object with:
          - description: A comprehensive task description (2-3 sentences)
          - tags: Array of 2-4 relevant tags (lowercase, hyphen-separated)
          - priority: "high", "medium", or "low"
          - estimatedDays: Number of days to complete (1-7)
          - subtasks: Array of 2-4 subtask titles
          
          Example response:
          {
            "description": "Implement user authentication using Clerk including OAuth providers (Google, GitHub) and JWT session management.",
            "tags": ["auth", "security", "clerk"],
            "priority": "high",
            "estimatedDays": 3,
            "subtasks": ["Install Clerk SDK", "Configure OAuth providers", "Setup webhook handlers", "Test authentication flow"]
          }`,
        },
        {
          role: "user",
          content: `Generate task details for: ${title}`,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated");
    }

    const result = JSON.parse(content);

    // Validate and sanitize the response
    return NextResponse.json({
      description: result.description || "",
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 5) : [],
      priority: ["high", "medium", "low"].includes(result.priority)
        ? result.priority
        : "medium",
      estimatedDays: Math.min(Math.max(result.estimatedDays || 3, 1), 14),
      subtasks: Array.isArray(result.subtasks)
        ? result.subtasks.slice(0, 5)
        : [],
    });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate task suggestions" },
      { status: 500 },
    );
  }
}

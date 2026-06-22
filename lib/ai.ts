// lib/ai.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AIGeneratedData {
  suggestedTags: string[];
  enhancedDescription: string;
  suggestedPriority: "high" | "medium" | "low";
  suggestedSubtasks: { title: string; done: boolean }[];
}

// ─── Gemini Client (Singleton) ─────────────────────────────────────────────

let geminiInstance: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("❌ GEMINI_API_KEY is not set in environment variables");
      throw new Error(
        "Gemini API key is missing. Please add GEMINI_API_KEY to your .env.local file.",
      );
    }

    geminiInstance = new GoogleGenerativeAI(apiKey);
  }

  return geminiInstance;
}

// ─── Main AI Function ──────────────────────────────────────────────────────

export async function generateTaskData(
  title: string,
  description?: string,
): Promise<AIGeneratedData> {
  try {
    const genAI = getGeminiClient();

    // Use gemini-pro model (fast & free)
    const model = genAI.getGenerativeModel({
      model: "gemini-pro", // or "gemini-pro" for older version
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 5000,
      },
    });

    const prompt = `
  You are an expert project management assistant.

  Analyze the provided task and generate intelligent project suggestions.

  Requirements:

  1. suggestedTags
    - Generate 3-5 highly relevant tags.
    - Use lowercase only.
    - Use hyphen-separated words.
    - Tags should describe the task category, technology, domain, or objective.
    - Avoid generic tags like "task", "project", or "work".

  2. enhancedDescription
    - Rewrite the task description professionally.
    - Make it clear, actionable, and concise.
    - Length: 1-5 sentences.
    - If no description is provided, create a meaningful description based on the title.
    - Do not repeat the title verbatim.

  3. suggestedPriority
    - "high" → urgent, deadline-driven, blocking, critical, or time-sensitive tasks.
    - "medium" → important tasks with normal priority.
    - "low" → optional, enhancement, research, or nice-to-have tasks.
    - Return ONLY one of: "high", "medium", "low".

  4. suggestedSubtasks
    - Generate 2-4 practical subtasks.
    - Each subtask must be a clear action item.
    - Length: 3-6 words.
    - Avoid vague items like "Do task" or "Complete work".
    - Each subtask must have:
      {
        "title": "Subtask title",
        "done": false
      }

  Task Information:

  Title: "${title}"

  ${description ? `Description: "${description}"` : "Description: Not provided"}

  Output Rules:

  - Return ONLY valid JSON.
  - Do NOT use markdown.
  - Do NOT include explanations.
  - Do NOT wrap JSON in code blocks.
  - Do NOT include comments.
  - All fields are required.

  Expected JSON format:

  {
    "suggestedTags": ["tag-1", "tag-2", "tag-3"],
    "enhancedDescription": "Professional task description.",
    "suggestedPriority": "medium",
    "suggestedSubtasks": [
      {
        "title": "First action item",
        "done": false
      },
      {
        "title": "Second action item",
        "done": false
      }
    ]
  }
  `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Clean the response (remove markdown if any)
    const cleanText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // Parse JSON
    const parsed = JSON.parse(cleanText);

    return {
      suggestedTags: parsed.suggestedTags || [],
      enhancedDescription: parsed.enhancedDescription || description || title,
      suggestedPriority: parsed.suggestedPriority || "medium",
      suggestedSubtasks: parsed.suggestedSubtasks || [],
    };
  } catch (error) {
    console.error("❌ Gemini generation error:", error);

    // ── Intelligent Fallback ──
    return generateFallbackData(title, description);
  }
}

// ─── Fallback (No API needed) ─────────────────────────────────────────────

function generateFallbackData(
  title: string,
  description?: string,
): AIGeneratedData {
  // Generate tags from title
  const words = title.toLowerCase().split(" ");
  const tags = words
    .filter((w) => w.length > 2)
    .map((w) => w.replace(/[^a-z0-9]/g, "-"))
    .slice(0, 4);

  // Generate subtasks
  const subtaskTemplates = [
    `Plan ${title} implementation`,
    `Set up required tools and dependencies`,
    `Implement ${title} core functionality`,
    `Test and document ${title}`,
    `Review and optimize ${title}`,
    `Deploy ${title} to production`,
  ];

  const subtasks = subtaskTemplates
    .slice(0, 3 + Math.floor(Math.random() * 2))
    .map((sub, i) => ({
      id: `fallback-${Date.now()}-${i}`,
      title: sub,
      done: false,
    }));

  // Determine priority based on keywords
  const priority = title.match(
    /urgent|critical|important|deadline|asap|fix|bug|issue/i,
  )
    ? "high"
    : title.match(/optimize|improve|enhance|refactor|update/i)
      ? "medium"
      : "low";

  // Generate description if missing
  const descriptions = [
    `Comprehensive implementation of ${title} with best practices.`,
    `Complete ${title} solution following project requirements.`,
    `Full-stack implementation of ${title} with proper testing.`,
    `End-to-end ${title} development with documentation and examples.`,
  ];

  return {
    suggestedTags: tags.length > 0 ? tags : ["task", "implementation"],
    enhancedDescription:
      description ||
      descriptions[Math.floor(Math.random() * descriptions.length)],
    suggestedPriority: priority,
    suggestedSubtasks: subtasks,
  };
}

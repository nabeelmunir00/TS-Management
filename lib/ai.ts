// lib/ai.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AIGeneratedData {
  suggestedTags: string[];
  enhancedDescription: string;
  suggestedPriority: "high" | "medium" | "low";
  suggestedSubtasks: { id: string; title: string; done: boolean }[];
}

// ─── Gemini Client (Singleton) ────────────────────────────────────────────────

let geminiInstance: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env.local");
    geminiInstance = new GoogleGenerativeAI(apiKey);
  }
  return geminiInstance;
}

// ─── Main AI Function ─────────────────────────────────────────────────────────

export async function generateTaskData(
  title: string,
  description?: string,
): Promise<AIGeneratedData> {
  try {
    const genAI = getGeminiClient();

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const prompt = buildPrompt(title, description);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // ✅ Extract JSON from response — handles extra text/thinking output
    const jsonStr = extractJSON(text);

    const parsed = JSON.parse(jsonStr);

    return {
      suggestedTags: Array.isArray(parsed.suggestedTags)
        ? parsed.suggestedTags
        : [],
      enhancedDescription:
        typeof parsed.enhancedDescription === "string"
          ? parsed.enhancedDescription
          : description || title,
      suggestedPriority: ["high", "medium", "low"].includes(
        parsed.suggestedPriority,
      )
        ? parsed.suggestedPriority
        : "medium",
      suggestedSubtasks: Array.isArray(parsed.suggestedSubtasks)
        ? parsed.suggestedSubtasks.map((s: any, i: number) => ({
            id: s.id || `ai-${Date.now()}-${i}`,
            title: s.title || "",
            done: false,
          }))
        : [],
    };
  } catch (error) {
    console.error("❌ Gemini generation error:", error);
    return generateFallbackData(title, description);
  }
}

// ─── JSON Extractor ───────────────────────────────────────────────────────────
/**
 * Robustly extract JSON from Gemini response.
 * Handles: markdown fences, thinking text before JSON, trailing text.
 */
function extractJSON(text: string): string {
  // 1. Remove markdown code fences
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // 2. Find the first { and last } — extract just the JSON object
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No valid JSON object found in AI response");
  }

  return cleaned.slice(start, end + 1);
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(title: string, description?: string): string {
  const hasDescription = description && description.trim().length > 0;

  // ✅ Shorter, more focused prompt — less output = no truncation
  return `You are a senior software engineering project manager.
Analyze this development task and return ONLY a JSON object. No explanation, no markdown, no extra text.

Task Title: "${title}"
${hasDescription ? `User Description: "${description}"` : "Description: none provided"}

Return this exact JSON structure:
{
  "enhancedDescription": "3-4 sentence professional description explaining WHY this task is needed, WHAT technical work is involved, and WHAT the expected outcome is. Do NOT copy the title. Write specific technical details.",
  "suggestedPriority": "high|medium|low",
  "suggestedTags": ["tag-1", "tag-2", "tag-3"],
  "suggestedSubtasks": [
    { "id": "1", "title": "Specific action item", "done": false },
    { "id": "2", "title": "Specific action item", "done": false },
    { "id": "3", "title": "Specific action item", "done": false }
  ]
}

Rules:
- enhancedDescription: min 3 sentences, technical, do NOT start with the title
- suggestedPriority: high=urgent/blocking, medium=planned, low=optional
- suggestedTags: 3-4 lowercase hyphen-separated specific tags
- suggestedSubtasks: exactly 3 concrete action items`;
}

// ─── Fallback ─────────────────────────────────────────────────────────────────

function generateFallbackData(
  title: string,
  description?: string,
): AIGeneratedData {
  const words = title.toLowerCase().split(" ");

  const tags = words
    .filter((w) => w.length > 3)
    .map((w) => w.replace(/[^a-z0-9]/g, "-"))
    .slice(0, 4);

  const priority: "high" | "medium" | "low" = title.match(
    /urgent|critical|fix|bug|issue|error|crash|security|hotfix|asap|deadline/i,
  )
    ? "high"
    : title.match(/improve|optimize|refactor|enhance|update|upgrade/i)
      ? "medium"
      : "low";

  const enhancedDescription =
    description && description.trim().length > 10
      ? description
      : `This task involves implementing ${title.toLowerCase()} following established engineering best practices. The work includes designing the solution architecture, implementing the core functionality with proper error handling and edge case coverage, writing unit and integration tests to ensure reliability, and documenting the implementation for the team. The expected outcome is a production-ready feature that is well-tested, maintainable, and aligns with the project's technical standards.`;

  return {
    suggestedTags: tags.length > 0 ? tags : ["development", "implementation"],
    enhancedDescription,
    suggestedPriority: priority,
    suggestedSubtasks: [
      {
        id: "f-1",
        title: `Research and plan ${title.toLowerCase()}`,
        done: false,
      },
      { id: "f-2", title: "Implement core functionality", done: false },
      { id: "f-3", title: "Write tests and review code", done: false },
    ],
  };
}

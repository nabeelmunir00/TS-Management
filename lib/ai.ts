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
      model: "gemini-1.5-flash", // or "gemini-pro" for older version
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 500,
      },
    });

    const prompt = `
      You are a project management AI assistant. Analyze this task and generate:

      1. 3-5 relevant tags (lowercase, hyphen-separated, descriptive)
      2. Enhanced description (professional, clear, 1-2 sentences)
      3. Priority: "high" if urgent/time-sensitive, "medium" if important but not urgent, "low" if nice-to-have
      4. 2-4 subtasks (clear, actionable steps, each 3-6 words)

      Task Title: "${title}"
      ${description ? `Description: "${description}"` : "No description provided"}

      IMPORTANT: Return ONLY valid JSON in this exact format (no markdown, no extra text):
      {
        "suggestedTags": ["tag1", "tag2", "tag3"],
        "enhancedDescription": "Professional description here...",
        "suggestedPriority": "medium",
        "suggestedSubtasks": [
          {"title": "Subtask 1", "done": false},
          {"title": "Subtask 2", "done": false}
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

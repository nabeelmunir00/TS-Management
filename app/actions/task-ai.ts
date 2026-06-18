"use server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AIResponse {
  description: string;
  tags: string[];
  priority: "high" | "medium" | "low";
  estimatedDays: number;
  subtasks: string[];
}

// ─── Generate Description ──────────────────────────────────────────────────

export async function generateDescription(title: string): Promise<string> {
  try {
    if (!title) {
      throw new Error("Title is required");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a project management assistant. Generate a comprehensive task description (2-3 sentences) based on the task title. Be specific and actionable. Return only the description, no additional text.`,
        },
        {
          role: "user",
          content: `Generate a description for this task: ${title}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    return response.choices[0].message.content || "No description generated";
  } catch (error) {
    console.error("AI description generation error:", error);
    throw new Error("Failed to generate description");
  }
}

// ─── Generate Tags ──────────────────────────────────────────────────────────

export async function generateTags(
  title: string,
  description?: string,
): Promise<string[]> {
  try {
    if (!title) {
      throw new Error("Title is required");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a project management assistant. Generate 3-5 relevant tags for the task. Return only the tags as a comma-separated list. Tags should be lowercase, hyphen-separated, and relevant to the task content.`,
        },
        {
          role: "user",
          content: `Generate tags for this task: Title: ${title}${description ? `\nDescription: ${description}` : ""}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const tagsText = response.choices[0].message.content || "";
    const tags = tagsText
      .split(",")
      .map((tag) => tag.trim().toLowerCase().replace(/\s+/g, "-"))
      .filter((tag) => tag.length > 0)
      .slice(0, 5);

    return tags;
  } catch (error) {
    console.error("AI tags generation error:", error);
    throw new Error("Failed to generate tags");
  }
}

// ─── Generate Subtasks ─────────────────────────────────────────────────────

export async function generateSubtasks(
  title: string,
  description?: string,
): Promise<string[]> {
  try {
    if (!title) {
      throw new Error("Title is required");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a project management assistant. Generate 2-4 specific subtasks for the given task. Return only the subtasks as a numbered list or comma-separated list.`,
        },
        {
          role: "user",
          content: `Generate subtasks for: ${title}${description ? `\nDescription: ${description}` : ""}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const subtasksText = response.choices[0].message.content || "";
    const subtasks = subtasksText
      .split(/\d+\.\s*|\n|,/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 5);

    return subtasks;
  } catch (error) {
    console.error("AI subtasks generation error:", error);
    throw new Error("Failed to generate subtasks");
  }
}

// ─── Generate Priority ──────────────────────────────────────────────────────

export async function generatePriorityAndDueDate(
  title: string,
  description?: string,
): Promise<{
  priority: "high" | "medium" | "low";
  estimatedDays: number;
}> {
  try {
    if (!title) {
      throw new Error("Title is required");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a project management assistant. Analyze the task and suggest priority and estimated completion time. Return a JSON object with:
          - priority: "high", "medium", or "low"
          - estimatedDays: number of days (1-7)
          
          Example: {"priority": "high", "estimatedDays": 3}`,
        },
        {
          role: "user",
          content: `Analyze this task: ${title}${description ? `\nDescription: ${description}` : ""}`,
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
    return {
      priority: ["high", "medium", "low"].includes(result.priority)
        ? result.priority
        : "medium",
      estimatedDays: Math.min(Math.max(result.estimatedDays || 3, 1), 14),
    };
  } catch (error) {
    console.error("AI priority and due date generation error:", error);
    throw new Error("Failed to generate priority and due date");
  }
}

// ─── Generate Full Task ─────────────────────────────────────────────────────

export async function generateFullTask(title: string): Promise<AIResponse> {
  try {
    if (!title) {
      throw new Error("Title is required");
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a project management assistant. Generate task details in JSON format. Return a JSON object with:
          - description: A comprehensive task description (2-3 sentences)
          - tags: Array of 3-5 relevant tags (lowercase, hyphen-separated)
          - priority: "high", "medium", or "low"
          - estimatedDays: Number of days to complete (1-7)
          - subtasks: Array of 2-4 subtask titles
          
          Example response:
          {
            "description": "Implement user authentication using Clerk including OAuth providers and JWT session management.",
            "tags": ["auth", "security", "clerk"],
            "priority": "high",
            "estimatedDays": 3,
            "subtasks": ["Install Clerk SDK", "Configure OAuth providers", "Setup webhook handlers"]
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

    return {
      description: result.description || "",
      tags: Array.isArray(result.tags) ? result.tags.slice(0, 5) : [],
      priority: ["high", "medium", "low"].includes(result.priority)
        ? result.priority
        : "medium",
      estimatedDays: Math.min(Math.max(result.estimatedDays || 3, 1), 14),
      subtasks: Array.isArray(result.subtasks)
        ? result.subtasks.slice(0, 5)
        : [],
    };
  } catch (error) {
    console.error("AI full task generation error:", error);
    throw new Error("Failed to generate task details");
  }
}

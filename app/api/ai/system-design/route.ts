import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Gemini Client (Same as lib/ai.ts) ─────────────────────────────────────

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

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 },
      );
    }

    const genAI = getGeminiClient();

    // 🟢 Updated to Gemini Pro with Native JSON response configuration
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        temperature: 0.2, // Lower temperature makes structural layout data more predictable
        maxOutputTokens: 4000,
        responseMimeType: "application/json", // Forces Gemini to output structural JSON directly without markdown backticks
      },
    });

    const geminiPrompt = `
You are a system architecture expert. Generate a clean architecture diagram as JSON for the described system.

IMPORTANT: Return ONLY valid JSON matching the structure below. Do not wrap it in markdown code block formatting.

JSON structure:
{
  "nodes": [
    {
      "id": "1",
      "position": { "x": number, "y": number },
      "data": {
        "type": "client|api|server|database|cache|queue|storage|auth|loadbalancer|microservice|cloud|monitoring",
        "label": "Short name",
        "description": "One sentence what it does",
        "tech": "Specific technology e.g. PostgreSQL, Redis, Next.js"
      }
    }
  ],
  "edges": [
    {
      "id": "e1-2",
      "source": "1",
      "target": "2",
      "animated": true,
      "label": "REST"
    }
  ]
}

Layout rules (STRICTLY follow):
- Row 1 (y: 60):   Client/Browser/Mobile
- Row 2 (y: 220):  API Gateway / Load Balancer
- Row 3 (y: 400):  Backend services (spread x: 80-700)
- Row 4 (y: 560):  Databases, Cache, Storage (spread x: 80-700)
- Max 10-12 nodes total
- Spread nodes horizontally with 150-200px gap
- animated: true for main flows, false for data store connections
- Use realistic tech for the system described

System to design: "${prompt}"
`.trim();

    console.log("🤖 Sending request to Gemini Pro...");
    const result = await model.generateContent(geminiPrompt);
    const response = await result.response;
    const text = response.text().trim();

    console.log("✅ Received response from Gemini Pro");

    let parsed: { nodes: any[]; edges: any[] };

    try {
      // Direct parsing works reliably because responseMimeType forces pure JSON strings
      parsed = JSON.parse(text);
    } catch (parseError) {
      console.warn(
        "Direct JSON parsing failed, attempting structural fallback extraction...",
        parseError,
      );
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("Raw unparsable output:", text);
        throw new Error(
          "AI returned invalid JSON layout structure. Please try again.",
        );
      }
      parsed = JSON.parse(match[0]);
    }

    if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
      throw new Error("AI response missing structural nodes array.");
    }

    // Add edge styling
    const edges = (parsed.edges ?? []).map((e: any) => ({
      ...e,
      style: { stroke: "#8b5cf6", strokeWidth: 2 },
    }));

    return NextResponse.json({
      success: true,
      nodes: parsed.nodes,
      edges,
    });
  } catch (err: any) {
    console.error("[AI System Design] Error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}

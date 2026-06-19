// app/api/ai/system-design/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MarkerType } from "reactflow";

// ─── Gemini Client ────────────────────────────────────────────────────────────

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env.local");
  return new GoogleGenerativeAI(apiKey);
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
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2000,
      },
    });

    const geminiPrompt = `
You are a system architecture expert. Generate a clean architecture diagram as JSON for the described system.

IMPORTANT: Return ONLY valid JSON — no markdown, no backticks, no explanation.

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

    const result = await model.generateContent(geminiPrompt);
    const response = await result.response;
    const text = response.text();

    // Clean response (strip markdown if Gemini adds it)
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let parsed: { nodes: any[]; edges: any[] };

    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Try to extract JSON from response
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("Gemini raw response:", text);
        throw new Error("AI returned invalid JSON. Please try again.");
      }
      parsed = JSON.parse(match[0]);
    }

    if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
      throw new Error("AI response missing nodes array.");
    }

    // Add edge styling
    const edges = (parsed.edges ?? []).map((e: any) => ({
      ...e,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#8b5cf6" },
      style: { stroke: "#8b5cf6", strokeWidth: 2 },
    }));

    return NextResponse.json({
      success: true,
      nodes: parsed.nodes,
      edges,
    });
  } catch (err: any) {
    console.error("[AI System Design]", err);
    return NextResponse.json(
      { error: err?.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}

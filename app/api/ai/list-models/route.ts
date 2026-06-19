import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY is not set in environment variables",
        },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // List all available models
    const models = await genAI.listModels();

    // Filter models that support generateContent
    const availableModels = models.models
      .filter((m: any) =>
        m.supportedGenerationMethods?.includes("generateContent"),
      )
      .map((m: any) => ({
        name: m.name.replace("models/", ""),
        displayName: m.displayName || m.name.replace("models/", ""),
        supportedMethods: m.supportedGenerationMethods || [],
        description: m.description || "",
        inputTokenLimit: m.inputTokenLimit || 0,
        outputTokenLimit: m.outputTokenLimit || 0,
      }));

    // Sort by name
    availableModels.sort((a: any, b: any) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      totalModels: availableModels.length,
      models: availableModels,
      recommended:
        availableModels.length > 0 ? availableModels[0].name : "gemini-pro",
      allAvailable: availableModels.map((m: any) => m.name),
    });
  } catch (error: any) {
    console.error("❌ Error listing Gemini models:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to list models",
        suggestion: "Try using 'gemini-pro' as fallback",
      },
      { status: 500 },
    );
  }
}

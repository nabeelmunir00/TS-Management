import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateTaskSuggestions(description: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "You are a project management assistant." },
      {
        role: "user",
        content: `Generate subtasks, priority, and estimated time for: ${description}`,
      },
    ],
    temperature: 0.7,
  });
  return response.choices[0].message.content;
}

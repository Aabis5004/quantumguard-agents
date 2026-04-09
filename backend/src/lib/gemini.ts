// Gemini API client — sends the audit prompt and parses the JSON response

import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing in .env");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Gemini 2.0 Flash is free, fast, and JSON-mode capable
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
  generationConfig: {
    temperature: 0.4,
    responseMimeType: "application/json",
  },
});

export async function callGemini(systemPrompt: string, userInput: string): Promise<string> {
  const fullPrompt = `${systemPrompt}\n\n=== INPUT TO ANALYZE ===\n${userInput}`;

  const result = await model.generateContent(fullPrompt);
  const text = result.response.text();
  return text;
}

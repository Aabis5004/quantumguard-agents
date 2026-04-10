// gemini.ts is now a thin wrapper for backward compatibility.
// All real logic lives in ./llm.ts (multi-provider with fallback).

export { callGemini, callLLM } from "./llm.js";

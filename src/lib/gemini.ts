// src/lib/gemini.ts
// DEPRECATED: Gemini integration removed. Real leads now come from /api/leads/list,
// populated by the Chrome extension content script reading FB Group posts.
// This stub stays so any straggling imports (e.g. Header) keep compiling.

export const isGeminiEnabled = false as const;
export const GEMINI_API_URL = '';
export async function fetchWithRetry(): Promise<never> {
  throw new Error('Gemini removed; use /api/leads/list instead.');
}

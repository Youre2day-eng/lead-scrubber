// Gemini API helper. Reads the key from Vite env or the AI Studio sandbox global.
// If no key is provided, fetchWithRetry throws a friendly error so the caller's
// catch block can surface it without crashing the app at boot.

declare const __api_key: string | undefined;

const MODEL = 'gemini-2.5-flash-preview-09-2025';

const API_KEY: string =
    (typeof __api_key !== 'undefined' && __api_key) ||
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    '';

export const isGeminiEnabled: boolean = Boolean(API_KEY);

export const GEMINI_API_URL = isGeminiEnabled
  ? `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`
    : '';

export async function fetchWithRetry(url: string, options: RequestInit, retries = 5, backoff = 1000): Promise<any> {
    if (!isGeminiEnabled || !url) {
          throw new Error('Gemini API key not configured. Set VITE_GEMINI_API_KEY to enable AI scraping.');
    }

  const delays = [1000, 2000, 4000, 8000, 16000];
    for (let i = 0; i < retries; i++) {
          try {
                  const res = await fetch(url, options);
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  return await res.json();
          } catch (e) {
                  if (i === retries - 1) throw e;
                  await new Promise((r) => setTimeout(r, delays[i] ?? backoff));
          }
    }
}

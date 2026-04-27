const API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? '';
const MODEL = 'gemini-2.5-flash-preview-09-2025';

export const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 5,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
}

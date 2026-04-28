// functions/lib/score.ts
// Shared buyer-intent scoring used by /api/leads/ingest and /api/scrape/poll.

const BUYER_PHRASES: RegExp[] = [
  /\blooking for\b/i,
  /\bneed (a|an|some|to find)\b/i,
  /\banyone (know|recommend)\b/i,
  /\brecommendations?\b/i,
  /\bhire\b/i,
  /\bwho can\b/i,
  /\bcan anyone\b/i,
  /\bquote\b/i,
  /\bestimate\b/i,
  /\bISO\b/,
  /\?$/m,
];

export function scoreIntent(text: string, keywords: string[] = []): number {
  if (!text) return 0;
  let score = 0;
  for (const phrase of BUYER_PHRASES) if (phrase.test(text)) score += 10;
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (!kw) continue;
    const k = kw.toLowerCase().trim();
    if (k && lower.includes(k)) score += 15;
  }
  return Math.min(100, score);
}

export function urgency(score: number): 'High' | 'Medium' | 'Low' {
  if (score >= 60) return 'High';
  if (score >= 30) return 'Medium';
  return 'Low';
}

export async function hashUrl(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

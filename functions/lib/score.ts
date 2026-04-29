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

// Strong buyer signals (people asking to hire / find a service).
const BUYING_SIGNALS: RegExp[] = [
  /\b\[?hiring\]?\b/i,
  /\bin search of\b/i,
  /\bISO\b/,
  /\blooking (for|to hire|to pay)\b/i,
  /\bneed (a|an|to find|to hire|someone)\b/i,
  /\bwilling to pay\b/i,
  /\bbudget\b/i,
  /\bany (recommendations?|recs|suggestions?)\b/i,
  /\bwho (do you|can|knows|would you)\b/i,
  /\brecommendations?\b/i,
  /\bhelp me find\b/i,
];

// Strong seller signals (people offering or advertising a service).
const SELLING_SIGNALS: RegExp[] = [
  /\b\[?for hire\]?\b/i,
  /\bi (offer|provide|do|build|sell|design|run)\b/i,
  /\bwe (offer|provide|sell|build|design)\b/i,
  /\bdm me\b/i,
  /\bmessage me\b/i,
  /\bservices? (include|offered|available)\b/i,
  /\bavailable for (hire|work|projects)\b/i,
  /\baccepting (clients|new clients|projects|work)\b/i,
  /\bportfolio\b/i,
  /\brate(s)?:?\s*\$/i,
  /\$\d+\s*\/\s*(hr|hour|month|project)\b/i,
  /\bstarting at \$\d+/i,
  /\bbook (a|me|now)\b/i,
  /\bmy (services?|website|portfolio|rates?)\b/i,
  /\bcheck out my\b/i,
  /\bopen (for|to) (work|commissions|projects)\b/i,
  /\btaking (orders|commissions|clients)\b/i,
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

export type LeadIntent = 'buying' | 'selling' | 'neutral';

export function detectIntent(text: string): LeadIntent {
  if (!text) return 'neutral';
  let buy = 0;
  let sell = 0;
  for (const r of BUYING_SIGNALS) if (r.test(text)) buy++;
  for (const r of SELLING_SIGNALS) if (r.test(text)) sell++;
  if (sell > buy && sell >= 1) return 'selling';
  if (buy > sell && buy >= 1) return 'buying';
  if (buy === sell && buy >= 1) {
    if (/\bfor hire\b|\bdm me\b|\$\d+\s*\/\s*hr/i.test(text)) return 'selling';
    return 'buying';
  }
  return 'neutral';
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

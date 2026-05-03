// functions/lib/score.ts
// Shared buyer-intent scoring used by /api/leads/ingest, /api/scrape/run,
// /api/scrape/poll, and /api/leads/list (re-classification on fetch).
// Tightened classifier — weighted signals + prefix tags + seller-context guards.

// ---------------------------------------------------------------------------
// 1. Hard prefix tags. Many platforms use bracket tags at the start of titles
//    (e.g. r/forhire). Treat these as authoritative.
//    The leading [\s"'*\`]* allows leading whitespace, quotes, asterisks, or
//    backticks (markdown bold / code / quoted titles) before the bracket.
// ---------------------------------------------------------------------------
const SELLER_TAG = /^[\s"'*\`]*[\[\(]\s*(for\s*hire|fh|offer|offering|service|services|portfolio|available|open\s*for\s*work|commissions?\s*open)\s*[\]\)]/i;
const BUYER_TAG  = /^[\s"'*\`]*[\[\(]\s*(hiring|hire|iso|task|request|need|needed|looking|paid|paying|wtb|w2b|want\s*to\s*buy|help)\s*[\]\)]/i;

// ---------------------------------------------------------------------------
// 2. Hard seller-context guards. Phrases that LOOK like buyer signals but are
//    actually sellers describing what they help with.
// ---------------------------------------------------------------------------
const SELLER_CONTEXT_GUARDS: RegExp[] = [
  /\bif\s+you(?:'re| are)\s+looking\s+for\b/i,
  /\bif\s+(?:anyone|anybody)\s+(?:is\s+)?looking\b/i,
  /\bi\s+help\s+\w+(?:\s+\w+)?\s+(find|get|grow|scale|build)\b/i,
  /\bwe\s+help\s+\w+(?:\s+\w+)?\s+(find|get|grow|scale|build)\b/i,
  /\bhelping\s+\w+\s+(find|get|grow|scale|build)\b/i,
  /\bhighly\s+recommend(?:ed)?\s+(my|our|the)\b/i,
  /\b(my|our)\s+clients\s+(love|say|recommend|trust)\b/i,
];

// Soft guards — only trigger when a seller score is also present nearby.
const SOFT_SELLER_GUARDS: RegExp[] = [
  /\banyone\s+looking\b/i,
];

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

// ---------------------------------------------------------------------------
// 3. Weighted buyer signals.
// ---------------------------------------------------------------------------
const BUYING_SIGNALS: Array<[RegExp, number]> = [
  [/\b\[?hiring\]?\b/i, 3],
  [/\bin search of\b/i, 3],
  [/\bISO\b/, 3],
  [/\blooking (to hire|to pay|to commission)\b/i, 3],
  [/\blooking for\b/i, 2],
  [/\bneed (to hire|someone who|a pro|a freelancer|help with)\b/i, 3],
  [/\bneed (a|an|some)\b/i, 2],
  [/\bwilling to pay\b/i, 3],
  [/\bmy budget is\b/i, 3],
  [/\bbudget\b/i, 1],
  [/\bany (recommendations?|recs|suggestions?)\b/i, 2],
  [/\bwho (do you|can|knows|would you)\b/i, 2],
  [/\banyone (know|knows|got|have|tried)\b/i, 2],
  [/\brecommendations?\b/i, 2],
  [/\bhelp me find\b/i, 3],
  [/\b(want|wanting) to (hire|buy|commission)\b/i, 3],
  [/\bcan (anyone|someone|you) (help|recommend|do|build)\b/i, 2],
  [/\bquote\b/i, 1],
  [/\b(paid|paying) (gig|task|job|work)\b/i, 3],
  [/\bpay(ing)? \$\d+/i, 3],
  [/\bWTB\b/, 3],
];

// ---------------------------------------------------------------------------
// 4. Weighted seller signals.
// ---------------------------------------------------------------------------
const SELLING_SIGNALS: Array<[RegExp, number]> = [
  [/\b\[?for hire\]?\b/i, 4],
  [/\b\[?FH\]?\b/, 3],
  [/\bi (offer|provide|do|build|sell|design|run|create|make|edit|write|code|develop|illustrate|animate|photograph|film|produce)\b/i, 2],
  [/\bwe (offer|provide|sell|build|design|create|edit|develop)\b/i, 2],
  [/\bdm me\b/i, 3],
  [/\bmessage me\b/i, 2],
  [/\bpm me\b/i, 2],
  [/\bservices? (include|offered|available)\b/i, 3],
  [/\bavailable for (hire|work|projects|commissions)\b/i, 4],
  [/\baccepting (clients|new clients|projects|work|orders)\b/i, 4],
  [/\bportfolio\b/i, 2],
  [/\bwork samples?\b/i, 2],
  [/\brate(s)?:?\s*\$/i, 3],
  [/\$\d+\s*\/\s*(hr|hour|min|minute|month|project|word|page|video|post)\b/i, 4],
  [/\bstarting at \$\d+/i, 3],
  [/\bbook (a|me|now|today)\b/i, 2],
  [/\bmy (services?|website|portfolio|rates?)\b/i, 3],
  [/\bcheck out my\b/i, 2],
  [/\bopen (for|to) (work|commissions|projects)\b/i, 4],
  [/\btaking (orders|commissions|clients)\b/i, 4],
  [/\bi help \w+(?:\s+\w+)?\s+(find|get|grow|scale|build|launch|reach)\b/i, 3],
  [/\bwe help \w+(?:\s+\w+)?\s+(find|get|grow|scale|build|launch|reach)\b/i, 3],
  [/\bhighly\s+recommend(?:ed)?\s+(my|our|the)\b/i, 2],
  [/\bcontact me (at|on|via|through)\b/i, 2],
  [/\bemail me (at|on|@)\b/i, 2],
  [/\bvisit my (site|website|page|profile)\b/i, 2],
  [/\b\d+\+? (years?|yrs?) (of )?experience\b/i, 2],
  [/\btestimonials?\b/i, 2],
  [/\bclient(s)?\s+(testimonial|review|feedback)\b/i, 3],
  [/\baffordable rates?\b/i, 2],
];

export function scoreIntent(text: string, keywords: string[] = [], niche?: string): number {
  if (!text) return 0;
  let score = 0;
  for (const phrase of BUYER_PHRASES) if (phrase.test(text)) score += 10;
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    if (!kw) continue;
    const k = kw.toLowerCase().trim();
    if (k && lower.includes(k)) score += 15;
  }
  score = Math.min(100, score);

  // Niche-relevance gate: if a niche is specified and neither the niche term
  // nor any of the user-provided keywords appear in the post, the post is
  // off-topic. Apply an 80 % penalty so it never surfaces as a high-priority lead.
  if (niche && niche.trim()) {
    const nicheNorm = niche.trim().toLowerCase();
    const nicheInText = lower.includes(nicheNorm);
    const keywordInText = keywords.some(kw => {
      if (!kw) return false;
      const k = kw.toLowerCase().trim();
      return k.length > 0 && lower.includes(k);
    });
    if (!nicheInText && !keywordInText) {
      score = Math.round(score * 0.2);
    }
  }

  return score;
}

export type LeadIntent = 'buying' | 'selling' | 'neutral';

export function detectIntent(text: string): LeadIntent {
  if (!text) return 'neutral';

  // 1. Hard prefix tag wins.
  if (SELLER_TAG.test(text)) return 'selling';
  if (BUYER_TAG.test(text)) return 'buying';

  // 2. Compute weighted scores.
  let buy = 0;
  let sell = 0;
  for (const [re, w] of BUYING_SIGNALS) if (re.test(text)) buy += w;
  for (const [re, w] of SELLING_SIGNALS) if (re.test(text)) sell += w;

  // 3. Apply seller-context guards.
  let guarded = false;
  for (const r of SELLER_CONTEXT_GUARDS) {
    if (r.test(text)) { guarded = true; break; }
  }
  if (!guarded) {
    for (const r of SOFT_SELLER_GUARDS) {
      if (r.test(text) && sell >= 2) { guarded = true; break; }
    }
  }
  if (guarded) {
    buy = Math.floor(buy / 2);
    sell += 2;
  }

  // 4. Decisive seller cues outweigh a single buyer phrase.
  const decisiveSeller = /\$\d+\s*\/\s*(hr|hour|min|minute|month|project|word|page|video|post)\b|\bdm me\b|\bfor hire\b|\bavailable for (hire|work)\b|\baccepting (clients|new clients|projects)\b/i.test(text);
  if (decisiveSeller && sell >= buy - 1) return 'selling';

  // 5. Decisive buyer cues outweigh a passing seller mention.
  const decisiveBuyer = /\bwilling to pay\b|\bmy budget is\b|\bWTB\b|\bin search of\b|\bpaying \$\d+/i.test(text);
  if (decisiveBuyer && buy >= sell - 1) return 'buying';

  if (sell > buy && sell >= 2) return 'selling';
  if (buy > sell && buy >= 2) return 'buying';
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

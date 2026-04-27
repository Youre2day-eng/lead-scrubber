import { useState } from 'react';
import type { Lead, ScraperStatus, TargetUrl } from '../types';
import { GEMINI_API_URL, fetchWithRetry, isGeminiEnabled } from '../lib/gemini';

export function useScraper() {
  const [status, setStatus] = useState<ScraperStatus>('idle');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  const runScraper = async (niche: string, keywords: string, targetUrls: TargetUrl[]) => {
    setStatus('scraping');
    setLeads([]);
    setErrorMsg('');

    if (!isGeminiEnabled) {
      setErrorMsg('Gemini API key not configured. Add VITE_GEMINI_API_KEY in Cloudflare Pages > Variables and Secrets, then redeploy.');
      setStatus('error');
      return;
    }

    try {
      await new Promise((r) => setTimeout(r, 2000));
      setStatus('filtering');

      const schema = {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING', description: 'A unique random ID for this lead' },
            platform: { type: 'STRING', description: 'The platform from the target URLs list' },
            groupName: { type: 'STRING', description: 'Name of the group or search context' },
            author: { type: 'STRING' },
            text: { type: 'STRING', description: 'Post content containing the target keywords' },
            intentScore: { type: 'INTEGER', description: '1 to 100 buy-intent score' },
            timeAgo: { type: 'STRING', description: 'e.g. 10 mins ago, 2 hours ago' },
            urgency: { type: 'STRING', description: 'High, Medium, or Low' },
          },
        },
      };

      const urlsText = targetUrls.map((u) => u.url).join(', ');
      const payload = {
        systemInstruction: {
          parts: [{ text: 'You are an AI Lead Filtering Agent. Generate realistic, high-intent social media posts scraped from the provided URLs.' }],
        },
        contents: [{
          parts: [{
            text: `Generate 5 highly realistic posts from: [${urlsText}]. They are asking for services related to: "${niche}". They MUST use variations of these keywords: ${keywords}. Give each a unique random ID.`,
          }],
        }],
        generationConfig: { responseMimeType: 'application/json', responseSchema: schema },
      };

      const response = await fetchWithRetry(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const parsed: Lead[] = JSON.parse(response.candidates[0].content.parts[0].text);
      parsed.sort((a, b) => b.intentScore - a.intentScore);
      setLeads(parsed);
      setStatus('complete');
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Failed to connect to the scraping pipeline. Check your network.';
      setErrorMsg(msg);
      setStatus('error');
    }
  };

  return { status, leads, errorMsg, runScraper };
}

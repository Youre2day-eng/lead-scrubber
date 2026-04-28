// extension/content.js
// Runs on https://www.facebook.com/groups/* in the user's logged-in browser.
// Finds visible post articles, matches user keywords, sends matches to LeadScrubber dashboard.
//
// IMPORTANT: human-paced. Only inspects what's already rendered when the user scrolls.
// No auto-clicks, no auto-scroll, no background fetching. The user is acting as themselves;
// this is a reading aid, not an autonomous bot.

(async function () {
  const cfg = await chrome.storage.sync.get(['enabled', 'keywords', 'dashboardUrl', 'token']);
  if (cfg.enabled === false) return;

  const KEYWORDS = (cfg.keywords || '').split(/[\n,]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
  const DASHBOARD = (cfg.dashboardUrl || 'https://lead-scrubber.pages.dev').replace(/\/$/, '');
  const TOKEN = cfg.token || '';
  if (KEYWORDS.length === 0) return;

  const seen = new Set();
  const queue = [];
  let flushTimer = null;

  function groupNameFromUrl() {
    const m = location.pathname.match(/\/groups\/([^/]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function extractPostUrl(article) {
    const a = article.querySelector('a[href*="/posts/"], a[href*="/permalink/"], a[href*="/groups/"][href*="/posts/"]');
    if (!a) return null;
    try { return new URL(a.href, location.origin).href.split('?')[0]; } catch { return null; }
  }

  function extractAuthor(article) {
    const link = article.querySelector('h2 a, h3 a, strong a, [role="link"] strong');
    return link ? link.textContent.trim() : 'Unknown';
  }

  function extractText(article) {
    const t = article.querySelector('[data-ad-preview="message"], [data-ad-comet-preview="message"]') || article;
    return (t.innerText || '').trim().slice(0, 2000);
  }

  function matchesKeywords(text) {
    const low = text.toLowerCase();
    return KEYWORDS.some(k => low.includes(k));
  }

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(flush, 3000);
  }

  async function flush() {
    flushTimer = null;
    if (queue.length === 0) return;
    const batch = queue.splice(0, queue.length);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (TOKEN) headers['Authorization'] = 'Bearer ' + TOKEN;
      await fetch(DASHBOARD + '/api/leads/ingest', {
        method: 'POST',
        headers,
        body: JSON.stringify({ posts: batch, keywords: KEYWORDS })
      });
      console.log('[LeadScrubber] sent', batch.length, 'matches');
    } catch (e) {
      console.warn('[LeadScrubber] send failed', e);
      queue.unshift(...batch);
    }
  }

  function scan() {
    const articles = document.querySelectorAll('div[role="article"]');
    const groupName = groupNameFromUrl();
    for (const art of articles) {
      const url = extractPostUrl(art);
      if (!url || seen.has(url)) continue;
      const text = extractText(art);
      if (!text || text.length < 12) continue;
      seen.add(url);
      if (!matchesKeywords(text)) continue;
      queue.push({
        url,
        author: extractAuthor(art),
        group: groupName,
        text,
        platform: 'Facebook',
        timestamp: new Date().toISOString()
      });
      scheduleFlush();
    }
  }

  // Observe the feed for newly rendered posts as user scrolls.
  const obs = new MutationObserver(() => { try { scan(); } catch (e) { console.warn(e); } });
  obs.observe(document.body, { childList: true, subtree: true });
  scan();
})();

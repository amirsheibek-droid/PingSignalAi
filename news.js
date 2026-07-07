// pages/api/news.js
// PingSignal AI: general AI/tech news feed. Compliance/regulation is one
// of several categories here, not the whole identity — broad appeal for
// everyone, with real depth for the builders who filter into it.

import { getAuthedEmail } from "../../lib/auth";
import { getSubscriberByEmail, checkAndLogUsage, getCachedNews } from "../../lib/supabase";

const PULL_WEEKLY_LIMIT = 5; // hitting this is the upgrade-prompt trigger, not a dead end

async function searchLiveNews() {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1300,
      messages: [
        {
          role: "user",
          content:
            "Search the web for the most recent, genuinely newsworthy AI and technology developments from the last few days. Find a good spread across these categories: models (new AI models or research breakthroughs), industry (funding, acquisitions, company news), tools (new AI products or developer tools), and compliance (AI regulation/legal developments — EU AI Act, US state AI laws, UK guidance, enforcement actions). Include at least 1-2 compliance items if there's genuine recent news, but the majority should be models/industry/tools. " +
            "Return ONLY a raw JSON array, no markdown fences, no commentary. 8 to 10 items. Each object needs exactly: " +
            '"headline" (under 12 words, your own words), "source", "url" (the real URL you found — never invent one), ' +
            '"category" (one of "models","industry","tools","compliance"), ' +
            '"jurisdiction" (only meaningful for "compliance" items, e.g. "EU"/"US"/"UK" — use "Global" for others), ' +
            '"summary" (one sentence under 25 words, your own words), "recency" (e.g. "Today"), ' +
            '"deadline_impact" (only for "compliance" items, e.g. "Deadline moved to Dec 2027" — empty string otherwise).',
        },
      ],
      tools: [{ type: "web_search_20250305", name: "web_search" }],
    }),
  });

  if (!response.ok) throw new Error("Upstream search failed (" + response.status + ")");
  const data = await response.json();
  const textBlocks = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const cleaned = textBlocks.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No parsable feed in model response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const email = await getAuthedEmail(req);
  if (!email) return res.status(401).json({ error: "Not signed in" });

  const subscriber = await getSubscriberByEmail(email);
  if (!subscriber || subscriber.status !== "active") {
    return res.status(402).json({ error: "Subscription required" });
  }

  try {
    if (subscriber.tier === "push") {
      const cached = await getCachedNews();
      if (!cached) return res.status(200).json({ items: [], refreshedAt: null });
      return res.status(200).json({ items: cached.items, refreshedAt: cached.refreshed_at });
    }

    const usage = await checkAndLogUsage(email, PULL_WEEKLY_LIMIT);
    if (!usage.allowed) {
      return res.status(429).json({
        error: `You've hit ${PULL_WEEKLY_LIMIT} refreshes this week on the Free plan.`,
        upgrade: true,
      });
    }

    const items = await searchLiveNews();
    return res.status(200).json({ items, refreshedAt: new Date().toISOString() });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Unexpected server error" });
  }
}

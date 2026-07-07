// pages/api/cron/pulse-refresh.js
// Runs every 4 hours (see vercel.json) — this is the real, honest speed
// advantage over newsletter competitors (TLDR, Ben's Bites, The Neuron)
// who publish once a day. Six fresh passes a day beats one, every time,
// without pretending to beat live sources like X/Twitter.
import { setCachedNews } from "../../../lib/supabase";
import { callClaude, extractJson } from "../../../lib/claude";

export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const text = await callClaude({
      webSearch: true,
      maxTokens: 1300,
      prompt:
        "Search the web for the most important AI and technology developments from the past few hours to the past day, spread across models, industry, tools, and compliance (AI regulation). Prioritise genuinely new developments over anything that would already be stale — this runs every 4 hours, so favour freshness over breadth. Majority should be models/industry/tools, with a compliance item if genuinely newsworthy. " +
        "Return ONLY a raw JSON array, no markdown fences. 8 to 10 items, each with exactly: " +
        '"headline", "source", "url" (real URL only), "category" (models/industry/tools/compliance), "jurisdiction" (Global unless compliance), "summary", "recency", "deadline_impact" (empty string unless compliance).',
    });
    const items = extractJson(text, "[", "]");

    await setCachedNews(items);
    return res.status(200).json({ ok: true, count: items.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

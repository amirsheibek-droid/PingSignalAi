// pages/api/cron/pulse-refresh.js
// Runs every 4 hours (see vercel.json) — this is the real, honest speed
// advantage over newsletter competitors (TLDR, Ben's Bites, The Neuron)
// who publish once a day. Six fresh passes a day beats one, every time,
// without pretending to beat live sources like X/Twitter.
import { setCachedNews } from "../../../lib/supabase";

export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
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
              "Search the web for the most important AI and technology developments from the past few hours to the past day, spread across models, industry, tools, and compliance (AI regulation). Prioritise genuinely new developments over anything that would already be stale — this runs every 4 hours, so favour freshness over breadth. Majority should be models/industry/tools, with a compliance item if genuinely newsworthy. " +
              "Return ONLY a raw JSON array, no markdown fences. 8 to 10 items, each with exactly: " +
              '"headline", "source", "url" (real URL only), "category" (models/industry/tools/compliance), "jurisdiction" (Global unless compliance), "summary", "recency", "deadline_impact" (empty string unless compliance).',
          },
        ],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    if (!response.ok) throw new Error("Search failed (" + response.status + ")");
    const data = await response.json();
    const textBlocks = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const cleaned = textBlocks.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    const items = JSON.parse(cleaned.slice(start, end + 1));

    await setCachedNews(items);
    return res.status(200).json({ ok: true, count: items.length });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

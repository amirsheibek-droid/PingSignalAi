// pages/api/action-plan.js
// The real paid differentiator: takes one compliance news item plus the
// person's registered systems, and turns it into a concrete "does this
// apply to me, and if so what do I actually do" decision path — not just
// another summary of the law.

import { getAuthedEmail } from "../../lib/auth";
import { getSubscriberByEmail, getUserSystems } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const email = await getAuthedEmail(req);
  if (!email) return res.status(401).json({ error: "Not signed in" });

  const subscriber = await getSubscriberByEmail(email);
  if (!subscriber || subscriber.status !== "active") {
    return res.status(402).json({ error: "Subscription required" });
  }
  // Action plans are a Pro-only feature — this is the real reason to upgrade.
  if (subscriber.tier !== "push") {
    return res.status(402).json({ error: "Action plans are a Pro feature.", upgrade: true });
  }

  const { headline, summary, jurisdiction, deadlineImpact } = req.body || {};
  if (!headline) return res.status(400).json({ error: "Missing news item" });

  const systems = await getUserSystems(email);

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
        max_tokens: 900,
        messages: [
          {
            role: "user",
            content:
              `A user has registered these AI systems they've built: ${JSON.stringify(systems.map((s) => ({ name: s.name, tags: s.tags })))} (empty array if none registered). ` +
              `Here is a regulatory news item: Headline: "${headline}". Jurisdiction: "${jurisdiction}". Summary: "${summary}". Deadline impact: "${deadlineImpact}". ` +
              "Produce a short, practical decision path for whether and how this user needs to act. Be conservative and clear — if it's genuinely unclear or depends on facts you don't have, say so rather than guessing. This is not legal advice; keep steps practical and generic (e.g. 'review your data processing agreement', 'consult a lawyer if X applies'), not a legal conclusion. " +
              'Return ONLY raw JSON, no markdown fences, with exactly these keys: ' +
              '"applies" (one of "yes", "no", "unclear"), ' +
              '"reasoning" (one sentence, plain English, referencing their registered systems if relevant, your own words), ' +
              '"steps" (array of 2-5 short action strings, each under 15 words, ordered, empty array if applies is "no"), ' +
              '"suggested_deadline" (short string, e.g. "Before Dec 2027" or "No deadline — monitor only").',
          },
        ],
      }),
    });

    if (!response.ok) throw new Error("Upstream failed (" + response.status + ")");
    const data = await response.json();
    const textBlocks = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    const cleaned = textBlocks.replace(/```json/gi, "").replace(/```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    const plan = JSON.parse(cleaned.slice(start, end + 1));

    return res.status(200).json({ plan });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Couldn't build an action plan right now." });
  }
}

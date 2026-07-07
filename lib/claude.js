// lib/claude.js
// Shared helper for calling the Anthropic API and parsing the JSON payload
// out of the model's text reply. Used by the on-demand news search
// (pages/api/news.js), the 4-hourly cache refresh (pages/api/cron/pulse-refresh.js)
// and the action-plan generator (pages/api/action-plan.js) — previously each
// file duplicated its own copy of this fetch-and-parse logic.

export async function callClaude({ prompt, maxTokens = 1300, webSearch = false }) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
      ...(webSearch ? { tools: [{ type: "web_search_20250305", name: "web_search" }] } : {}),
    }),
  });

  if (!response.ok) throw new Error("Upstream request failed (" + response.status + ")");
  const data = await response.json();
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
}

// Pulls the first balanced JSON array/object out of a model's text reply,
// stripping any markdown code fences it added despite being told not to.
export function extractJson(text, open = "[", close = "]") {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf(open);
  const end = cleaned.lastIndexOf(close);
  if (start === -1 || end === -1) throw new Error("No parsable JSON in model response");
  return JSON.parse(cleaned.slice(start, end + 1));
}

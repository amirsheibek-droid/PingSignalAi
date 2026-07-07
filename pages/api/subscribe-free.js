// pages/api/subscribe-free.js
// Activates the free Pull tier — no Stripe involved, since it's free.
// Push tier still goes through /api/checkout (Stripe).

import { getAuthedEmail } from "../../lib/auth";
import { upsertSubscriber } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const email = await getAuthedEmail(req);
  if (!email) return res.status(401).json({ error: "Not signed in" });

  await upsertSubscriber({ email, status: "active", tier: "pull" });
  return res.status(200).json({ ok: true });
}

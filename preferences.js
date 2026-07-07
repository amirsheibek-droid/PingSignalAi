// pages/api/account/preferences.js
import { getAuthedEmail } from "../../../lib/auth";
import { getSubscriberByEmail, upsertSubscriber } from "../../../lib/supabase";

export default async function handler(req, res) {
  const email = await getAuthedEmail(req);
  if (!email) return res.status(401).json({ error: "Not signed in" });

  if (req.method === "GET") {
    const subscriber = await getSubscriberByEmail(email);
    return res.status(200).json({ notificationsEnabled: subscriber?.notifications_enabled ?? true, tier: subscriber?.tier || "pull" });
  }

  if (req.method === "POST") {
    const { notificationsEnabled } = req.body || {};
    await upsertSubscriber({ email, notificationsEnabled: !!notificationsEnabled });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

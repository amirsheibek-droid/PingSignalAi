// pages/api/account/delete.js
// GDPR Article 17 (right to erasure). Cancels the Stripe subscription and
// deletes all stored data for the signed-in person.

import Stripe from "stripe";
import { getAuthedEmail } from "../../../lib/auth";
import { getSubscriberByEmail, deleteUserData, supabaseAdmin } from "../../../lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const email = await getAuthedEmail(req);
  if (!email) return res.status(401).json({ error: "Not signed in" });

  try {
    const subscriber = await getSubscriberByEmail(email);

    if (subscriber?.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({ customer: subscriber.stripe_customer_id, status: "active" });
      for (const sub of subs.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }

    await deleteUserData(email);

    // Also remove the Supabase Auth user record itself
    const { data: authUser } = await supabaseAdmin.auth.admin.listUsers();
    const match = authUser?.users?.find((u) => u.email === email);
    if (match) await supabaseAdmin.auth.admin.deleteUser(match.id);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

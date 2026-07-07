// pages/api/checkout.js
// Only the Push tier (£5/month) goes through Stripe — Pull is free and
// activated instantly via /api/subscribe-free.

import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email, weeklyConsent } = req.body || {};
  if (!email) return res.status(400).json({ error: "Email required" });
  if (!weeklyConsent) return res.status(400).json({ error: "Weekly auto-refresh requires explicit consent" });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID_PUSH, quantity: 1 }],
      metadata: { tier: "push", weekly_consent: "true" },
      success_url: `${process.env.APP_URL}/?checkout=success`,
      cancel_url: `${process.env.APP_URL}/?checkout=cancelled`,
    });
    return res.status(200).json({ url: session.url });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

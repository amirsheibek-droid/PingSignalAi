// pages/api/webhook.js
import Stripe from "stripe";
import { upsertSubscriber } from "../../lib/supabase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
export const config = { api: { bodyParser: false } };

function buffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on("data", (c) => chunks.push(c));
    readable.on("end", () => resolve(Buffer.concat(chunks)));
    readable.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      await upsertSubscriber({
        email: session.customer_email,
        status: "active",
        tier: "push",
        weeklyConsent: true,
        stripeCustomerId: session.customer,
      });
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const status = sub.status === "active" || sub.status === "trialing" ? "active" : "inactive";
      await upsertSubscriber({ status, stripeCustomerId: sub.customer });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await upsertSubscriber({ status: "inactive", stripeCustomerId: sub.customer });
      break;
    }
    default:
      break;
  }
  return res.status(200).json({ received: true });
}

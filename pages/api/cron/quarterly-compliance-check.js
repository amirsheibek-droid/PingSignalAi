// pages/api/cron/quarterly-compliance-check.js
// Runs every 3 months (see vercel.json). Sends you (the operator) an email
// via Resend reminding you to re-run the AI Act self-assessment and check
// whether any "pending" items in OUR_COMPLIANCE have been resolved.
// This is the literal answer to "so I don't have to catch up" — the app
// nags you on a schedule instead of you having to remember.

export default async function handler(req, res) {
  const auth = req.headers.authorization || "";
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    if (process.env.RESEND_API_KEY && process.env.OPERATOR_EMAIL) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "RegPulse <noreply@yourdomain.com>",
          to: process.env.OPERATOR_EMAIL,
          subject: "Quarterly compliance check due — RegPulse",
          text:
            "It's time to re-run RegPulse's own AI Act self-assessment and review the compliance checklist in the app (tap 'Our own compliance status'). Check whether the EU AI Act Digital Omnibus timeline has moved again, and whether any pending items (DPAs, EU representative) have been resolved.",
        }),
      });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

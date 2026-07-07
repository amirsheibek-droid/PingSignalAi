# PingSignal AI — final direction

General AI/tech news as the core, free product (the acquisition engine —
easy to love, easy to share). Compliance tracking is one category inside
it, not the whole identity, with an optional "My AI Systems" tagging
feature for anyone who wants deeper relevance. Pro tier is £5/month for
automatic weekly delivery.

## Why this shape, after all the back-and-forth

- Pure general AI news loses to free, established competitors (TLDR AI,
  Ben's Bites) with no real wedge.
- Pure compliance-only has a real wedge but a much smaller, harder-to-reach
  audience and (per the "will it sell" conversation) risks feeling like a
  one-time tracker unless it's positioned as ongoing monitoring.
- This version gets the broad, shareable appeal of general news as the
  front door, while keeping the compliance depth and self-assessment
  features already built for the people who actually want them.

## Everything from the previous builds is retained

- Real magic-link auth, RLS, rate limiting, signed Stripe webhooks
- Ping sound + on/off notification toggle
- Offline caching, source links on every card
- Cubix-inspired background, fully responsive layout
- "Our own compliance status" — dogfooded, honest, visible even pre-signup
- Quarterly compliance reminder cron (unchanged)

## Setup

Identical to the previous README's account list and env vars (Anthropic,
Stripe, Supabase, Vercel), with `STRIPE_PRICE_ID_PUSH` set to £5/month.
Free tier still needs no Stripe — wired through `/api/subscribe-free`.

## "Faster than competitors" — what that honestly means

Two real, defensible speed advantages were added, and nothing dishonest:

1. **Refresh cadence beats the newsletter model.** Push tier now refreshes
   every 4 hours (`pages/api/cron/pulse-refresh.js`, `vercel.json`) instead
   of weekly — 6x more often than a once-daily newsletter competitor like
   TLDR AI or Ben's Bites. Still one shared search serving every Push
   subscriber, so cost stays flat regardless of subscriber count.
2. **Perceived load speed beats opening an email.** The app now shows the
   last-known feed instantly on open (from local cache) with a small
   "Updating in the background…" indicator, instead of a blank loading
   screen while the live search runs. A newsletter makes you wait for the
   email to load/render; this makes you wait for nothing — you're already
   reading while it quietly catches up behind the scenes.

What this does NOT claim: it does not and cannot beat X/Twitter or other
live sources for the very first mention of breaking news — no AI news
app can, since they all read from the same published web. The honest
pitch stays "you'll understand it faster, and see it more often, than a
daily digest" — not "we're faster than Twitter."

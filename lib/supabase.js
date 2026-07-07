// lib/supabase.js
//
// Tables to create in Supabase (SQL below). Two service accounts used:
// - anon key (public, used client-side for auth only)
// - service_role key (private, server-side only — full access, never exposed to browser)

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

/*
SQL — run once in Supabase SQL editor:

create table subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  status text not null default 'inactive',        -- 'active' | 'inactive'
  tier text not null default 'pull',               -- 'pull' (tap to refresh) | 'push' (weekly auto)
  weekly_consent boolean not null default false,   -- explicit opt-in, GDPR consent record
  weekly_consent_at timestamptz,
  notifications_enabled boolean not null default true,  -- ping sound + push toggle
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table usage_log (
  id bigint generated always as identity primary key,
  email text not null,
  called_at timestamptz default now()
);

create table news_cache (
  id int primary key default 1,
  items jsonb not null,
  refreshed_at timestamptz default now()
);

alter table subscribers enable row level security;
alter table usage_log enable row level security;
alter table news_cache enable row level security;
-- No policies are added, which means only the service_role key (used only
-- in our server API routes) can touch these tables. The browser's anon key
-- cannot read or write them directly.
*/

export async function getSubscriberByEmail(email) {
  const { data, error } = await supabaseAdmin.from("subscribers").select("*").eq("email", email).single();
  if (error) return null;
  return data;
}

export async function upsertSubscriber({ email, status, tier, weeklyConsent, notificationsEnabled, stripeCustomerId }) {
  let lookupEmail = email;
  if (!lookupEmail && stripeCustomerId) {
    const { data } = await supabaseAdmin
      .from("subscribers")
      .select("email")
      .eq("stripe_customer_id", stripeCustomerId)
      .single();
    lookupEmail = data?.email;
    if (!lookupEmail) return;
  }

  const patch = { email: lookupEmail, updated_at: new Date().toISOString() };
  if (status !== undefined) patch.status = status;
  if (tier !== undefined) patch.tier = tier;
  if (stripeCustomerId !== undefined) patch.stripe_customer_id = stripeCustomerId;
  if (notificationsEnabled !== undefined) patch.notifications_enabled = notificationsEnabled;
  if (weeklyConsent !== undefined) {
    patch.weekly_consent = weeklyConsent;
    patch.weekly_consent_at = new Date().toISOString();
  }

  await supabaseAdmin.from("subscribers").upsert(patch, { onConflict: "email" });
}

// --- Rate limiting for the Free tier: caps manual refreshes per WEEK,
//     and doubles as the upgrade-prompt trigger (see /api/news.js) ---
export async function checkAndLogUsage(email, weeklyLimit) {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const { count } = await supabaseAdmin
    .from("usage_log")
    .select("*", { count: "exact", head: true })
    .eq("email", email)
    .gte("called_at", since.toISOString());

  if ((count || 0) >= weeklyLimit) {
    return { allowed: false, count };
  }
  await supabaseAdmin.from("usage_log").insert({ email });
  return { allowed: true, count: (count || 0) + 1 };
}

// --- Shared cache used by the 'push' tier so one weekly search serves
//     every push subscriber, instead of one API call per person ---
export async function getCachedNews() {
  const { data } = await supabaseAdmin.from("news_cache").select("*").eq("id", 1).single();
  return data;
}

export async function setCachedNews(items) {
  await supabaseAdmin
    .from("news_cache")
    .upsert({ id: 1, items, refreshed_at: new Date().toISOString() }, { onConflict: "id" });
}

// --- GDPR: export everything held about a person (Art. 15/20) ---
export async function exportUserData(email) {
  const subscriber = await getSubscriberByEmail(email);
  const { data: usage } = await supabaseAdmin.from("usage_log").select("called_at").eq("email", email);
  return { subscriber, usage_log: usage || [] };
}

// --- GDPR: erase everything held about a person (Art. 17) ---
export async function deleteUserData(email) {
  await supabaseAdmin.from("usage_log").delete().eq("email", email);
  await supabaseAdmin.from("subscribers").delete().eq("email", email);
  await supabaseAdmin.from("user_systems").delete().eq("email", email);
}

/* Additional SQL — user's registered AI systems, used to filter the feed
   down to what's actually relevant to what they've built:

create table user_systems (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  tags text[] not null default '{}',   -- e.g. {employment, biometrics}
  created_at timestamptz default now()
);
alter table user_systems enable row level security;
*/

export async function getUserSystems(email) {
  const { data } = await supabaseAdmin.from("user_systems").select("*").eq("email", email).order("created_at");
  return data || [];
}

export async function addUserSystem(email, name, tags) {
  const { data } = await supabaseAdmin.from("user_systems").insert({ email, name, tags }).select().single();
  return data;
}

export async function deleteUserSystem(email, id) {
  await supabaseAdmin.from("user_systems").delete().eq("email", email).eq("id", id);
}

export { supabaseAdmin };

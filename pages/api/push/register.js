// pages/api/push/register.js
import { getAuthedEmail } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const email = await getAuthedEmail(req);
  if (!email) return res.status(401).json({ error: "Not signed in" });

  const { token, platform } = req.body || {};
  if (!token) return res.status(400).json({ error: "Missing token" });

  await supabaseAdmin
    .from("push_tokens")
    .upsert({ email, token, platform, updated_at: new Date().toISOString() }, { onConflict: "token" });

  return res.status(200).json({ ok: true });
}

/* SQL for the new table (add to lib/supabase.js's SQL block too):
create table push_tokens (
  token text primary key,
  email text not null,
  platform text,
  updated_at timestamptz default now()
);
alter table push_tokens enable row level security;
*/

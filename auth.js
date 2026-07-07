// lib/auth.js
// Verifies the Supabase session token sent from the browser in the
// Authorization header. This is what stops someone typing in a stranger's
// email and seeing their content — they'd also need that person's actual
// inbox to complete the magic-link sign-in.

import { supabaseAdmin } from "./supabase";

export async function getAuthedEmail(req) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.email) return null;
  return data.user.email;
}

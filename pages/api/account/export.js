// pages/api/account/export.js
// GDPR Article 15 (right of access) and Article 20 (data portability).
// Returns everything the app holds about the signed-in person as JSON.

import { getAuthedEmail } from "../../../lib/auth";
import { exportUserData } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const email = await getAuthedEmail(req);
  if (!email) return res.status(401).json({ error: "Not signed in" });

  const data = await exportUserData(email);
  res.setHeader("Content-Disposition", "attachment; filename=signal-my-data.json");
  return res.status(200).json(data);
}

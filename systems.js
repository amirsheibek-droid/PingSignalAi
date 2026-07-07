// pages/api/systems.js
import { getAuthedEmail } from "../../lib/auth";
import { getUserSystems, addUserSystem, deleteUserSystem } from "../../lib/supabase";

export default async function handler(req, res) {
  const email = await getAuthedEmail(req);
  if (!email) return res.status(401).json({ error: "Not signed in" });

  if (req.method === "GET") {
    const systems = await getUserSystems(email);
    return res.status(200).json({ systems });
  }

  if (req.method === "POST") {
    const { name, tags } = req.body || {};
    if (!name) return res.status(400).json({ error: "Name required" });
    const system = await addUserSystem(email, name, Array.isArray(tags) ? tags : []);
    return res.status(200).json({ system });
  }

  if (req.method === "DELETE") {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: "Id required" });
    await deleteUserSystem(email, id);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end();
    return;
  }
  res.setHeader("Set-Cookie", "site_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ ok: true });
}
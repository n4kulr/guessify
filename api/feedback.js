export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method not allowed" });
  }

  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return res.status(503).json({ error: "feedback is not configured yet" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "invalid json" });
    }
  }

  const message = String(body?.message || "").trim();
  if (!message) {
    return res.status(400).json({ error: "message required" });
  }
  if (message.length > 1800) {
    return res.status(400).json({ error: "message too long" });
  }

  const meta = [];
  if (body?.page) meta.push(`page: ${String(body.page).slice(0, 200)}`);
  if (body?.userAgent) meta.push(`ua: ${String(body.userAgent).slice(0, 180)}`);

  const content = [
    "**guessify feedback**",
    "```",
    message,
    "```",
    meta.length ? `_${meta.join(" · ")}_` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "guessify",
        content,
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("discord webhook failed", r.status, detail);
      return res.status(502).json({ error: "could not deliver feedback" });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "could not deliver feedback" });
  }
}

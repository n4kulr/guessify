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

  // Quote-style body + feedback art (not og.png — that vinyl was wrong here).
  const quoted = message
    .split("\n")
    .map((line) => `> ${line || "\u00a0"}`)
    .join("\n");

  const base = String(process.env.APP_BASE_URL || "https://guessify.uk").replace(/\/$/, "");
  const artUrl = `${base}/feedback-discord.png`;

  const embed = {
    title: "feedback",
    description: quoted.length > 4090 ? `${quoted.slice(0, 4080)}…` : quoted,
    color: 0xe9d5c6,
    timestamp: new Date().toISOString(),
    image: { url: artUrl },
  };

  try {
    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "guessify",
        embeds: [embed],
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

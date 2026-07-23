import { getBase } from "./_lib.js";

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

  const page = String(body?.page || "").slice(0, 200);
  const ua = String(body?.userAgent || "").slice(0, 180);
  const base = getBase(req);
  const art = `${base}/og.png`;

  const embed = {
    title: "new feedback",
    description: message.length > 4000 ? `${message.slice(0, 3990)}…` : message,
    color: 0xe9d5c6, // olivia main
    thumbnail: { url: art },
    timestamp: new Date().toISOString(),
    footer: {
      text: "guessify · feedback webhook",
      icon_url: art,
    },
    fields: [],
  };

  if (page) {
    embed.fields.push({
      name: "page",
      value: page.length > 1024 ? `${page.slice(0, 1020)}…` : page,
      inline: false,
    });
  }
  if (ua) {
    embed.fields.push({
      name: "client",
      value: ua.length > 1024 ? `${ua.slice(0, 1020)}…` : ua,
      inline: false,
    });
  }

  try {
    const r = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "guessify",
        avatar_url: art,
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

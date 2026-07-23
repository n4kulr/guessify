export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

function parseDataUrl(dataUrl) {
  const m = String(dataUrl || "").match(
    /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([a-zA-Z0-9+/=\s]+)$/
  );
  if (!m) return null;
  const mime = m[1] === "image/jpg" ? "image/jpeg" : m[1];
  try {
    const buf = Buffer.from(m[2].replace(/\s+/g, ""), "base64");
    if (!buf.length || buf.length > 3_500_000) return null;
    return { mime, buf };
  } catch {
    return null;
  }
}

function extFor(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

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
  const rawImages = Array.isArray(body?.images) ? body.images.slice(0, 3) : [];
  const images = [];
  for (const item of rawImages) {
    const parsed = parseDataUrl(item?.dataUrl);
    if (!parsed) continue;
    images.push({
      ...parsed,
      filename: `shot${images.length}.${extFor(parsed.mime)}`,
    });
  }

  if (!message && !images.length) {
    return res.status(400).json({ error: "message or screenshot required" });
  }
  if (message.length > 1800) {
    return res.status(400).json({ error: "message too long" });
  }

  const quoted = message
    ? message
        .split("\n")
        .map((line) => `> ${line || "\u00a0"}`)
        .join("\n")
    : "> _(screenshot only)_";

  const base = String(process.env.APP_BASE_URL || "https://guessify.uk").replace(
    /\/$/,
    ""
  );
  const artUrl = `${base}/feedback-discord.png`;

  const embeds = [
    {
      title: "feedback",
      description: quoted.length > 4090 ? `${quoted.slice(0, 4080)}…` : quoted,
      color: 0xe9d5c6,
      timestamp: new Date().toISOString(),
      thumbnail: { url: artUrl },
    },
  ];

  if (images.length) {
    embeds[0].image = { url: `attachment://${images[0].filename}` };
    for (let i = 1; i < images.length; i++) {
      embeds.push({
        color: 0xe9d5c6,
        image: { url: `attachment://${images[i].filename}` },
      });
    }
  } else {
    embeds[0].image = { url: artUrl };
    delete embeds[0].thumbnail;
  }

  try {
    let r;
    if (images.length) {
      const form = new FormData();
      form.append(
        "payload_json",
        JSON.stringify({
          username: "guessify",
          embeds,
        })
      );
      images.forEach((img, i) => {
        form.append(
          `files[${i}]`,
          new Blob([img.buf], { type: img.mime }),
          img.filename
        );
      });
      r = await fetch(webhook, { method: "POST", body: form });
    } else {
      r = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "guessify",
          embeds,
        }),
      });
    }

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

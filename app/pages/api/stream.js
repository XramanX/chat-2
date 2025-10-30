export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  console.log("pages api/stream hit");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "MISSING_SERVER_KEY" });

  const incomingBody = JSON.stringify(req.body || {});
  const model = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";
  const baseUrl = process.env.NEXT_PUBLIC_GEMINI_BASE_URL;
  const upstreamUrl = `${baseUrl}/${model}:streamGenerateContent?alt=sse`;

  const upstreamRes = await fetch(upstreamUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: incomingBody,
  });

  if (!upstreamRes.ok && !upstreamRes.body) {
    const err = await upstreamRes.text().catch(() => "upstream error");
    return res
      .status(upstreamRes.status || 502)
      .json({ error: "UPSTREAM", details: err });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");

  const reader = upstreamRes.body.getReader();
  const decoder = new TextDecoder();
  async function pump() {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value));
    }
    res.end();
  }
  pump().catch((e) => {
    console.error(e);
    res.end();
  });
}

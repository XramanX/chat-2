export async function POST(req) {
  console.log("[api/stream] hit");

  const API_KEY = process.env.GEMINI_API_KEY;
  const BASE_URL = process.env.NEXT_PUBLIC_GEMINI_BASE_URL;
  const MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";

  if (!API_KEY || !BASE_URL) {
    return new Response(
      JSON.stringify({
        error: "Missing API configuration",
        details: { hasKey: !!API_KEY, hasBase: !!BASE_URL },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const STREAM_URL = `${BASE_URL}/${MODEL}:streamGenerateContent?alt=sse&key=${encodeURIComponent(
    API_KEY
  )}`;

  const bodyText = await req.text().catch(() => "{}");
  console.log("[api/stream] Forwarding to:", STREAM_URL);

  try {
    const upstream = await fetch(STREAM_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: bodyText,
    });

    console.log("[api/stream] Upstream status:", upstream.status);

    if (!upstream.body) {
      const errText = await upstream.text().catch(() => "no body");
      console.error("[api/stream] No body in response", errText);
      return new Response(errText, { status: 502 });
    }

    const reader = upstream.body.getReader();

    return new Response(
      new ReadableStream({
        async start(controller) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      }
    );
  } catch (err) {
    console.error("[api/stream] Error:", err);
    return new Response(
      JSON.stringify({
        error: "PROXY_ERROR",
        details: String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export function parseSSEBlock(block) {
  if (!block || !block.trim()) return null;

  const lines = block.split(/\r?\n/);
  const dataLines = lines
    .filter((l) => l.startsWith("data:"))
    .map((l) => l.slice(5));
  let dataStr = dataLines.length ? dataLines.join("\n").trim() : block.trim();

  if (
    typeof dataStr === "string" &&
    dataStr.startsWith('"') &&
    dataStr.endsWith('"')
  ) {
    try {
      dataStr = JSON.parse(dataStr);
    } catch {
      // ignore
    }
  }

  if (!dataStr || dataStr === "[DONE]") {
    return { text: null, done: true };
  }

  try {
    const json = typeof dataStr === "string" ? JSON.parse(dataStr) : dataStr;

    if (Array.isArray(json?.candidates) && json.candidates.length) {
      const candidate = json.candidates[0];
      const parts = candidate?.content?.parts;
      const text = Array.isArray(parts)
        ? parts.map((p) => p?.text || "").join("")
        : null;
      const finishReason =
        candidate?.finishReason || candidate?.finish_reason || null;
      return { text: text || null, done: !!finishReason };
    }

    if (typeof json === "object") {
      const text = json.text ?? json.content ?? null;
      const done = !!(json.finishReason || json.finish_reason);
      return { text: text || null, done };
    }

    if (typeof json === "string") {
      return { text: json, done: false };
    }
  } catch {
    // not JSON
  }

  return { text: String(dataStr), done: false };
}

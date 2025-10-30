import { useCallback, useEffect, useRef, useState } from "react";
import { parseSSEBlock } from "../utils/sseParser";

export default function useStreamChat(streamUrl, options = {}) {
  const {
    singleStream = true,
    debug = false,
    finishImmediate = true,
  } = options;

  const [messages, setMessages] = useState([
    {
      id: "m0",
      role: "assistant",
      text: "Hi — ask me anything.",
      streaming: false,
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);

  const bufferRef = useRef("");
  const rafRef = useRef(null);
  const assistantIdxRef = useRef(null);
  const assistantIdRef = useRef(null);
  const abortRef = useRef(null);
  const nextIdRef = useRef(1);

  const findStreamingAssistantIndex = (prev) => {
    for (let i = prev.length - 1; i >= 0; --i) {
      if (prev[i].role === "assistant" && prev[i].streaming) return i;
    }
    return null;
  };

  const removeIfEmpty = (arr, idx) => {
    if (idx == null || idx < 0 || idx >= arr.length) return arr;
    const msg = arr[idx];
    if (!msg) return arr;
    if (!msg.text || !String(msg.text).trim()) {
      // remove the placeholder entirely
      const copy = arr.slice();
      copy.splice(idx, 1);
      return copy;
    }
    return arr;
  };

  const scheduleFlush = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const chunk = bufferRef.current;
      if (!chunk) return;
      if (debug) console.debug("[rAF flush] chunk len:", chunk.length);

      setMessages((prev) => {
        const aid = assistantIdRef.current;
        let idx = null;
        if (aid) {
          idx = prev.findIndex((m) => m.id === aid);
          if (idx === -1) idx = null;
        }
        if (idx == null) idx = findStreamingAssistantIndex(prev);
        if (idx == null) {
          if (debug)
            console.warn(
              "[rAF flush] no assistant placeholder found — dropping chunk"
            );
          return prev;
        }
        const copy = prev.slice();
        const old = copy[idx];
        copy[idx] = { ...old, text: (old.text || "") + chunk };
        return copy;
      });

      bufferRef.current = "";
    });
  }, [debug]);

  const sendMessage = useCallback(
    async (userText) => {
      if (!userText?.trim()) return;
      if (singleStream && isStreaming) return;

      setIsStreaming(true);

      let assistantIndexLocal;
      setMessages((prev) => {
        const uid = `u${nextIdRef.current++}`;
        const aid = `a${nextIdRef.current++}`;
        const out = [
          ...prev,
          { id: uid, role: "user", text: userText, streaming: false },
          { id: aid, role: "assistant", text: "", streaming: true },
        ];
        assistantIndexLocal = out.length - 1;
        assistantIdRef.current = aid;
        return out;
      });

      assistantIdxRef.current = assistantIndexLocal;
      bufferRef.current = "";

      const controller = new AbortController();
      abortRef.current = controller;

      const body = { contents: [{ parts: [{ text: userText }] }] };

      try {
        const res = await fetch(streamUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok) {
          const txt = await res.text();
          if (debug) console.error("Upstream error:", res.status, txt);
          setMessages((prev) =>
            prev.map((m, i) =>
              i === assistantIndexLocal
                ? {
                    ...m,
                    text: `[error ${res.status}] ${txt}`,
                    streaming: false,
                  }
                : m
            )
          );
          setIsStreaming(false);
          assistantIdxRef.current = null;
          assistantIdRef.current = null;
          abortRef.current = null;
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setMessages((prev) =>
            prev.map((m, i) =>
              i === assistantIndexLocal
                ? { ...m, text: "[error] stream unavailable", streaming: false }
                : m
            )
          );
          setIsStreaming(false);
          assistantIdxRef.current = null;
          assistantIdRef.current = null;
          abortRef.current = null;
          return;
        }

        const decoder = new TextDecoder("utf-8");
        let acc = "";
        let endedBySignal = false;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            if (acc.trim()) {
              const parsed = parseSSEBlock(acc);
              if (parsed?.text) {
                bufferRef.current += parsed.text;
                scheduleFlush();
              }
              if (parsed?.done) endedBySignal = true;
            }
            break;
          }

          acc += decoder.decode(value, { stream: true });

          const parts = acc.split(/\r?\n\r?\n/);
          acc = parts.pop();

          for (const part of parts) {
            if (!part.trim()) continue;
            if (debug) console.debug("[raw block preview]", part.slice(0, 300));
            const parsed = parseSSEBlock(part);
            if (!parsed) continue;

            if (parsed.text) {
              bufferRef.current += parsed.text;
              scheduleFlush();
            }

            if (parsed.done) {
              endedBySignal = true;

              if (finishImmediate) {
                if (bufferRef.current) {
                  // synchronous small flush
                  const finalChunk = bufferRef.current;
                  bufferRef.current = "";
                  setMessages((prev) => {
                    const aid = assistantIdRef.current;
                    let idx = aid ? prev.findIndex((m) => m.id === aid) : -1;
                    if (idx === -1) idx = findStreamingAssistantIndex(prev);
                    if (idx == null) return prev;
                    const copy = prev.slice();
                    const old = copy[idx];
                    copy[idx] = { ...old, text: (old.text || "") + finalChunk };
                    return copy;
                  });
                }

                // mark finished
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantIdRef.current
                      ? { ...m, streaming: false }
                      : m
                  )
                );

                try {
                  abortRef.current?.abort();
                } catch (e) {}

                break;
              }
            }
          }

          if (endedBySignal && finishImmediate) break;
        }

        if (bufferRef.current) scheduleFlush();

        // mark assistant finished and remove if empty
        setMessages((prev) => {
          const idx = assistantIndexLocal;
          const mapped = prev.map((m, i) =>
            i === idx ? { ...m, streaming: false } : m
          );
          return removeIfEmpty(
            mapped,
            mapped.findIndex((m) => m.id === assistantIdRef.current)
          );
        });

        if (debug) console.debug("stream ended. endedBySignal:", endedBySignal);
      } catch (err) {
        if (err?.name === "AbortError") {
          if (debug)
            console.log("stream aborted (expected if we called abort)");
        } else {
          if (debug) console.error("stream error:", err);
          setMessages((prev) =>
            prev.map((m, i) =>
              i === assistantIndexLocal
                ? { ...m, text: `[error] ${String(err)}`, streaming: false }
                : m
            )
          );
        }
      } finally {
        if (bufferRef.current) scheduleFlush();
        setIsStreaming(false);
        assistantIdxRef.current = null;
        assistantIdRef.current = null;
        abortRef.current = null;
      }
    },
    [
      singleStream,
      isStreaming,
      scheduleFlush,
      streamUrl,
      debug,
      finishImmediate,
    ]
  );

  // robust stop: abort, flush any buffer, mark finished, remove empty placeholder
  const stopStreaming = useCallback(() => {
    try {
      abortRef.current?.abort();
    } catch (e) {}
    abortRef.current = null;

    setIsStreaming(false);

    if (bufferRef.current) {
      const finalChunk = bufferRef.current;
      bufferRef.current = "";
      setMessages((prev) => {
        const aid = assistantIdRef.current;
        let idx = aid ? prev.findIndex((m) => m.id === aid) : -1;
        if (idx === -1) idx = findStreamingAssistantIndex(prev);
        if (idx == null) return prev;
        const copy = prev.slice();
        const old = copy[idx];
        copy[idx] = {
          ...old,
          text: (old.text || "") + finalChunk,
          streaming: false,
        };
        return removeIfEmpty(copy, idx);
      });
    } else {
      setMessages((prev) => {
        // clear streaming flags and remove any empty assistant placeholders
        let copy = prev.map((m) =>
          m.id === assistantIdRef.current ||
          (m.role === "assistant" && m.streaming)
            ? { ...m, streaming: false }
            : m
        );
        // try to find the assistant placeholder by id first, then fallback to any streaming assistant
        let idx = assistantIdRef.current
          ? copy.findIndex((m) => m.id === assistantIdRef.current)
          : -1;
        if (idx === -1) idx = findStreamingAssistantIndex(copy);
        if (idx == null) return copy;
        return removeIfEmpty(copy, idx);
      });
    }

    assistantIdxRef.current = null;
    assistantIdRef.current = null;

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { messages, isStreaming, sendMessage, stopStreaming };
}

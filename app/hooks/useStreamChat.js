import { useCallback, useEffect, useRef, useState } from "react";
import { parseSSEBlock } from "../utils/sseParser";
import { loadChat, saveChat, createNewChat } from "../utils/chatStorage";

export default function useStreamChat(streamUrl, options = {}) {
  const {
    singleStream = true,
    debug = false,
    finishImmediate = true,
    chatId: externalChatId = null,
  } = options;

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const chatIdRef = useRef(externalChatId);
  const bufferRef = useRef("");
  const rafRef = useRef(null);
  const assistantIdxRef = useRef(null);
  const assistantIdRef = useRef(null);
  const abortRef = useRef(null);
  const nextIdRef = useRef(1);

  useEffect(() => {
    (async () => {
      let chatData = null;
      let idToLoad = externalChatId || localStorage.getItem("last_active_chat");

      if (idToLoad) {
        chatData = await loadChat(idToLoad);
      }

      if (!chatData) {
        setChat(null);
        setMessages([]);
        return;
      }

      chatIdRef.current = idToLoad;
      setChat(chatData);
      setMessages(chatData.messages || []);
      localStorage.setItem("last_active_chat", idToLoad);
    })();
  }, [externalChatId]);

  useEffect(() => {
    if (!chatIdRef.current || !messages.length) return;
    const chatData = { ...chat, id: chatIdRef.current, messages };
    saveChat(chatIdRef.current, chatData);
  }, [messages, chat]);

  const findStreamingAssistantIndex = (prev) => {
    for (let i = prev.length - 1; i >= 0; --i) {
      if (prev[i].role === "assistant" && prev[i].streaming) return i;
    }
    return null;
  };

  const removeIfEmpty = (arr, idx) => {
    if (idx == null || idx < 0 || idx >= arr.length) return arr;
    const msg = arr[idx];
    if (!msg || !msg.text?.trim()) {
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
        let idx = aid ? prev.findIndex((m) => m.id === aid) : -1;
        if (idx === -1) idx = findStreamingAssistantIndex(prev);
        if (idx == null) return prev;

        const copy = [...prev];
        copy[idx] = { ...copy[idx], text: (copy[idx].text || "") + chunk };
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
          throw new Error("Bad response from server");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("Stream unavailable");

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
                  const chunk = bufferRef.current;
                  bufferRef.current = "";
                  setMessages((prev) => {
                    const idx = findStreamingAssistantIndex(prev);
                    if (idx == null) return prev;
                    const copy = [...prev];
                    copy[idx] = {
                      ...copy[idx],
                      text: (copy[idx].text || "") + chunk,
                      streaming: false,
                    };
                    return copy;
                  });
                }
                abortRef.current?.abort();
                break;
              }
            }
          }

          if (endedBySignal && finishImmediate) break;
        }

        if (bufferRef.current) scheduleFlush();

        setMessages((prev) => {
          const mapped = prev.map((m) =>
            m.id === assistantIdRef.current ? { ...m, streaming: false } : m
          );
          return removeIfEmpty(
            mapped,
            mapped.findIndex((m) => m.id === assistantIdRef.current)
          );
        });
      } catch (err) {
        if (err?.name !== "AbortError" && debug)
          console.error("Stream error:", err);
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

  const stopStreaming = useCallback(() => {
    try {
      abortRef.current?.abort();
    } catch {}
    abortRef.current = null;
    setIsStreaming(false);

    if (bufferRef.current) {
      const chunk = bufferRef.current;
      bufferRef.current = "";
      setMessages((prev) => {
        const idx = findStreamingAssistantIndex(prev);
        if (idx == null) return prev;
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          text: (copy[idx].text || "") + chunk,
          streaming: false,
        };
        return removeIfEmpty(copy, idx);
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return { messages, isStreaming, sendMessage, stopStreaming, chat };
}

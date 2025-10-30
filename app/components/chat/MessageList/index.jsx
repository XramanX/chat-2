import React, { useEffect, useRef, useState, useMemo } from "react";
import styles from "./MessageList.module.scss";
import MessageBubble from "../MessageBubble";

export default function MessageList({ messages = [] }) {
  const listRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [messages]);

  const uniqueMessages = useMemo(() => {
    const seen = new Set();
    return messages.filter((m, idx) => {
      if (!m || m.id == null) return true;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [messages]);

  return (
    <div
      ref={listRef}
      className={`${styles.list} ${mounted ? styles.mounted : ""}`}
    >
      {uniqueMessages.map((m, idx) => {
        const key =
          m.id != null ? `${m.id}-${m.createdAt ?? idx}` : `msg-${idx}`;
        return (
          <div
            key={key}
            className={`${styles.row} ${
              m.role === "user" ? styles.right : styles.left
            }`}
          >
            <MessageBubble message={m} />
          </div>
        );
      })}
    </div>
  );
}

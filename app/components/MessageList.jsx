import React, { useEffect, useRef, useState } from "react";
import styles from "./MessageList.module.scss";
import MessageBubble from "./MessageBubble";

export default function MessageList({ messages = [] }) {
  const listRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  // disable entry animation until mounted
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // auto-scroll to bottom on new messages
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [messages]);

  return (
    <div
      ref={listRef}
      className={`${styles.list} ${mounted ? styles.mounted : ""}`}
    >
      {messages.map((m) => (
        <div
          key={m.id}
          className={`${styles.row} ${
            m.role === "user" ? styles.right : styles.left
          }`}
        >
          <MessageBubble message={m} />
        </div>
      ))}
    </div>
  );
}

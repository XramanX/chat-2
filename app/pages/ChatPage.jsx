"use client";
import { useState } from "react";
import { FiCpu } from "react-icons/fi";
import useStreamChat from "../hooks/useStreamChat";
import MessageList from "../components/MessageList";
import Composer from "../components/Composer";
import styles from "./ChatPage.module.scss";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || "gemini-2.5-flash";
const BASE_URL = process.env.NEXT_PUBLIC_GEMINI_BASE_URL;

const STREAM_URL = `${BASE_URL}/${MODEL}:streamGenerateContent?alt=sse&key=${encodeURIComponent(
  API_KEY
)}`;

export default function ChatPage() {
  const { messages, isStreaming, sendMessage, stopStreaming } = useStreamChat(
    STREAM_URL,
    { singleStream: true, debug: false }
  );
  const [input, setInput] = useState("");

  const onSend = (e) => {
    e?.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput("");
    sendMessage(t);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <FiCpu className={styles.logo} />
            <h1 className={styles.title}>Chat</h1>
          </div>
        </header>

        <main className={styles.main}>
          <MessageList messages={messages} />
        </main>

        <footer className={styles.footer}>
          <Composer
            value={input}
            onChange={setInput}
            onSend={onSend}
            disabled={isStreaming}
            onStop={stopStreaming}
          />
        </footer>
      </div>
    </div>
  );
}

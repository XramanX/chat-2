"use client";
import { useState, useEffect } from "react";
import { FiCpu, FiMenu } from "react-icons/fi";
import useStreamChat from "../hooks/useStreamChat";
import MessageList from "../components/chat/MessageList";
import Composer from "../components/chat/Composer";
import ChatList from "../components/chat/ChatList";
import { getChatList } from "../utils/chatStorage";
import styles from "./ChatPage.module.scss";

const STREAM_URL = "/api/stream";

export default function ChatPage() {
  const [activeChatId, setActiveChatId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatTitle, setChatTitle] = useState("Chat");

  const { messages, isStreaming, sendMessage, stopStreaming } = useStreamChat(
    STREAM_URL,
    { chatId: activeChatId, singleStream: true, debug: false }
  );
  const [input, setInput] = useState("");

  const onSend = (e) => {
    e?.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput("");
    sendMessage(t);
  };

  useEffect(() => {
    async function fetchTitle() {
      if (!activeChatId) {
        setChatTitle("Chat");
        return;
      }
      const list = await getChatList();
      const current = list.find((c) => c.id === activeChatId);
      setChatTitle(current?.title?.trim() || "Untitled Chat");
    }
    fetchTitle();
  }, [activeChatId]);

  return (
    <div className={styles.page}>
      <aside className={`${styles.sidebar} ${menuOpen ? styles.open : ""}`}>
        <ChatList
          currentChatId={activeChatId}
          onSelect={(id) => {
            setActiveChatId(id);
            setMenuOpen(false);
          }}
          onClose={() => setMenuOpen(false)}
        />
      </aside>

      <div className={styles.container}>
        <header className={styles.header}>
          <button
            className={styles.menuBtn}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <FiMenu />
          </button>

          <div className={styles.brand}>
            <FiCpu className={styles.logo} />
            <h1 key={chatTitle} className={`${styles.title} ${styles.fade}`}>
              {chatTitle}
            </h1>
          </div>
        </header>

        <main className={styles.main}>
          {activeChatId ? (
            <>
              <MessageList messages={messages} />
              <footer className={styles.footer}>
                <Composer
                  value={input}
                  onChange={setInput}
                  onSend={onSend}
                  disabled={isStreaming}
                  onStop={stopStreaming}
                />
              </footer>
            </>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyBox}>
                <p>No active chat</p>
                <p className={styles.subtext}>
                  Create a new chat to get started.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

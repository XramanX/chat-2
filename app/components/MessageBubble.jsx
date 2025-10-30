import React, { useEffect, useState } from "react";
import { FiCopy, FiCheck } from "react-icons/fi";
import { shortTimestamp } from "../utils/formatStream";
import styles from "./MessageBubble.module.scss";
import StreamLoader from "./StreamLoader";
export default function MessageBubble({ message }) {
  const [copied, setCopied] = useState(false);
  const [clientTime, setClientTime] = useState("");

  useEffect(() => {
    setClientTime(shortTimestamp(message.ts));
  }, [message.ts]);

  const handleCopy = () => {
    if (!message.text?.trim()) return;
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isAssistant = message.role === "assistant";

  return (
    <div
      className={`${styles.bubbleWrapper} ${
        isAssistant ? styles.left : styles.right
      }`}
    >
      <div
        className={`${styles.bubble} ${
          isAssistant ? styles.assistant : styles.user
        }`}
      >
        <div className={styles.text}>{message.text}</div>
        {isAssistant && message.streaming && (
          <div className={styles.streaming}>
            <StreamLoader />
          </div>
        )}
        {clientTime && <div className={styles.time}>{clientTime}</div>}
      </div>

      {isAssistant && (
        <button
          className={`${styles.copyFloating} ${copied ? styles.copied : ""}`}
          onClick={handleCopy}
          title="Copy message"
        >
          {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
        </button>
      )}
    </div>
  );
}

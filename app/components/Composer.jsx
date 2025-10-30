import React, { useRef, useEffect } from "react";
import { FiSend, FiStopCircle } from "react-icons/fi";
import styles from "./Composer.module.scss";

export default function Composer({
  value,
  onChange,
  onSend,
  disabled,
  onStop,
}) {
  const taRef = useRef(null);

  useEffect(() => {
    // to avoid layout jitter
    const id = requestAnimationFrame(() => taRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend(e);
    }
  };

  return (
    <form onSubmit={onSend} className={styles.form}>
      <div className={styles.inputWrap}>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message Gemini..."
          rows={1}
          className={styles.textarea}
          disabled={disabled}
          spellCheck={true}
        />
        <div className={styles.actions}>
          {disabled ? (
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.stopBtn}`}
              onClick={onStop}
              title="Stop"
            >
              <FiStopCircle size={20} />
            </button>
          ) : (
            <button
              type="submit"
              className={`${styles.iconBtn} ${
                !value.trim() ? styles.disabled : ""
              }`}
              disabled={!value.trim()}
              title="Send"
            >
              <FiSend size={20} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

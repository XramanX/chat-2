import React, { useEffect, useState } from "react";
import styles from "./StreamLoader.module.scss";

export default function StreamLoader() {
  const [phase, setPhase] = useState(0);

  // Phase timeline
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 3000),
      setTimeout(() => setPhase(2), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const text =
    phase === 0
      ? "Thinking…"
      : phase === 1
      ? "Still working on it…"
      : "This might take a little while ⏳";

  return (
    <div className={styles.loader}>
      <div className={styles.dotPulse}></div>
      <span className={styles.text}>{text}</span>
    </div>
  );
}

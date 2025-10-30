import { useState, useEffect } from "react";
import Modal from "./Modal";
import styles from "./NewChatModal.module.scss";

export default function NewChatModal({ open, onClose, onConfirm }) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) setName("");
  }, [open]);

  const handleConfirm = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    setName("");
  };

  const handleClose = () => {
    setName("");
    onClose?.();
  };

  return (
    <Modal title="Create New Chat" open={open} onClose={handleClose}>
      <div className={styles.wrapper}>
        <label className={styles.label}>Chat name</label>
        <input
          type="text"
          placeholder="Enter a name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
          className={styles.input}
          autoFocus
        />

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={handleClose}>
            Cancel
          </button>
          <button
            className={styles.createBtn}
            onClick={handleConfirm}
            disabled={!name.trim()}
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}

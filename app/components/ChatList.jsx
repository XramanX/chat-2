import React, { useEffect, useState, useRef } from "react";
import { getChatList, createNewChat, deleteChat } from "../utils/chatStorage";
import { FiMessageCircle, FiPlus, FiTrash2 } from "react-icons/fi";
import NewChatModal from "./NewChatModal";
import styles from "./ChatList.module.scss";

export default function ChatList({ currentChatId, onSelect, onClose }) {
  const [chats, setChats] = useState([]);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const mountedRef = useRef(true);
  const rootRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    refreshList();
    return () => (mountedRef.current = false);
  }, []);

  async function refreshList() {
    const list = await getChatList();
    const deduped = Array.from(new Map(list.map((c) => [c.id, c])).values());
    if (mountedRef.current) setChats(deduped);
  }

  const handleConfirmNewChat = async (chatName) => {
    setCreating(true);
    const newChat = await createNewChat(chatName);
    localStorage.setItem("last_active_chat", newChat.id);
    await refreshList();
    onSelect(newChat.id);
    setCreating(false);
    setModalOpen(false);
    onClose?.();
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    await deleteChat(id);
    const list = await getChatList();
    const deduped = Array.from(new Map(list.map((c) => [c.id, c])).values());
    if (mountedRef.current) setChats(deduped);
    if (id === currentChatId) {
      if (deduped.length) {
        const nextId = deduped[0].id;
        localStorage.setItem("last_active_chat", nextId);
        onSelect(nextId);
      } else {
        localStorage.removeItem("last_active_chat");
        onSelect(null);
      }
    }
  };

  useEffect(() => {
    if (!onClose) return;

    const handlePointerDown = (e) => {
      if (modalOpen) return;

      const root = rootRef.current;
      if (!root) return;

      if (window.innerWidth > 768) return;

      if (!root.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose, modalOpen]);

  return (
    <div className={styles.chatList} ref={rootRef}>
      <div className={styles.header}>
        <h2>Chats</h2>
        <button
          className={styles.newBtn}
          onClick={() => setModalOpen(true)}
          disabled={creating}
          aria-label="Create new chat"
        >
          <FiPlus size={16} />
        </button>
      </div>

      <div className={styles.list}>
        {chats.length ? (
          chats.map((c) => (
            <div
              key={c.id}
              className={`${styles.chatItem} ${
                c.id === currentChatId ? styles.active : ""
              }`}
              onClick={() => {
                onSelect(c.id);
                onClose?.();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onSelect(c.id);
                  onClose?.();
                }
              }}
            >
              <div className={styles.left}>
                <FiMessageCircle className={styles.icon} />
                <span className={styles.title}>
                  {c.title?.trim() || "Untitled Chat"}
                </span>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={(e) => handleDelete(c.id, e)}
                aria-label={`Delete chat ${c.title}`}
              >
                <FiTrash2 />
              </button>
            </div>
          ))
        ) : (
          <div className={styles.empty}>No chats yet</div>
        )}
      </div>

      <NewChatModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmNewChat}
      />
    </div>
  );
}

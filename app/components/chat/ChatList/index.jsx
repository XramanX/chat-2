import React, { useState, useEffect, useRef } from "react";
import {
  getChatList,
  createNewChat,
  deleteChat,
} from "../../../utils/chatStorage";
import { FiMessageCircle, FiPlus, FiTrash2 } from "react-icons/fi";
import NewChatModal from "../../modals/NewChatModal";
import ConfirmModal from "../../modals/ConfirmModal";
import styles from "./ChatList.module.scss";

export default function ChatList({ currentChatId, onSelect }) {
  const [chats, setChats] = useState([]);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [targetChat, setTargetChat] = useState(null);
  const mountedRef = useRef(true);

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
  };

  const handleDeleteClick = (chat, e) => {
    e.stopPropagation();
    setTargetChat(chat);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!targetChat) return;
    await deleteChat(targetChat.id);
    const list = await getChatList();
    const deduped = Array.from(new Map(list.map((c) => [c.id, c])).values());
    if (mountedRef.current) setChats(deduped);
    if (targetChat.id === currentChatId) {
      if (deduped.length) {
        const nextId = deduped[0].id;
        localStorage.setItem("last_active_chat", nextId);
        onSelect(nextId);
      } else {
        localStorage.removeItem("last_active_chat");
        onSelect(null);
      }
    }
    setConfirmOpen(false);
    setTargetChat(null);
  };

  return (
    <div className={styles.chatList}>
      <div className={styles.header}>
        <h2>Chats</h2>
        <button
          className={styles.newBtn}
          onClick={() => setModalOpen(true)}
          disabled={creating}
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
              onClick={() => onSelect(c.id)}
            >
              <div className={styles.left}>
                <FiMessageCircle className={styles.icon} />
                <span className={styles.title}>
                  {c.title?.trim() || "Untitled Chat"}
                </span>
              </div>
              <button
                className={styles.deleteBtn}
                onClick={(e) => handleDeleteClick(c, e)}
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

      <ConfirmModal
        open={confirmOpen}
        title="Delete Chat"
        message={`Are you sure you want to delete “${
          targetChat?.title || "this chat"
        }”?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

import { get, set, del } from "idb-keyval";

const STORE_PREFIX = "chat_";
const META_KEY = "chat_list";

export async function getChatList() {
  try {
    return (await get(META_KEY)) || [];
  } catch (e) {
    console.warn("getChatList error", e);
    return [];
  }
}

async function saveChatList(list) {
  try {
    await set(META_KEY, list);
  } catch (e) {
    console.warn("saveChatList error", e);
  }
}

export async function saveChat(chatId, data) {
  try {
    await set(`${STORE_PREFIX}${chatId}`, data);
  } catch (e) {
    console.warn("saveChat error", e);
  }
}

export async function loadChat(chatId) {
  try {
    return (await get(`${STORE_PREFIX}${chatId}`)) || null;
  } catch (e) {
    console.warn("loadChat error", e);
    return null;
  }
}

export async function deleteChat(chatId) {
  try {
    await del(`${STORE_PREFIX}${chatId}`);
    const list = await getChatList();
    const updated = list.filter((c) => c.id !== chatId);
    await saveChatList(updated);
    return true;
  } catch (e) {
    console.warn("deleteChat error", e);
    return false;
  }
}

export async function createNewChat(title = "New Chat") {
  try {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const chat = {
      id,
      title,
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: "m0",
          role: "assistant",
          text: "Hi — ask me anything.",
          streaming: false,
          ts: Date.now(),
        },
      ],
    };

    const list = await getChatList();
    const deduped = [
      { id: chat.id, title: chat.title, createdAt: chat.createdAt },
      ...list.filter((c) => c.id !== chat.id),
    ];
    await saveChatList(deduped);
    await saveChat(chat.id, chat);
    return chat;
  } catch (e) {
    console.warn("createNewChat error", e);
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      title,
      createdAt: new Date().toISOString(),
      messages: [
        {
          id: "m0",
          role: "assistant",
          text: "Hi — ask me anything.",
          streaming: false,
          ts: Date.now(),
        },
      ],
    };
  }
}

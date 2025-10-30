# 💬 Gemini Chat

A lightweight, **ChatGPT-style AI chat app** built with **Next.js** and **Google Gemini API (SSE)**.  
It delivers smooth real-time streaming, persistent local chats, and a modern, rounded UI.

---

## ✨ Overview

Gemini Chat provides an elegant conversational interface powered by Google’s Gemini models.  
It’s designed to replicate the smooth, minimal experience of ChatGPT — completely client-side.

---

## ⚙️ Setup

1. **Install dependencies** — Run your package manager to install all dependencies.
2. **Create `.env.local`** — Add your Gemini API key and model details (refer to `.env.example`).
3. **Run locally** — Start the Next.js development server and open it in your browser.

---

## 💡 Key Features

### 🔄 Real-time Streaming

- Seamless word-by-word response updates using Server-Sent Events (SSE).
- Built-in stop control with graceful cancellation.

### 💾 Local Persistence

- All chats stored locally using IndexedDB — no backend required.
- Supports multiple chat threads with create, delete, and rename.
- Recovers your last active chat automatically after refresh.

### 💬 Modern Chat UI

- Soft, rounded design with smooth shadows and gradients.
- Dynamic loading indicators and responsive layout.
- Sidebar with mobile drawer and icon-based navigation.

### 🪄 Modals & Interactions

- Reusable modals for new chat creation and delete confirmations.
- Centered, portal-based design for accessibility and clarity.

### 🧠 Architecture

- Modular and scalable file structure (chat components, modals, UI atoms).
- Optimized for performance with requestAnimationFrame batching.
- Client-only — no server dependencies required for local use.

---

## 📂 Structure

Organized for clarity and future scaling:

- **components/** — chat UI, modals, and reusable UI parts
- **hooks/** — streaming logic and state management
- **utils/** — data helpers (IndexedDB, SSE parsing)
- **pages/** — main chat page and layout

---

## 🧑‍💻 Developer Notes

- Uses environment variables (`NEXT_PUBLIC_...`) for safe configuration.
- `.env.local` overrides `.env.example` automatically in Next.js.
- Hydration safety and client-only rendering ensured throughout.

---

## 🧾 License

**MIT License** — free for personal and commercial use.  
Attribution appreciated.

---

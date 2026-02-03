const OLLAMA_BASE_URL = "http://localhost:11434";
// Поменяйте имя модели на ту, что установлена у вас в Ollama
const OLLAMA_MODEL = "llama3.1:8b";

document.addEventListener("DOMContentLoaded", () => {
  const widget = document.getElementById("chatWidget");
  if (!widget) return;

  const header = document.getElementById("chatWidgetHeader") || widget;
  const messagesEl = document.getElementById("chatMessages");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const sendBtn = form ? form.querySelector(".chat-send-btn") : null;

  if (!messagesEl || !form || !input) return;

  let isSending = false;
  let pendingMessageEl = null;

  const scrollToBottom = () => {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const appendMessage = (text, role = "bot", options = {}) => {
    const el = document.createElement("div");
    el.classList.add("chat-message");

    if (role === "user") {
      el.classList.add("chat-message--user");
    } else if (role === "system") {
      el.classList.add("chat-message--system");
    } else {
      el.classList.add("chat-message--bot");
    }

    if (options.pending) {
      el.dataset.pending = "true";
    }

    el.textContent = text;
    messagesEl.appendChild(el);
    scrollToBottom();
    return el;
  };

  const setSendingState = (sending) => {
    isSending = sending;
    if (sendBtn) sendBtn.disabled = sending;
    input.disabled = sending;
  };

  const toggleCollapsed = () => {
    widget.classList.toggle("chat-widget--collapsed");
  };

  // Клик по шапке — свернуть/развернуть чат
  header.addEventListener("click", (event) => {
    // Если кликнули по кнопке отправки формы, не сворачиваем
    const target = event.target;
    if (target.closest && target.closest("form")) return;
    toggleCollapsed();
  });

  // Приветственное сообщение
  if (!widget.dataset.greeted) {
    appendMessage(
      "Привет, я виртуальный ассистент NEON TOUCH. Напишите, какой массаж вас интересует или задайте любой вопрос.",
      "bot"
    );
    widget.dataset.greeted = "true";
  }

  const callOllama = async (text) => {
    const url = `${OLLAMA_BASE_URL.replace(/\/$/, "")}/api/chat`;

    const body = {
      model: OLLAMA_MODEL,
      messages: [
        {
          role: "user",
          content: text,
        },
      ],
      stream: false,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Формат ответа Ollama: { message: { role, content }, ... }
    if (data && data.message && typeof data.message.content === "string") {
      return data.message.content;
    }

    // На всякий случай пробуем другие поля
    if (typeof data.response === "string") {
      return data.response;
    }

    return JSON.stringify(data);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || isSending) return;

    // Если чат был свёрнут — раскрываем при отправке
    if (widget.classList.contains("chat-widget--collapsed")) {
      widget.classList.remove("chat-widget--collapsed");
    }

    appendMessage(text, "user");
    input.value = "";

    setSendingState(true);
    if (pendingMessageEl) {
      pendingMessageEl.remove();
    }
    pendingMessageEl = appendMessage("Модель думает…", "bot", {
      pending: true,
    });

    try {
      const reply = await callOllama(text);

      if (pendingMessageEl) {
        pendingMessageEl.remove();
        pendingMessageEl = null;
      }

      appendMessage(reply, "bot");
    } catch (error) {
      console.error("Ошибка при обращении к Ollama:", error);
      if (pendingMessageEl) {
        pendingMessageEl.remove();
        pendingMessageEl = null;
      }

      appendMessage(
        "Не удалось получить ответ от модели. Убедитесь, что Ollama запущен и разрешён доступ из браузера (CORS).",
        "system"
      );
    } finally {
      setSendingState(false);
    }
  };

  form.addEventListener("submit", handleSubmit);
})


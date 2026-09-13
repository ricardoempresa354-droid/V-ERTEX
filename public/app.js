let token = localStorage.getItem("vertex_token");
let me = null;
let chats = [];
let currentChat = null;
let projects = [];
let currentPage = "chat";

const app = document.getElementById("app");

// =====================================================
// API
// =====================================================

async function api(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.error || "Ocorreu um erro.");
  }

  return data;
}

// =====================================================
// UTILIDADES
// =====================================================

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function initials(name = "VÉRTEX") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

function formatDate(date) {
  if (!date) return "";

  const d = new Date(date.replace(" ", "T") + "Z");

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

function showToast(message) {
  let toast = document.getElementById("vertex-toast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "vertex-toast";
    toast.className = "vertex-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// =====================================================
// LOGIN
// =====================================================

function renderLogin() {
  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">

        <div class="auth-logo">
          <div class="vertex-logo-large">
            <svg viewBox="0 0 100 100">
              <path
                d="M15 15 L36 15 L50 48 L64 15 L85 15 L59 70 L50 88 L41 70 Z"
              />
              <path
                d="M55 42 L70 42 L60 58 L67 58 L45 82 L51 61 L43 61 Z"
              />
            </svg>
          </div>
        </div>

        <h1>VÉRTEX AI</h1>
        <p class="auth-subtitle">
          Seu assistente inteligente para o digital.
        </p>

        <form id="login-form">

          <div class="input-group">
            <label>E-mail</label>
            <input
              id="login-email"
              type="email"
              placeholder="Seu e-mail"
              autocomplete="email"
              required
            >
          </div>

          <div class="input-group">
            <label>Senha</label>
            <input
              id="login-password"
              type="password"
              placeholder="Sua senha"
              autocomplete="current-password"
              required
            >
          </div>

          <button class="primary-button" type="submit">
            Entrar
          </button>

        </form>

        <div class="auth-divider">
          <span>ou</span>
        </div>

        <button class="secondary-button" id="show-register">
          Criar conta
        </button>

        <div id="auth-error"></div>

      </div>
    </div>
  `;

  document
    .getElementById("login-form")
    .addEventListener("submit", login);

  document
    .getElementById("show-register")
    .addEventListener("click", renderRegister);
}

// =====================================================
// CADASTRO
// =====================================================

function renderRegister() {
  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">

        <div class="auth-logo">
          <div class="vertex-logo-large">
            <svg viewBox="0 0 100 100">
              <path
                d="M15 15 L36 15 L50 48 L64 15 L85 15 L59 70 L50 88 L41 70 Z"
              />
              <path
                d="M55 42 L70 42 L60 58 L67 58 L45 82 L51 61 L43 61 Z"
              />
            </svg>
          </div>
        </div>

        <h1>Criar conta</h1>
        <p class="auth-subtitle">
          Comece sua jornada com o VÉRTEX.
        </p>

        <form id="register-form">

          <div class="input-group">
            <label>Nome</label>
            <input
              id="register-name"
              type="text"
              placeholder="Seu nome"
              required
            >
          </div>

          <div class="input-group">
            <label>E-mail</label>
            <input
              id="register-email"
              type="email"
              placeholder="Seu e-mail"
              required
            >
          </div>

          <div class="input-group">
            <label>Senha</label>
            <input
              id="register-password"
              type="password"
              placeholder="Mínimo de 6 caracteres"
              minlength="6"
              required
            >
          </div>

          <button class="primary-button" type="submit">
            Criar minha conta
          </button>

        </form>

        <button class="text-button" id="back-login">
          Já tenho uma conta
        </button>

        <div id="auth-error"></div>

      </div>
    </div>
  `;

  document
    .getElementById("register-form")
    .addEventListener("submit", register);

  document
    .getElementById("back-login")
    .addEventListener("click", renderLogin);
}

async function login(event) {
  event.preventDefault();

  const email = document
    .getElementById("login-email")
    .value
    .trim();

  const password = document
    .getElementById("login-password")
    .value;

  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password
      })
    });

    token = data.token;
    me = data.user;

    localStorage.setItem("vertex_token", token);

    await startApp();
  } catch (error) {
    const box = document.getElementById("auth-error");

    if (box) {
      box.innerHTML = `
        <div class="auth-error">
          ${escapeHTML(error.message)}
        </div>
      `;
    }
  }
}

async function register(event) {
  event.preventDefault();

  const name = document
    .getElementById("register-name")
    .value
    .trim();

  const email = document
    .getElementById("register-email")
    .value
    .trim();

  const password = document
    .getElementById("register-password")
    .value;

  try {
    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password
      })
    });

    token = data.token;
    me = data.user;

    localStorage.setItem("vertex_token", token);

    await startApp();
  } catch (error) {
    const box = document.getElementById("auth-error");

    if (box) {
      box.innerHTML = `
        <div class="auth-error">
          ${escapeHTML(error.message)}
        </div>
      `;
    }
  }
}

// =====================================================
// INICIALIZAÇÃO
// =====================================================

async function startApp() {
  try {
    const meData = await api("/api/me");

    me = meData.user;

    await Promise.all([
      loadChats(),
      loadProjects()
    ]);

    renderApp();

    if (chats.length > 0) {
      await openChat(chats[0].id);
    } else {
      await createNewChat(false);
    }

  } catch (error) {
    console.error(error);

    token = null;
    me = null;

    localStorage.removeItem("vertex_token");

    renderLogin();
  }
}

async function loadChats() {
  const data = await api("/api/chats");
  chats = data.chats || [];
}

async function loadProjects() {
  try {
    const data = await api("/api/projects");
    projects = data.projects || [];
  } catch {
    projects = [];
  }
}

// =====================================================
// APP PRINCIPAL
// =====================================================

function renderApp() {
  app.innerHTML = `
    <div class="app-shell">

      <aside class="sidebar" id="sidebar">

        <div class="sidebar-header">

          <div class="brand">
            <div class="vertex-logo-small">
              <svg viewBox="0 0 100 100">
                <path
                  d="M15 15 L36 15 L50 48 L64 15 L85 15 L59 70 L50 88 L41 70 Z"
                />
                <path
                  d="M55 42 L70 42 L60 58 L67 58 L45 82 L51 61 L43 61 Z"
                />
              </svg>
            </div>

            <div>
              <strong>VÉRTEX</strong>
              <span>AI</span>
            </div>
          </div>

          <button
            class="close-sidebar"
            id="close-sidebar"
            aria-label="Fechar menu"
          >
            ×
          </button>

        </div>

        <button class="new-chat-button" id="new-chat">
          <span>＋</span>
          Nova conversa
        </button>

        <nav class="main-nav">

          <button
            class="nav-item active"
            data-page="chat"
          >
            <span>⌁</span>
            VÉRTEX AI
          </button>

          <button
            class="nav-item"
            data-page="history"
          >
            <span>◷</span>
            Histórico
          </button>

          <button
            class="nav-item"
            data-page="projects"
          >
            <span>□</span>
            Projetos
          </button>

          <button
            class="nav-item"
            data-page="plans"
          >
            <span>◇</span>
            Planos
          </button>

          <button
            class="nav-item"
            data-page="settings"
          >
            <span>⚙</span>
            Configurações
          </button>

        </nav>

        <div class="sidebar-bottom">

          <div class="user-mini">

            <div class="user-avatar">
              ${escapeHTML(initials(me?.name))}
            </div>

            <div class="user-info">
              <strong>
                ${escapeHTML(me?.name || "Usuário")}
              </strong>

              <span>
                ${escapeHTML(me?.plan || "FREE")}
              </span>
            </div>

          </div>

        </div>

      </aside>

      <main class="main-area">

        <header class="topbar">

          <button
            class="menu-button"
            id="open-sidebar"
            aria-label="Abrir menu"
          >
            ☰
          </button>

          <div class="topbar-title">
            <strong>VÉRTEX AI</strong>
          </div>

          <button
            class="topbar-user"
            id="topbar-user"
          >
            ${escapeHTML(initials(me?.name))}
          </button>

        </header>

        <section
          class="page-container"
          id="page-container"
        ></section>

      </main>

    </div>

    <div
      class="sidebar-overlay"
      id="sidebar-overlay"
    ></div>
  `;

  bindNavigation();
  bindSidebar();

  showPage("chat");
}

// =====================================================
// NAVEGAÇÃO
// =====================================================

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
      showPage(button.dataset.page);

      if (window.innerWidth <= 850) {
        closeSidebar();
      }
    });
  });

  document
    .getElementById("new-chat")
    .addEventListener("click", async () => {
      await createNewChat(true);

      if (window.innerWidth <= 850) {
        closeSidebar();
      }
    });

  document
    .getElementById("topbar-user")
    .addEventListener("click", () => {
      showPage("settings");
    });
}

function showPage(page) {
  currentPage = page;

  document
    .querySelectorAll(".nav-item")
    .forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.page === page
      );
    });

  const container =
    document.getElementById("page-container");

  if (!container) return;

  if (page === "chat") {
    renderChatPage();
  }

  if (page === "history") {
    renderHistoryPage();
  }

  if (page === "projects") {
    renderProjectsPage();
  }

  if (page === "plans") {
    renderPlansPage();
  }

  if (page === "settings") {
    renderSettingsPage();
  }
}

// =====================================================
// SIDEBAR MOBILE
// =====================================================

function bindSidebar() {
  document
    .getElementById("open-sidebar")
    .addEventListener("click", openSidebar);

  document
    .getElementById("close-sidebar")
    .addEventListener("click", closeSidebar);

  document
    .getElementById("sidebar-overlay")
    .addEventListener("click", closeSidebar);
}

function openSidebar() {
  document
    .getElementById("sidebar")
    ?.classList.add("open");

  document
    .getElementById("sidebar-overlay")
    ?.classList.add("show");
}

function closeSidebar() {
  document
    .getElementById("sidebar")
    ?.classList.remove("open");

  document
    .getElementById("sidebar-overlay")
    ?.classList.remove("show");
}

// =====================================================
// CHAT
// =====================================================

function renderChatPage() {
  const container =
    document.getElementById("page-container");

  if (!container) return;

  container.innerHTML = `
    <div class="chat-page">

      <div class="chat-header">

        <div>
          <h1>
            ${escapeHTML(
              currentChat?.title || "VÉRTEX AI"
            )}
          </h1>

          <span>
            Assistente inteligente
          </span>
        </div>

        <button
          class="chat-options"
          id="chat-options"
          aria-label="Opções"
        >
          ⋮
        </button>

      </div>

      <div
        class="messages-area"
        id="messages-area"
      ></div>

      <div class="chat-bottom">

        <div
          class="suggestions"
          id="suggestions"
        >
          <button data-prompt="Me ajude a começar do zero no marketing digital.">
            🚀 Começar do zero
          </button>

          <button data-prompt="Crie um anúncio completo para uma oferta de renda extra.">
            🎯 Criar anúncio
          </button>

          <button data-prompt="Crie 7 ideias de posts para Instagram sobre renda extra.">
            📱 Posts
          </button>

          <button data-prompt="Crie uma copy persuasiva para uma oferta digital.">
            ✍️ Copy
          </button>
        </div>

        <form
          class="composer"
          id="composer"
        >

          <button
            type="button"
            class="plus-button"
            id="plus-button"
            aria-label="Mais opções"
          >
            +
          </button>

          <textarea
            id="message-input"
            rows="1"
            placeholder="Pergunte qualquer coisa ao VÉRTEX..."
          ></textarea>

          <button
            type="submit"
            class="send-button"
            aria-label="Enviar"
          >
            ↑
          </button>

        </form>

        <div
          class="plus-menu"
          id="plus-menu"
        >

          <button data-action="projects">
            <span>📁</span>
            <div>
              <strong>Projetos</strong>
              <small>Organize seus trabalhos</small>
            </div>
          </button>

          <button data-action="history">
            <span>🕘</span>
            <div>
              <strong>Histórico</strong>
              <small>Veja suas conversas</small>
            </div>
          </button>

          <button data-action="plans">
            <span>💳</span>
            <div>
              <strong>Planos</strong>
              <small>Veja seus recursos</small>
            </div>
          </button>

          <button data-action="settings">
            <span>⚙️</span>
            <div>
              <strong>Configurações</strong>
              <small>Personalize sua conta</small>
            </div>
          </button>

        </div>

        <p class="composer-note">
          O VÉRTEX pode cometer erros. Confira informações importantes.
        </p>

      </div>

    </div>
  `;

  renderMessages();
  bindChatEvents();
}

function renderMessages() {
  const area =
    document.getElementById("messages-area");

  if (!area) return;

  const messages = currentChat?.messages || [];

  if (!messages.length) {
    area.innerHTML = `
      <div class="welcome-screen">

        <div class="welcome-logo">
          <svg viewBox="0 0 100 100">
            <path
              d="M15 15 L36 15 L50 48 L64 15 L85 15 L59 70 L50 88 L41 70 Z"
            />
            <path
              d="M55 42 L70 42 L60 58 L67 58 L45 82 L51 61 L43 61 Z"
            />
          </svg>
        </div>

        <h2>Como posso ajudar?</h2>

        <p>
          Eu sou o VÉRTEX. Vamos transformar suas ideias
          em ações no digital.
        </p>

      </div>
    `;

    return;
  }

  area.innerHTML = messages
    .map(message => {
      if (message.role === "user") {
        return `
          <div class="message-row message-user">

            <div class="message-bubble">
              ${formatMessage(message.content)}
            </div>

            <div class="user-message-avatar">
              ${escapeHTML(initials(me?.name))}
            </div>

          </div>
        `;
      }

      return `
        <div class="message-row message-vertex">

          <div class="vertex-avatar">
            <svg viewBox="0 0 100 100">
              <path
                d="M15 15 L36 15 L50 48 L64 15 L85 15 L59 70 L50 88 L41 70 Z"
              />
              <path
                d="M55 42 L70 42 L60 58 L67 58 L45 82 L51 61 L43 61 Z"
              />
            </svg>
          </div>

          <div class="message-bubble">
            ${formatMessage(message.content)}
          </div>

        </div>
      `;
    })
    .join("");

  area.scrollTop = area.scrollHeight;
}

function formatMessage(text) {
  let safe = escapeHTML(text || "");

  safe = safe.replace(
    /```([\s\S]*?)```/g,
    "<pre><code>$1</code></pre>"
  );

  safe = safe.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  safe = safe.replace(
    /\n/g,
    "<br>"
  );

  return safe;
}

function bindChatEvents() {
  const composer =
    document.getElementById("composer");

  const input =
    document.getElementById("message-input");

  const plusButton =
    document.getElementById("plus-button");

  const plusMenu =
    document.getElementById("plus-menu");

  if (composer) {
    composer.addEventListener(
      "submit",
      sendMessage
    );
  }

  if (input) {
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height =
        Math.min(input.scrollHeight, 160) + "px";
    });

    input.addEventListener("keydown", event => {
      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        composer?.requestSubmit();
      }
    });
  }

  if (plusButton) {
    plusButton.addEventListener("click", event => {
      event.stopPropagation();

      plusMenu?.classList.toggle("show");
    });
  }

  plusMenu
    ?.querySelectorAll("button")
    .forEach(button => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;

        plusMenu.classList.remove("show");

        if (action) {
          showPage(action);
        }
      });
    });

  document
    .querySelectorAll(".suggestions button")
    .forEach(button => {
      button.addEventListener("click", () => {
        const input =
          document.getElementById("message-input");

        if (!input) return;

        input.value =
          button.dataset.prompt || "";

        input.focus();

        input.style.height = "auto";
        input.style.height =
          Math.min(input.scrollHeight, 160) + "px";
      });
    });

  document.addEventListener(
    "click",
    closePlusMenuOnOutside
  );
}

function closePlusMenuOnOutside(event) {
  const menu =
    document.getElementById("plus-menu");

  const button =
    document.getElementById("plus-button");

  if (!menu || !button) return;

  if (
    !menu.contains(event.target) &&
    !button.contains(event.target)
  ) {
    menu.classList.remove("show");
  }
}

// =====================================================
// ENVIAR MENSAGEM
// =====================================================

async function sendMessage(event) {
  event.preventDefault();

  if (!currentChat) {
    await createNewChat(false);
  }

  const input =
    document.getElementById("message-input");

  if (!input) return;

  const text = input.value.trim();

  if (!text) return;

  input.value = "";
  input.style.height = "auto";

  const area =
    document.getElementById("messages-area");

  if (!area) return;

  // Remove tela de boas-vindas
  const welcome =
    area.querySelector(".welcome-screen");

  welcome?.remove();

  // Adiciona mensagem imediatamente
  currentChat.messages =
    currentChat.messages || [];

  currentChat.messages.push({
    role: "user",
    content: text,
    created_at: new Date().toISOString()
  });

  renderMessages();

  // Indicador de carregamento
  const loading = document.createElement("div");

  loading.className =
    "message-row message-vertex typing-row";

  loading.innerHTML = `
    <div class="vertex-avatar">
      <svg viewBox="0 0 100 100">
        <path
          d="M15 15 L36 15 L50 48 L64 15 L85 15 L59 70 L50 88 L41 70 Z"
        />
        <path
          d="M55 42 L70 42 L60 58 L67 58 L45 82 L51 61 L43 61 Z"
        />
      </svg>
    </div>

    <div class="message-bubble typing-bubble">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  area.appendChild(loading);
  area.scrollTop = area.scrollHeight;

  try {
    const data = await api("/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({
        chat_id: currentChat.id,
        message: text
      })
    });

    loading.remove();

    currentChat.messages.push({
      role: "assistant",
      content:
        data.message ||
        "Não consegui gerar uma resposta.",
      created_at: new Date().toISOString()
    });

    await loadChats();

    const updatedChat =
      chats.find(
        chat => chat.id === currentChat.id
      );

    if (updatedChat) {
      currentChat.title =
        updatedChat.title;
    }

    renderMessages();

  } catch (error) {
    loading.remove();

    currentChat.messages.push({
      role: "assistant",
      content:
        "Não consegui responder agora. Tente novamente em alguns segundos.",
      created_at: new Date().toISOString()
    });

    renderMessages();

    showToast(error.message);
  }
}

// =====================================================
// NOVA CONVERSA
// =====================================================

async function createNewChat(show = true) {
  try {
    const data = await api("/api/chats", {
      method: "POST",
      body: JSON.stringify({
        title: "Nova conversa"
      })
    });

    currentChat = {
      ...data.chat,
      messages: []
    };

    await loadChats();

    if (show) {
      showPage("chat");
    }

  } catch (error) {
    showToast(error.message);
  }
}

// =====================================================
// ABRIR CONVERSA
// =====================================================

async function openChat(id) {
  try {
    const data = await api(
      `/api/chats/${id}`
    );

    currentChat = {
      ...data.chat,
      messages: data.messages || []
    };

    showPage("chat");

  } catch (error) {
    showToast(error.message);
  }
}

// =====================================================
// HISTÓRICO
// =====================================================

function renderHistoryPage() {
  const container =
    document.getElementById("page-container");

  if (!container) return;

  container.innerHTML = `
    <div class="content-page">

      <div class="page-heading">
        <div>
          <h1>Histórico</h1>
          <p>
            Suas conversas ficam salvas aqui.
          </p>
        </div>

        <button
          class="primary-small-button"
          id="history-new-chat"
        >
          + Nova conversa
        </button>
      </div>

      <div
        class="history-list"
        id="history-list"
      >
        <div class="loading-card">
          Carregando histórico...
        </div>
      </div>

    </div>
  `;

  loadHistoryPage();
}

async function loadHistoryPage() {
  const list =
    document.getElementById("history-list");

  if (!list) return;

  try {
    const data =
      await api("/api/history");

    const history =
      data.history || [];

    if (!history.length) {
      list.innerHTML = `
        <div class="empty-card">
          <div class="empty-icon">🕘</div>
          <h3>Nenhuma conversa ainda</h3>
          <p>
            Comece uma conversa com o VÉRTEX.
          </p>
        </div>
      `;
      return;
    }

    list.innerHTML = history
      .map(item => `
        <div
          class="history-item"
          data-chat-id="${item.id}"
        >

          <div class="history-icon">
            💬
          </div>

          <div class="history-info">
            <strong>
              ${escapeHTML(item.title)}
            </strong>

            <span>
              ${item.message_count || 0}
              mensagens ·
              ${formatDate(item.updated_at)}
            </span>
          </div>

          <button
            class="history-delete"
            data-delete-chat="${item.id}"
            title="Excluir"
          >
            🗑
          </button>

        </div>
      `)
      .join("");

    list
      .querySelectorAll(".history-item")
      .forEach(item => {
        item.addEventListener("click", event => {
          if (
            event.target.closest(
              "[data-delete-chat]"
            )
          ) {
            return;
          }

          openChat(
            Number(item.dataset.chatId)
          );
        });
      });

    list
      .querySelectorAll("[data-delete-chat]")
      .forEach(button => {
        button.addEventListener(
          "click",
          async event => {
            event.stopPropagation();

            await deleteChat(
              Number(
                button.dataset.deleteChat
              )
            );
          }
        );
      });

    document
      .getElementById("history-new-chat")
      ?.addEventListener(
        "click",
        () => createNewChat(true)
      );

  } catch (error) {
    list.innerHTML = `
      <div class="error-card">
        ${escapeHTML(error.message)}
      </div>
    `;
  }
}

async function deleteChat(id) {
  const confirmed =
    confirm(
      "Excluir esta conversa?"
    );

  if (!confirmed) return;

  try {
    await api(`/api/chats/${id}`, {
      method: "DELETE"
    });

    if (
      currentChat &&
      currentChat.id === id
    ) {
      currentChat = null;
    }

    await loadChats();

    if (!chats.length) {
      await createNewChat(false);
    }

    showToast("Conversa excluída.");

    renderHistoryPage();

  } catch (error) {
    showToast(error.message);
  }
}

// =====================================================
// PROJETOS
// =====================================================

function renderProjectsPage() {
  const container =
    document.getElementById("page-container");

  if (!container) return;

  container.innerHTML = `
    <div class="content-page">

      <div class="page-heading">
        <div>
          <h1>Projetos</h1>
          <p>
            Organize suas ideias, estratégias e trabalhos.
          </p>
        </div>

        <button
          class="primary-small-button"
          id="new-project"
        >
          + Novo projeto
        </button>
      </div>

      <div
        class="projects-grid"
        id="projects-grid"
      ></div>

    </div>
  `;

  renderProjects();

  document
    .getElementById("new-project")
    ?.addEventListener(
      "click",
      createProject
    );
}

function renderProjects() {
  const grid =
    document.getElementById("projects-grid");

  if (!grid) return;

  if (!projects.length) {
    grid.innerHTML = `
      <div class="empty-card project-empty">
        <div class="empty-icon">📁</div>

        <h3>Nenhum projeto ainda</h3>

        <p>
          Crie um projeto para organizar suas ideias.
        </p>

        <button
          class="primary-small-button"
          id="empty-new-project"
        >
          Criar projeto
        </button>
      </div>
    `;

    document
      .getElementById("empty-new-project")
      ?.addEventListener(
        "click",
        createProject
      );

    return;
  }

  grid.innerHTML = projects
    .map(project => `
      <div class="project-card">

        <div class="project-card-top">
          <div class="project-icon">
            📁
          </div>

          <button
            class="project-delete"
            data-delete-project="${project.id}"
          >
            ⋮
          </button>
        </div>

        <h3>
          ${escapeHTML(project.name)}
        </h3>

        <p>
          ${escapeHTML(
            project.description ||
            "Sem descrição."
          )}
        </p>

        <span class="project-date">
          Criado em ${formatDate(project.created_at)}
        </span>

      </div>
    `)
    .join("");

  grid
    .querySelectorAll(
      "[data-delete-project]"
    )
    .forEach(button => {
      button.addEventListener(
        "click",
        async () => {
          await deleteProject(
            Number(
              button.dataset.deleteProject
            )
          );
        }
      );
    });
}

async function createProject() {
  const name =
    prompt("Nome do projeto:");

  if (!name?.trim()) return;

  const description =
    prompt(
      "Descrição do projeto (opcional):"
    ) || "";

  try {
    const data =
      await api("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description
        })
      });

    projects.unshift(data.project);

    showToast("Projeto criado.");

    renderProjectsPage();

  } catch (error) {
    showToast(error.message);
  }
}

async function deleteProject(id) {
  const confirmed =
    confirm(
      "Excluir este projeto?"
    );

  if (!confirmed) return;

  try {
    await api(`/api/projects/${id}`, {
      method: "DELETE"
    });

    projects =
      projects.filter(
        project => project.id !== id
      );

    showToast("Projeto excluído.");

    renderProjectsPage();

  } catch (error) {
    showToast(error.message);
  }
}

// =====================================================
// PLANOS
// =====================================================

function renderPlansPage() {
  const container =
    document.getElementById("page-container");

  if (!container) return;

  container.innerHTML = `
    <div class="content-page">

      <div class="page-heading">
        <div>
          <h1>Planos</h1>
          <p>
            Escolha o nível de acesso do VÉRTEX.
          </p>
        </div>
      </div>

      <div
        class="plans-grid"
        id="plans-grid"
      >
        <div class="loading-card">
          Carregando planos...
        </div>
      </div>

    </div>
  `;

  loadPlans();
}

async function loadPlans() {
  const grid =
    document.getElementById("plans-grid");

  if (!grid) return;

  try {
    const data =
      await api("/api/plans");

    const plans =
      data.plans || [];

    grid.innerHTML = plans
      .map(plan => {
        const current =
          plan.id === me?.plan;

        return `
          <div
            class="plan-card ${
              current ? "current" : ""
            }"
          >

            ${
              current
                ? `<span class="current-plan">
                    Seu plano
                  </span>`
                : ""
            }

            <h3>
              ${escapeHTML(plan.name)}
            </h3>

            <div class="plan-price">
              ${
                plan.price === 0
                  ? "Grátis"
                  : `R$ ${Number(
                      plan.price
                    ).toFixed(2).replace(".", ",")}`
              }
            </div>

            <p>
              ${escapeHTML(
                plan.description || ""
              )}
            </p>

            <button
              class="${
                current
                  ? "secondary-small-button"
                  : "primary-small-button"
              }"
              ${
                current
                  ? "disabled"
                  : ""
              }
            >
              ${
                current
                  ? "Plano atual"
                  : "Escolher plano"
              }
            </button>

          </div>
        `;
      })
      .join("");

  } catch (error) {
    grid.innerHTML = `
      <div class="error-card">
        ${escapeHTML(error.message)}
      </div>
    `;
  }
}

// =====================================================
// CONFIGURAÇÕES
// =====================================================

function renderSettingsPage() {
  const container =
    document.getElementById("page-container");

  if (!container) return;

  container.innerHTML = `
    <div class="content-page">

      <div class="page-heading">
        <div>
          <h1>Configurações</h1>
          <p>
            Gerencie sua conta do VÉRTEX.
          </p>
        </div>
      </div>

      <div class="settings-card">

        <div class="settings-profile">

          <div class="settings-avatar">
            ${escapeHTML(
              initials(me?.name)
            )}
          </div>

          <div>
            <h3>
              ${escapeHTML(
                me?.name || "Usuário"
              )}
            </h3>

            <p>
              ${escapeHTML(
                me?.email || ""
              )}
            </p>
          </div>

        </div>

        <div class="settings-row">
          <div>
            <strong>Plano atual</strong>
            <span>
              ${escapeHTML(
                me?.plan || "FREE"
              )}
            </span>
          </div>
        </div>

        <div class="settings-row">
          <div>
            <strong>Assistente</strong>
            <span>
              VÉRTEX AI
            </span>
          </div>
        </div>

        <button
          class="logout-button"
          id="logout"
        >
          Sair da conta
        </button>

      </div>

    </div>
  `;

  document
    .getElementById("logout")
    ?.addEventListener(
      "click",
      logout
    );
}

// =====================================================
// LOGOUT
// =====================================================

function logout() {
  token = null;
  me = null;
  chats = [];
  currentChat = null;
  projects = [];

  localStorage.removeItem(
    "vertex_token"
  );

  renderLogin();
}

// =====================================================
// INÍCIO
// =====================================================

if (token) {
  startApp();
} else {
  renderLogin();
}

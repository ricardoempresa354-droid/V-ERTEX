const API = "/api";

let token = localStorage.getItem("vertex_token");
let me = null;
let chats = [];
let currentChatId = null;
let messages = [];
let currentPage = "chat";

const app = document.getElementById("app");

async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(API + path, {
    ...options,
    headers
  });

  let data = {};

  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    throw new Error(data.error || "Ocorreu um erro.");
  }

  return data;
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name) {
  return String(name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(x => x[0])
    .join("")
    .toUpperCase();
}

function vertexIcon(className = "vertex-avatar") {
  return `
    <div class="${className}">
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <path d="M7 7
          L15 7
          L20 22
          L26 7
          L34 7
          L25 33
          L17 33
          Z"></path>
      </svg>
    </div>
  `;
}

/* =========================
   LOGIN
========================= */

function renderLogin() {
  app.innerHTML = `
    <div class="login-page">
      <div class="login-box">

        <div class="login-brand">
          ${vertexIcon("vertex-logo")}
          <h1>VÉRTEX AI</h1>
          <p>Seu assistente de marketing digital</p>
        </div>

        <div class="auth-box">

          <div class="auth-tabs">
            <button class="auth-tab active" id="loginTab">
              Entrar
            </button>

            <button class="auth-tab" id="registerTab">
              Criar conta
            </button>
          </div>

          <div id="authForm"></div>

        </div>
      </div>
    </div>
  `;

  renderLoginForm();

  document.getElementById("loginTab").onclick = () => {
    document.getElementById("loginTab").classList.add("active");
    document.getElementById("registerTab").classList.remove("active");
    renderLoginForm();
  };

  document.getElementById("registerTab").onclick = () => {
    document.getElementById("registerTab").classList.add("active");
    document.getElementById("loginTab").classList.remove("active");
    renderRegisterForm();
  };
}

function renderLoginForm() {
  document.getElementById("authForm").innerHTML = `
    <form id="loginForm">

      <div id="authError"></div>

      <input
        id="email"
        class="input"
        type="email"
        placeholder="Seu e-mail"
        required
      >

      <input
        id="password"
        class="input"
        type="password"
        placeholder="Sua senha"
        required
      >

      <button class="primary-button auth-submit" type="submit">
        Entrar na VÉRTEX
      </button>

    </form>
  `;

  document.getElementById("loginForm").onsubmit = async e => {
    e.preventDefault();

    const error = document.getElementById("authError");
    error.className = "auth-error";
    error.textContent = "";

    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("email").value,
          password: document.getElementById("password").value
        })
      });

      token = data.token;
      localStorage.setItem("vertex_token", token);

      await startApp();
    } catch (err) {
      error.textContent = err.message;
    }
  };
}

function renderRegisterForm() {
  document.getElementById("authForm").innerHTML = `
    <form id="registerForm">

      <div id="authError"></div>

      <input
        id="name"
        class="input"
        placeholder="Seu nome"
        required
      >

      <input
        id="email"
        class="input"
        type="email"
        placeholder="Seu e-mail"
        required
      >

      <input
        id="password"
        class="input"
        type="password"
        placeholder="Crie uma senha"
        minlength="6"
        required
      >

      <button class="primary-button auth-submit" type="submit">
        Criar minha conta
      </button>

    </form>
  `;

  document.getElementById("registerForm").onsubmit = async e => {
    e.preventDefault();

    const error = document.getElementById("authError");
    error.className = "auth-error";
    error.textContent = "";

    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: document.getElementById("name").value,
          email: document.getElementById("email").value,
          password: document.getElementById("password").value
        })
      });

      token = data.token;
      localStorage.setItem("vertex_token", token);

      await startApp();
    } catch (err) {
      error.textContent = err.message;
    }
  };
}

/* =========================
   APP
========================= */

async function startApp() {
  try {
    const data = await api("/me");

    me = data.user;

    await loadChats();

    renderApp();

    if (chats.length) {
      await openChat(chats[0].id);
    } else {
      await newChat();
    }
  } catch {
    token = null;
    localStorage.removeItem("vertex_token");
    renderLogin();
  }
}

async function loadChats() {
  const data = await api("/chats");
  chats = data.chats || [];
}

function renderApp() {
  app.innerHTML = `
    <div class="app-shell">

      <aside class="sidebar" id="sidebar">

        <div class="sidebar-top">

          <div class="brand">
            ${vertexIcon("vertex-logo")}
            <span>VÉRTEX AI</span>
          </div>

          <button class="new-chat" id="newChat">
            ＋ Nova conversa
          </button>

        </div>

        <nav class="sidebar-nav">

          <button class="nav-item active" data-page="chat">
            💬 Chat
          </button>

          <button class="nav-item" data-page="history">
            🕘 Histórico
          </button>

          <button class="nav-item" data-page="projects">
            📁 Projetos
          </button>

          <button class="nav-item" data-page="plans">
            💳 Planos
          </button>

          <button class="nav-item" data-page="settings">
            ⚙️ Configurações
          </button>

        </nav>

        <div class="chat-list">

          <div class="chat-list-title">
            CONVERSAS
          </div>

          <div id="chatList"></div>

        </div>

        <div class="sidebar-user">

          <div class="user-avatar">
            ${initials(me?.name)}
          </div>

          <div class="user-info">
            <div class="user-name">
              ${escapeHtml(me?.name)}
            </div>

            <div class="user-plan">
              Plano ${escapeHtml(me?.plan || "FREE")}
            </div>
          </div>

        </div>

      </aside>

      <div
        class="sidebar-overlay"
        id="sidebarOverlay"
      ></div>

      <main class="main">

        <header class="topbar">

          <div class="topbar-left">

            <button
              class="menu-button mobile-menu"
              id="mobileMenu"
            >
              ☰
            </button>

            <div class="topbar-logo">
              ${vertexIcon("vertex-logo")}
              <strong>VÉRTEX AI</strong>
            </div>

          </div>

          <div class="topbar-right">

            <div class="user-avatar">
              ${initials(me?.name)}
            </div>

          </div>

        </header>

        <section class="content" id="content"></section>

      </main>

    </div>
  `;

  document.getElementById("newChat").onclick = newChat;

  document.getElementById("mobileMenu").onclick = () => {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("sidebarOverlay").classList.add("open");
  };

  document.getElementById("sidebarOverlay").onclick = closeMobileMenu;

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.onclick = () => {
      currentPage = btn.dataset.page;
      updateNav();
      renderPage();
      closeMobileMenu();
    };
  });

  updateNav();
  renderPage();
  renderChatList();
}

function closeMobileMenu() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarOverlay")?.classList.remove("open");
}

function updateNav() {
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.classList.toggle(
      "active",
      btn.dataset.page === currentPage
    );
  });
}

/* =========================
   CHAT
========================= */

function renderPage() {
  if (currentPage === "chat") {
    renderChat();
  }

  if (currentPage === "history") {
    renderHistory();
  }

  if (currentPage === "projects") {
    renderProjects();
  }

  if (currentPage === "plans") {
    renderPlans();
  }

  if (currentPage === "settings") {
    renderSettings();
  }
}

function renderChat() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="chat-page">

      <div class="welcome" id="welcome"></div>

      <div
        class="messages"
        id="messages"
        style="display:none"
      ></div>

      <div class="composer-area">

        <div class="composer">

          <div class="plus-wrap">

            <button
              class="plus-button"
              id="plusButton"
            >
              +
            </button>

            <div class="plus-menu" id="plusMenu">

              <button
                class="plus-option"
                data-action="projects"
              >
                📁 Projetos
              </button>

              <button
                class="plus-option"
                data-action="history"
              >
                🕘 Histórico
              </button>

              <button
                class="plus-option"
                data-action="plans"
              >
                💳 Planos
              </button>

              <button
                class="plus-option"
                data-action="settings"
              >
                ⚙️ Configurações
              </button>

            </div>

          </div>

          <textarea
            id="messageInput"
            rows="1"
            placeholder="Pergunte qualquer coisa para a VÉRTEX..."
          ></textarea>

          <button
            class="send-button"
            id="sendButton"
          >
            ↑
          </button>

        </div>

      </div>

    </div>
  `;

  renderWelcomeOrMessages();

  const input = document.getElementById("messageInput");
  const send = document.getElementById("sendButton");
  const plus = document.getElementById("plusButton");
  const menu = document.getElementById("plusMenu");

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height =
      Math.min(input.scrollHeight, 160) + "px";

    send.disabled = !input.value.trim();
  });

  input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      if (input.value.trim()) {
        sendMessage();
      }
    }
  });

  send.onclick = sendMessage;

  plus.onclick = e => {
    e.stopPropagation();
    menu.classList.toggle("open");
  };

  document.querySelectorAll(".plus-option").forEach(btn => {
    btn.onclick = () => {
      menu.classList.remove("open");

      currentPage = btn.dataset.action;
      updateNav();
      renderPage();
    };
  });

  document.addEventListener("click", () => {
    menu.classList.remove("open");
  }, { once: true });

  send.disabled = true;
}

function renderWelcomeOrMessages() {
  const welcome = document.getElementById("welcome");
  const messageBox = document.getElementById("messages");

  if (!messages.length) {
    welcome.style.display = "flex";
    messageBox.style.display = "none";

    welcome.innerHTML = `
      <div class="welcome-inner">

        <h1>Como posso ajudar?</h1>

        <p>
          A VÉRTEX AI é sua assistente para marketing digital,
          vendas e criação de estratégias.
        </p>

        <div class="suggestions">

          <button
            class="suggestion"
            data-prompt="Quero começar do zero no marketing digital. Monte um plano simples para mim."
          >
            <div class="suggestion-title">
              🚀 Começar do zero
            </div>

            <div class="suggestion-text">
              Crie um plano para começar no digital.
            </div>
          </button>

          <button
            class="suggestion"
            data-prompt="Crie um anúncio completo para um produto digital, com gancho, texto, título e CTA."
          >
            <div class="suggestion-title">
              🎯 Criar anúncio
            </div>

            <div class="suggestion-text">
              Crie um criativo pronto para testar.
            </div>
          </button>

          <button
            class="suggestion"
            data-prompt="Crie uma estratégia com 7 posts para Instagram focados em marketing digital."
          >
            <div class="suggestion-title">
              📱 Posts para Instagram
            </div>

            <div class="suggestion-text">
              Tenha uma sequência de conteúdo.
            </div>
          </button>

          <button
            class="suggestion"
            data-prompt="Crie uma estratégia completa para vender como afiliado usando conteúdo e anúncios."
          >
            <div class="suggestion-title">
              💰 Estratégia de vendas
            </div>

            <div class="suggestion-text">
              Estruture sua estratégia digital.
            </div>
          </button>

        </div>

      </div>
    `;

    document.querySelectorAll(".suggestion").forEach(btn => {
      btn.onclick = () => {
        document.getElementById("messageInput").value =
          btn.dataset.prompt;

        document.getElementById("sendButton").disabled = false;

        sendMessage();
      };
    });

    return;
  }

  welcome.style.display = "none";
  messageBox.style.display = "block";

  messageBox.innerHTML = messages.map(message => {

    if (message.role === "user") {
      return `
        <div class="message-row user">

          <div class="message-wrap">

            <div class="user-message-avatar">
              ${initials(me?.name)}
            </div>

            <div class="message-bubble user-bubble">
              ${escapeHtml(message.content)}
            </div>

          </div>

        </div>
      `;
    }

    return `
      <div class="message-row vertex">

        <div class="message-wrap">

          ${vertexIcon("vertex-avatar")}

          <div class="message-bubble vertex-bubble">
            ${escapeHtml(message.content)}
          </div>

        </div>

      </div>
    `;
  }).join("");

  requestAnimationFrame(() => {
    messageBox.scrollTop = messageBox.scrollHeight;
  });
}

async function sendMessage() {
  const input = document.getElementById("messageInput");

  if (!input) return;

  const text = input.value.trim();

  if (!text || !currentChatId) return;

  const send = document.getElementById("sendButton");

  send.disabled = true;
  input.disabled = true;

  input.value = "";

  messages.push({
    role: "user",
    content: text
  });

  renderWelcomeOrMessages();

  try {

    await api(`/chats/${currentChatId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        content: text
      })
    });

    const result = await api("/ai/generate", {
      method: "POST",
      body: JSON.stringify({
        chatId: currentChatId,
        prompt: text
      })
    });

    messages.push({
      role: "assistant",
      content: result.message
    });

    renderWelcomeOrMessages();

    await loadChats();
    renderChatList();

  } catch (err) {

    messages.push({
      role: "assistant",
      content:
        "⚠️ " + err.message
    });

    renderWelcomeOrMessages();

  } finally {

    input.disabled = false;
    input.focus();

    send.disabled = !input.value.trim();
  }
}

async function newChat() {
  const data = await api("/chats", {
    method: "POST",
    body: JSON.stringify({
      title: "Nova conversa"
    })
  });

  currentChatId = data.chat.id;
  messages = [];

  await loadChats();

  currentPage = "chat";

  renderApp();

  renderChatList();

  document.getElementById("messageInput")?.focus();
}

async function openChat(id) {
  const data = await api(`/chats/${id}`);

  currentChatId = data.chat.id;
  messages = data.messages || [];

  currentPage = "chat";

  updateNav();
  renderPage();
  renderChatList();

  setTimeout(() => {
    document.getElementById("messageInput")?.focus();
  }, 100);
}

function renderChatList() {
  const list = document.getElementById("chatList");

  if (!list) return;

  if (!chats.length) {
    list.innerHTML = `
      <div style="padding:10px;color:#888;font-size:12px">
        Nenhuma conversa ainda.
      </div>
    `;

    return;
  }

  list.innerHTML = chats.map(chat => `
    <div
      class="chat-item ${chat.id === currentChatId ? "active" : ""}"
      data-id="${chat.id}"
    >
      ${escapeHtml(chat.title)}
    </div>
  `).join("");

  list.querySelectorAll(".chat-item").forEach(item => {
    item.onclick = () => {
      openChat(Number(item.dataset.id));
    };
  });
}

/* =========================
   HISTÓRICO
========================= */

async function renderHistory() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="page">
      <div class="page-inner">
        <h1>Histórico</h1>
        <p class="page-subtitle">
          Todas as suas conversas ficam salvas aqui.
        </p>

        <div id="historyList">
          Carregando...
        </div>
      </div>
    </div>
  `;

  const data = await api("/history");

  const list = document.getElementById("historyList");

  if (!data.history.length) {
    list.innerHTML = `
      <div class="history-card">
        Nenhuma conversa no histórico.
      </div>
    `;

    return;
  }

  list.innerHTML = data.history.map(item => `
    <div class="history-card">

      <strong>
        ${escapeHtml(item.title)}
      </strong>

      <p style="color:#777">
        ${item.message_count} mensagem(ns)
      </p>

      <button
        class="secondary-button"
        data-chat="${item.id}"
      >
        Abrir conversa
      </button>

    </div>
  `).join("");

  list.querySelectorAll("[data-chat]").forEach(btn => {
    btn.onclick = async () => {
      await openChat(Number(btn.dataset.chat));
    };
  });
}

/* =========================
   PROJETOS
========================= */

async function renderProjects() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="page">
      <div class="page-inner">

        <h1>Projetos</h1>

        <p class="page-subtitle">
          Organize seus projetos de marketing e vendas.
        </p>

        <div style="margin-top:20px">

          <input
            id="projectTitle"
            class="input"
            placeholder="Nome do projeto"
          >

          <input
            id="projectDescription"
            class="input"
            placeholder="Descrição do projeto"
          >

          <button
            class="primary-button"
            id="createProject"
          >
            + Criar projeto
          </button>

        </div>

        <div id="projectsList" style="margin-top:25px">
          Carregando...
        </div>

      </div>
    </div>
  `;

  document.getElementById("createProject").onclick =
    createProject;

  const data = await api("/projects");

  renderProjectList(data.projects);
}

function renderProjectList(projects) {
  const list = document.getElementById("projectsList");

  if (!list) return;

  if (!projects.length) {
    list.innerHTML = `
      <div class="project-card">
        <strong>Nenhum projeto criado.</strong>
        <p style="color:#777">
          Crie seu primeiro projeto acima.
        </p>
      </div>
    `;

    return;
  }

  list.innerHTML = projects.map(project => `
    <div class="project-card">

      <h3>
        ${escapeHtml(project.title)}
      </h3>

      <p>
        ${escapeHtml(project.description || "Sem descrição")}
      </p>

      <small>
        Status: ${escapeHtml(project.status)}
      </small>

      <div class="project-actions">

        <button
          class="secondary-button"
          data-delete="${project.id}"
        >
          Excluir
        </button>

      </div>

    </div>
  `).join("");

  list.querySelectorAll("[data-delete]").forEach(btn => {
    btn.onclick = async () => {

      if (!confirm("Excluir este projeto?")) {
        return;
      }

      await api(`/projects/${btn.dataset.delete}`, {
        method: "DELETE"
      });

      const data = await api("/projects");

      renderProjectList(data.projects);
    };
  });
}

async function createProject() {
  const title = document.getElementById("projectTitle").value.trim();
  const description =
    document.getElementById("projectDescription").value.trim();

  if (!title) {
    alert("Digite o nome do projeto.");
    return;
  }

  await api("/projects", {
    method: "POST",
    body: JSON.stringify({
      title,
      description
    })
  });

  document.getElementById("projectTitle").value = "";
  document.getElementById("projectDescription").value = "";

  const data = await api("/projects");

  renderProjectList(data.projects);
}

/* =========================
   PLANOS
========================= */

async function renderPlans() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="page">
      <div class="page-inner">

        <h1>Planos</h1>

        <p class="page-subtitle">
          Escolha o plano que combina com seu uso.
        </p>

        <div class="cards" id="plansCards">
          Carregando...
        </div>

      </div>
    </div>
  `;

  const data = await api("/plans");

  document.getElementById("plansCards").innerHTML =
    data.plans.map(plan => `
      <div class="card">

        <h3>
          ${escapeHtml(plan.name)}
        </h3>

        <div style="font-size:25px;font-weight:800">
          ${escapeHtml(plan.price)}
        </div>

        <p style="color:#777">
          ${plan.credits} créditos de IA
        </p>

        <button class="primary-button">
          Selecionar
        </button>

      </div>
    `).join("");
}

/* =========================
   CONFIGURAÇÕES
========================= */

function renderSettings() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="page">
      <div class="page-inner">

        <h1>Configurações</h1>

        <p class="page-subtitle">
          Gerencie sua conta VÉRTEX.
        </p>

        <div class="card" style="margin-top:25px">

          <h3>Minha conta</h3>

          <p>
            <strong>Nome:</strong>
            ${escapeHtml(me?.name)}
          </p>

          <p>
            <strong>E-mail:</strong>
            ${escapeHtml(me?.email)}
          </p>

          <p>
            <strong>Plano:</strong>
            ${escapeHtml(me?.plan)}
          </p>

          <p>
            <strong>Créditos:</strong>
            ${escapeHtml(me?.credits)}
          </p>

          <button
            class="secondary-button"
            id="logout"
          >
            Sair da conta
          </button>

        </div>

      </div>
    </div>
  `;

  document.getElementById("logout").onclick = () => {
    token = null;
    me = null;
    chats = [];
    messages = [];
    currentChatId = null;

    localStorage.removeItem("vertex_token");

    renderLogin();
  };
}

/* =========================
   START
========================= */

if (token) {
  startApp();
} else {
  renderLogin();
}

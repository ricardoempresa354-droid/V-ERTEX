const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let token = localStorage.getItem("vertex_token");
let me = null;
let plansCache = [];
let currentChatId = null;

const meta = {
  chat: {
    title: "VÉRTEX AI",
    subtitle: "Seu assistente de inteligência artificial"
  },
  history: {
    title: "Histórico",
    subtitle: "Suas conversas anteriores"
  },
  projects: {
    title: "Projetos",
    subtitle: "Organize seus projetos"
  },
  plans: {
    title: "Planos",
    subtitle: "Escolha o plano ideal para você"
  },
  settings: {
    title: "Configurações",
    subtitle: "Personalize sua conta"
  }
};

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
    throw new Error(data.error || data.message || "Ocorreu um erro.");
  }

  return data;
}

/* =========================
   AUTENTICAÇÃO
========================= */

function authMode(mode) {
  const app = $("#app");

  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">

        <div class="auth-logo">
          <div class="vertex-logo">V</div>
          <div>
            <strong>VÉRTEX</strong>
            <span>AI</span>
          </div>
        </div>

        <h1>${mode === "login" ? "Bem-vindo de volta" : "Criar sua conta"}</h1>

        <p class="auth-subtitle">
          ${mode === "login"
            ? "Entre para continuar usando o VÉRTEX AI."
            : "Crie sua conta e comece a usar o VÉRTEX AI."}
        </p>

        <form id="authForm">

          ${
            mode === "register"
              ? `
                <label>Nome</label>
                <input id="name" type="text" placeholder="Seu nome" required>
              `
              : ""
          }

          <label>E-mail</label>
          <input id="email" type="email" placeholder="seu@email.com" required>

          <label>Senha</label>
          <input id="password" type="password" placeholder="Sua senha" required>

          <button class="primary-btn" type="submit">
            ${mode === "login" ? "Entrar" : "Criar conta"}
          </button>

        </form>

        <div class="auth-switch">
          ${
            mode === "login"
              ? `
                Não tem uma conta?
                <button id="goRegister">Criar conta</button>
              `
              : `
                Já tem uma conta?
                <button id="goLogin">Entrar</button>
              `
          }
        </div>

        <div id="authError"></div>

      </div>
    </div>
  `;

  $("#authForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = $("#email").value.trim();
    const password = $("#password").value;

    try {
      const data =
        mode === "login"
          ? await api("/api/auth/login", {
              method: "POST",
              body: JSON.stringify({ email, password })
            })
          : await api("/api/auth/register", {
              method: "POST",
              body: JSON.stringify({
                name: $("#name").value.trim(),
                email,
                password
              })
            });

      token = data.token;
      localStorage.setItem("vertex_token", token);

      await startApp();

    } catch (error) {
      $("#authError").innerHTML = `
        <div class="error-box">${escapeHTML(error.message)}</div>
      `;
    }
  });

  $("#goRegister")?.addEventListener("click", () => authMode("register"));
  $("#goLogin")?.addEventListener("click", () => authMode("login"));
}

/* =========================
   INICIALIZAÇÃO
========================= */

async function startApp() {
  try {
    const data = await api("/api/me");
    me = data.user || data;

    await loadPlans();

    renderApp();
    showPage("chat");

  } catch {
    localStorage.removeItem("vertex_token");
    token = null;
    authMode("login");
  }
}

async function loadPlans() {
  try {
    const data = await api("/api/plans");
    plansCache = data.plans || [];
  } catch {
    plansCache = [
      {
        id: "FREE",
        name: "Grátis",
        price: "R$ 0",
        credits: 30,
        checkout: null
      },
      {
        id: "PRO",
        name: "PRO",
        price: "R$ 39,90",
        credits: 500,
        checkout: "https://pay.cakto.com.br/ubpqtkf_1087308"
      },
      {
        id: "PRO_ANNUAL",
        name: "PRO Anual",
        price: "R$ 190,00",
        credits: 8000,
        checkout: "https://pay.cakto.com.br/qikjmty"
      }
    ];
  }
}

/* =========================
   ESTRUTURA PRINCIPAL
========================= */

function renderApp() {
  const app = $("#app");

  app.innerHTML = `
    <div class="app-shell">

      <aside class="sidebar" id="sidebar">

        <div class="sidebar-top">

          <div class="brand">
            <div class="vertex-logo small">V</div>

            <div>
              <strong>VÉRTEX</strong>
              <span>AI</span>
            </div>
          </div>

          <button class="new-chat-btn" id="newChatBtn">
            <span>＋</span>
            Nova conversa
          </button>

          <nav class="main-nav">

            <button class="nav-item active" data-page="chat">
              <span>⌕</span>
              VÉRTEX AI
            </button>

            <button class="nav-item" data-page="history">
              <span>◷</span>
              Histórico
            </button>

            <button class="nav-item" data-page="projects">
              <span>▣</span>
              Projetos
            </button>

            <button class="nav-item" data-page="plans">
              <span>◇</span>
              Planos
            </button>

            <button class="nav-item" data-page="settings">
              <span>⚙</span>
              Configurações
            </button>

          </nav>

        </div>

        <div class="sidebar-bottom">

          <div class="user-mini">
            <div class="user-avatar">
              ${getInitials(me?.name || me?.email || "V")}
            </div>

            <div class="user-info">
              <strong>${escapeHTML(me?.name || "Usuário")}</strong>
              <span>${escapeHTML(me?.plan || "FREE")}</span>
            </div>
          </div>

          <button class="logout-btn" id="logoutBtn">
            Sair
          </button>

        </div>

      </aside>

      <main class="main-content">

        <header class="topbar">

          <button class="menu-btn" id="menuBtn">
            ☰
          </button>

          <div class="topbar-title">
            <strong id="pageTitle">VÉRTEX AI</strong>
            <span id="pageSubtitle">Seu assistente de inteligência artificial</span>
          </div>

          <div class="topbar-user">
            <div class="user-avatar">
              ${getInitials(me?.name || me?.email || "V")}
            </div>
          </div>

        </header>

        <section id="page" class="page-container"></section>

      </main>

    </div>
  `;

  bindNavigation();

  $("#newChatBtn").addEventListener("click", () => {
    currentChatId = null;
    showPage("chat");
  });

  $("#logoutBtn").addEventListener("click", logout);

  $("#menuBtn").addEventListener("click", () => {
    $("#sidebar").classList.toggle("open");
  });
}

/* =========================
   NAVEGAÇÃO
========================= */

function bindNavigation() {
  $$(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;

      $$(".nav-item").forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      $("#sidebar")?.classList.remove("open");

      showPage(page);
    });
  });
}

function showPage(page) {
  const info = meta[page] || meta.chat;

  $("#pageTitle").textContent = info.title;
  $("#pageSubtitle").textContent = info.subtitle;

  $$(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.page === page);
  });

  if (page === "chat") renderChat();
  if (page === "history") renderHistory();
  if (page === "projects") renderProjects();
  if (page === "plans") renderPlans();
  if (page === "settings") renderSettings();
}

/* =========================
   CHAT
========================= */

async function renderChat() {
  const page = $("#page");

  page.innerHTML = `
    <div class="chat-page">

      <div class="messages-area" id="messagesArea">

        <div class="welcome-area" id="welcomeArea">

          <div class="vertex-avatar large">
            <svg viewBox="0 0 48 48">
              <path d="M28 3L10 27h11l-3 18 20-27H27z"></path>
            </svg>
          </div>

          <h1>Como posso ajudar?</h1>

          <p>
            Eu sou o VÉRTEX AI, seu assistente para marketing digital,
            renda extra, vendas, estratégias e criação de conteúdo.
          </p>

          <div class="suggestions">

            <button data-prompt="Quero começar do zero no marketing digital e aprender a fazer vendas.">
              Começar do zero
            </button>

            <button data-prompt="Crie um criativo de anúncio para o nicho de renda extra.">
              Criar criativo
            </button>

            <button data-prompt="Crie 7 ideias de posts para Instagram sobre renda extra.">
              Criar posts
            </button>

            <button data-prompt="Crie uma estratégia para vender um produto como afiliado.">
              Criar estratégia
            </button>

          </div>

        </div>

        <div id="messagesList"></div>

      </div>

      <div class="composer-area">

        <div class="composer">

          <button class="plus-btn" id="plusBtn">
            +
          </button>

          <textarea
            id="messageInput"
            rows="1"
            placeholder="Mensagem para o VÉRTEX..."
          ></textarea>

          <button class="send-btn" id="sendBtn">
            ↑
          </button>

        </div>

        <div class="composer-note">
          O VÉRTEX pode cometer erros. Confira informações importantes.
        </div>

      </div>

      <div class="plus-menu" id="plusMenu">

        <button data-action="projects">
          📁
          <span>Projetos</span>
        </button>

        <button data-action="history">
          🕘
          <span>Histórico</span>
        </button>

        <button data-action="plans">
          💳
          <span>Planos</span>
        </button>

        <button data-action="settings">
          ⚙️
          <span>Configurações</span>
        </button>

      </div>

    </div>
  `;

  bindChatEvents();

  if (currentChatId) {
    await loadChat(currentChatId);
  }
}

function bindChatEvents() {
  const input = $("#messageInput");
  const send = $("#sendBtn");
  const plus = $("#plusBtn");
  const plusMenu = $("#plusMenu");

  $$(".suggestions button").forEach((button) => {
    button.addEventListener("click", () => {
      input.value = button.dataset.prompt;
      input.focus();
    });
  });

  send.addEventListener("click", sendMessage);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 180) + "px";
  });

  plus.addEventListener("click", (e) => {
    e.stopPropagation();
    plusMenu.classList.toggle("open");
  });

  plusMenu.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      plusMenu.classList.remove("open");

      const action = button.dataset.action;

      if (action === "projects") showPage("projects");
      if (action === "history") showPage("history");
      if (action === "plans") showPage("plans");
      if (action === "settings") showPage("settings");
    });
  });
}

document.addEventListener("click", (e) => {
  const menu = $("#plusMenu");

  if (
    menu &&
    !menu.contains(e.target) &&
    !e.target.closest("#plusBtn")
  ) {
    menu.classList.remove("open");
  }
});

async function sendMessage() {
  const input = $("#messageInput");
  const text = input.value.trim();

  if (!text) return;

  input.value = "";
  input.style.height = "auto";

  $("#welcomeArea")?.remove();

  appendMessage({
    role: "user",
    content: text
  });

  const loading = appendMessage({
    role: "assistant",
    content: "Pensando..."
  });

  try {
    const data = await api("/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({
        chatId: currentChatId,
        message: text
      })
    });

    loading.remove();

    appendMessage({
      role: "assistant",
      content:
        data.reply ||
        data.message ||
        data.output ||
        "Não consegui gerar uma resposta agora."
    });

    if (data.chatId) {
      currentChatId = data.chatId;
    }

  } catch (error) {
    loading.remove();

    appendMessage({
      role: "assistant",
      content: "Erro: " + error.message
    });
  }
}

function appendMessage(message) {
  const list = $("#messagesList");

  const row = document.createElement("div");

  row.className =
    message.role === "user"
      ? "message-row message-user"
      : "message-row message-vertex";

  const avatar =
    message.role === "user"
      ? `
        <div class="user-message-avatar">
          ${getInitials(me?.name || me?.email || "V")}
        </div>
      `
      : `
        <div class="vertex-avatar">
          <svg viewBox="0 0 48 48">
            <path d="M28 3L10 27h11l-3 18 20-27H27z"></path>
          </svg>
        </div>
      `;

  row.innerHTML = `
    ${message.role === "assistant" ? avatar : ""}

    <div class="message-bubble">
      ${formatMessage(message.content)}
    </div>

    ${message.role === "user" ? avatar : ""}
  `;

  list.appendChild(row);

  const area = $("#messagesArea");

  if (area) {
    area.scrollTop = area.scrollHeight;
  }

  return row;
}

async function loadChat(chatId) {
  try {
    const data = await api(`/api/chats/${chatId}`);

    const messages = data.messages || [];

    $("#welcomeArea")?.remove();

    $("#messagesList").innerHTML = "";

    messages.forEach((message) => {
      appendMessage({
        role: message.role,
        content: message.content
      });
    });

  } catch (error) {
    console.error(error);
  }
}

/* =========================
   HISTÓRICO
========================= */

async function renderHistory() {
  const page = $("#page");

  page.innerHTML = `
    <div class="content-page">

      <div class="section-header">
        <div>
          <h1>Histórico</h1>
          <p>Veja suas conversas anteriores.</p>
        </div>

        <button class="primary-btn small" id="historyNewChat">
          + Nova conversa
        </button>
      </div>

      <div id="historyList" class="list-grid">
        <div class="loading-card">Carregando...</div>
      </div>

    </div>
  `;

  $("#historyNewChat").addEventListener("click", () => {
    currentChatId = null;
    showPage("chat");
  });

  try {
    const data = await api("/api/chats");
    const chats = data.chats || [];

    const list = $("#historyList");

    if (!chats.length) {
      list.innerHTML = `
        <div class="empty-card">
          Nenhuma conversa ainda.
        </div>
      `;
      return;
    }

    list.innerHTML = chats
      .map(
        (chat) => `
          <button class="history-card" data-chat="${chat.id}">
            <div>
              <strong>
                ${escapeHTML(chat.title || "Nova conversa")}
              </strong>

              <span>
                ${formatDate(chat.created_at)}
              </span>
            </div>

            <span>›</span>
          </button>
        `
      )
      .join("");

    $$(".history-card").forEach((button) => {
      button.addEventListener("click", () => {
        currentChatId = Number(button.dataset.chat);
        showPage("chat");
      });
    });

  } catch (error) {
    $("#historyList").innerHTML = `
      <div class="error-box">${escapeHTML(error.message)}</div>
    `;
  }
}

/* =========================
   PROJETOS
========================= */

async function renderProjects() {
  const page = $("#page");

  page.innerHTML = `
    <div class="content-page">

      <div class="section-header">

        <div>
          <h1>Projetos</h1>
          <p>Organize seus projetos dentro do VÉRTEX.</p>
        </div>

        <button class="primary-btn small" id="newProjectBtn">
          + Novo projeto
        </button>

      </div>

      <div id="projectsList" class="project-grid">
        <div class="loading-card">Carregando...</div>
      </div>

    </div>
  `;

  $("#newProjectBtn").addEventListener("click", newProject);

  await loadProjects();
}

async function loadProjects() {
  try {
    const data = await api("/api/projects");
    const projects = data.projects || [];

    const list = $("#projectsList");

    if (!projects.length) {
      list.innerHTML = `
        <div class="empty-card">
          Você ainda não possui projetos.
        </div>
      `;
      return;
    }

    list.innerHTML = projects
      .map(
        (project) => `
          <div class="project-card">

            <div class="project-icon">
              ▣
            </div>

            <h3>${escapeHTML(project.title)}</h3>

            <p>
              ${escapeHTML(project.description || "Sem descrição")}
            </p>

            <div class="project-footer">

              <span class="status-badge">
                ${escapeHTML(project.status || "Ativo")}
              </span>

              <button
                class="secondary-btn edit-project"
                data-id="${project.id}"
              >
                Abrir
              </button>

            </div>

          </div>
        `
      )
      .join("");

    $$(".edit-project").forEach((button) => {
      button.addEventListener("click", () => {
        editProject(button.dataset.id);
      });
    });

  } catch (error) {
    $("#projectsList").innerHTML = `
      <div class="error-box">${escapeHTML(error.message)}</div>
    `;
  }
}

async function newProject() {
  const title = prompt("Nome do projeto:");

  if (!title || !title.trim()) return;

  const description = prompt("Descrição do projeto:") || "";

  try {
    await api("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim()
      })
    });

    toast("Projeto criado com sucesso!");

    await loadProjects();

  } catch (error) {
    toast(error.message);
  }
}

async function editProject(id) {
  try {
    const data = await api(`/api/projects/${id}`);
    const project = data.project || data;

    const title = prompt(
      "Nome do projeto:",
      project.title || ""
    );

    if (!title) return;

    const description = prompt(
      "Descrição:",
      project.description || ""
    );

    await api(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title,
        description: description || "",
        status: project.status || "Ativo"
      })
    });

    toast("Projeto atualizado!");

    await loadProjects();

  } catch (error) {
    toast(error.message);
  }
}

/* =========================
   PLANOS
========================= */

async function renderPlans() {
  const page = $("#page");

  await loadPlans();

  page.innerHTML = `
    <div class="content-page plans-page">

      <div class="section-header centered">

        <div>
          <h1>Planos</h1>
          <p>
            Escolha o plano que combina com o seu uso do VÉRTEX AI.
          </p>
        </div>

      </div>

      <div class="plans-grid" id="plansGrid"></div>

    </div>
  `;

  renderPlanCards();
}

function renderPlanCards() {
  const grid = $("#plansGrid");

  if (!grid) return;

  grid.innerHTML = plansCache
    .map((plan) => {
      const isCurrent =
        String(me?.plan || "FREE").toUpperCase() ===
        String(plan.id).toUpperCase();

      const isAnnual = plan.id === "PRO_ANNUAL";
      const isPro = plan.id === "PRO";

      return `
        <div class="plan-card ${isPro ? "featured" : ""}">

          ${
            isPro
              ? `<div class="plan-badge">MAIS POPULAR</div>`
              : ""
          }

          <div class="plan-name">
            ${escapeHTML(plan.name)}
          </div>

          <div class="plan-price">
            ${escapeHTML(plan.price)}
            ${
              isPro
                ? `<span>/mês</span>`
                : isAnnual
                ? `<span>/ano</span>`
                : ""
            }
          </div>

          <div class="plan-credits">
            ${Number(plan.credits || 0).toLocaleString("pt-BR")}
            créditos de IA
          </div>

          <ul class="plan-features">

            <li>✓ Acesso ao VÉRTEX AI</li>
            <li>✓ Projetos</li>
            <li>✓ Histórico de conversas</li>
            <li>✓ Ferramentas de marketing</li>

            ${
              isPro || isAnnual
                ? `<li>✓ Mais créditos de IA</li>`
                : ""
            }

          </ul>

          <button
            class="plan-select-btn ${isCurrent ? "current" : ""}"
            data-plan="${escapeHTML(plan.id)}"
            ${isCurrent ? "disabled" : ""}
          >
            ${
              isCurrent
                ? "Plano atual"
                : "Selecionar"
            }
          </button>

        </div>
      `;
    })
    .join("");

  $$(".plan-select-btn:not(.current)").forEach((button) => {
    button.addEventListener("click", () => {
      selectPlan(button.dataset.plan);
    });
  });
}

async function selectPlan(planId) {
  const plan = plansCache.find(
    (item) => item.id === planId
  );

  if (!plan) {
    toast("Plano não encontrado.");
    return;
  }

  /* PLANO GRÁTIS */
  if (plan.id === "FREE") {
    try {
      await api("/api/me/plan", {
        method: "POST",
        body: JSON.stringify({
          plan: "FREE"
        })
      });

      me.plan = "FREE";

      toast("Plano Grátis selecionado!");

      renderPlans();

    } catch (error) {
      toast(
        "Não foi possível alterar o plano agora."
      );
    }

    return;
  }

  /* PLANO PAGO */
  if (plan.checkout) {
    window.open(
      plan.checkout,
      "_blank",
      "noopener,noreferrer"
    );

    toast(
      `Checkout do ${plan.name} aberto.`
    );

    return;
  }

  toast("Este plano não possui checkout configurado.");
}

/* =========================
   CONFIGURAÇÕES
========================= */

function renderSettings() {
  const page = $("#page");

  page.innerHTML = `
    <div class="content-page">

      <div class="section-header">
        <div>
          <h1>Configurações</h1>
          <p>Gerencie as informações da sua conta.</p>
        </div>
      </div>

      <div class="settings-card">

        <label>Nome</label>

        <input
          id="settingsName"
          value="${escapeAttribute(me?.name || "")}"
          placeholder="Seu nome"
        >

        <label>E-mail</label>

        <input
          value="${escapeAttribute(me?.email || "")}"
          disabled
        >

        <label>Plano</label>

        <input
          value="${escapeAttribute(me?.plan || "FREE")}"
          disabled
        >

        <button class="primary-btn" id="saveSettings">
          Salvar alterações
        </button>

      </div>

    </div>
  `;

  $("#saveSettings").addEventListener(
    "click",
    saveSettings
  );
}

async function saveSettings() {
  const name = $("#settingsName").value.trim();

  if (!name) {
    toast("Digite seu nome.");
    return;
  }

  try {
    const data = await api("/api/me", {
      method: "PUT",
      body: JSON.stringify({
        name
      })
    });

    me = data.user || data;

    toast("Configurações salvas!");

    renderApp();
    showPage("settings");

  } catch (error) {
    toast(error.message);
  }
}

/* =========================
   LOGOUT
========================= */

function logout() {
  localStorage.removeItem("vertex_token");

  token = null;
  me = null;
  currentChatId = null;

  authMode("login");
}

/* =========================
   UTILITÁRIOS
========================= */

function getInitials(text) {
  const value = String(text || "V").trim();

  if (!value) return "V";

  const parts = value.split(/\s+/);

  if (parts.length >= 2) {
    return (
      parts[0][0] +
      parts[parts.length - 1][0]
    ).toUpperCase();
  }

  return value.slice(0, 2).toUpperCase();
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHTML(value);
}

function formatMessage(text) {
  let html = escapeHTML(text);

  html = html.replace(
    /\*\*(.*?)\*\*/g,
    "<strong>$1</strong>"
  );

  html = html.replace(
    /`([^`]+)`/g,
    "<code>$1</code>"
  );

  html = html.replace(/\n/g, "<br>");

  return html;
}

function formatDate(date) {
  if (!date) return "";

  try {
    return new Date(date).toLocaleDateString(
      "pt-BR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    );
  } catch {
    return "";
  }
}

function toast(message) {
  let box = document.querySelector(".vertex-toast");

  if (!box) {
    box = document.createElement("div");
    box.className = "vertex-toast";
    document.body.appendChild(box);
  }

  box.textContent = message;
  box.classList.add("show");

  clearTimeout(box._timer);

  box._timer = setTimeout(() => {
    box.classList.remove("show");
  }, 2500);
}

/* =========================
   INICIAR
========================= */

if (token) {
  startApp();
} else {
  authMode("login");
}

let token = localStorage.getItem("vertex_token");
let me = null;
let currentChatId = null;
let plansCache = [];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);


/* =====================================================
   API
===================================================== */

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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || "Ocorreu um erro."
    );
  }

  return data;
}


/* =====================================================
   AUTH
===================================================== */

function authMode(mode) {

  const loginTab = $("#loginTab");
  const registerTab = $("#registerTab");
  const form = $("#authForm");
  const error = $("#authError");

  error.textContent = "";

  loginTab.classList.toggle("on", mode === "login");
  registerTab.classList.toggle("on", mode === "register");

  if (mode === "login") {

    form.innerHTML = `
      <form class="form" onsubmit="login(event)">

        <div class="field">
          <label>E-mail</label>
          <input
            id="email"
            type="email"
            autocomplete="email"
            required
            placeholder="seu@email.com"
          >
        </div>

        <div class="field">
          <label>Senha</label>
          <input
            id="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="Sua senha"
          >
        </div>

        <button class="btn orange" type="submit">
          Entrar no VÉRTEX
        </button>

      </form>
    `;

  } else {

    form.innerHTML = `
      <form class="form" onsubmit="register(event)">

        <div class="field">
          <label>Nome</label>
          <input
            id="name"
            type="text"
            autocomplete="name"
            required
            placeholder="Seu nome"
          >
        </div>

        <div class="field">
          <label>E-mail</label>
          <input
            id="email"
            type="email"
            autocomplete="email"
            required
            placeholder="seu@email.com"
          >
        </div>

        <div class="field">
          <label>Senha</label>
          <input
            id="password"
            type="password"
            autocomplete="new-password"
            minlength="6"
            required
            placeholder="Mínimo de 6 caracteres"
          >
        </div>

        <button class="btn orange" type="submit">
          Criar minha conta
        </button>

      </form>
    `;
  }
}


async function login(event) {

  event.preventDefault();

  const error = $("#authError");

  try {

    const email = $("#email").value.trim();
    const password = $("#password").value;

    const data = await api(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email,
          password
        })
      }
    );

    token = data.token;

    localStorage.setItem(
      "vertex_token",
      token
    );

    me = data.user;

    await start();

  } catch (err) {

    error.textContent = err.message;
  }
}


async function register(event) {

  event.preventDefault();

  const error = $("#authError");

  try {

    const name = $("#name").value.trim();
    const email = $("#email").value.trim();
    const password = $("#password").value;

    const data = await api(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password
        })
      }
    );

    token = data.token;

    localStorage.setItem(
      "vertex_token",
      token
    );

    me = data.user;

    await start();

  } catch (err) {

    error.textContent = err.message;
  }
}


/* =====================================================
   START
===================================================== */

async function start() {

  if (!token) {

    $("#auth").classList.remove("hidden");
    $("#app").classList.add("hidden");

    authMode("login");

    return;
  }

  try {

    const data = await api("/api/me");

    me = data.user;

    $("#auth").classList.add("hidden");
    $("#app").classList.remove("hidden");

    updateUser();

    await loadPlans();

    renderAll();

    await workspace();

    show("workspace");

  } catch {

    token = null;

    localStorage.removeItem("vertex_token");

    $("#auth").classList.remove("hidden");
    $("#app").classList.add("hidden");

    authMode("login");
  }
}


function updateUser() {

  if (!me) return;

  const name = me.name || "Usuário";
  const letter = name.charAt(0).toUpperCase();

  if ($("#userName")) {
    $("#userName").textContent = name;
  }

  if ($("#sideUserLetter")) {
    $("#sideUserLetter").textContent = letter;
  }

  if ($("#topUserLetter")) {
    $("#topUserLetter").textContent = letter;
  }
}


/* =====================================================
   NAVEGAÇÃO
===================================================== */

function show(view) {

  $$(".view").forEach(
    el => el.classList.remove("on")
  );

  const target = $(`#${view}`);

  if (target) {
    target.classList.add("on");
  }

  $$(".side nav button").forEach(button => {

    button.classList.toggle(
      "active",
      button.dataset.view === view
    );

  });

  const titles = {
    dashboard: [
      "Dashboard",
      "Seu ponto de partida para renda extra no digital."
    ],
    workspace: [
      "VÉRTEX AI",
      "Especialista em renda extra."
    ],
    templates: [
      "Ferramentas",
      "Use ferramentas rápidas para acelerar suas ideias."
    ],
    bonuses: [
      "Bônus",
      "Materiais prontos para você começar."
    ],
    projects: [
      "Projetos",
      "Organize seus projetos no VÉRTEX."
    ],
    history: [
      "Histórico",
      "Suas conversas anteriores."
    ],
    plans: [
      "Planos",
      "Escolha o plano que combina com seu uso."
    ],
    settings: [
      "Configurações",
      "Gerencie sua conta."
    ]
  };

  if (titles[view]) {

    $("#title").textContent =
      titles[view][0];

    $("#sub").textContent =
      titles[view][1];
  }

  document.body.classList.remove("menu-open");
}


function bindNavigation() {

  $$(".side nav button").forEach(button => {

    button.onclick = async () => {

      const view = button.dataset.view;

      show(view);

      if (view === "dashboard") dashboard();
      if (view === "workspace") await workspace();
      if (view === "templates") templates();
      if (view === "bonuses") loadBonuses();
      if (view === "projects") loadProjects();
      if (view === "history") loadHistory();
      if (view === "plans") plans();
      if (view === "settings") settings();
    };

  });
}


function toggleMenu() {
  document.body.classList.toggle("menu-open");
}


/* =====================================================
   CHAT
===================================================== */

function vertexLogo() {

  return `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d="
        M14 16
        L34 16
        L50 48
        L66 16
        L86 16
        L55 77
        L45 77
        Z
      "/>
    </svg>
  `;
}


async function workspace() {

  const box = $("#workspace");

  box.innerHTML = `
    <div class="panel chat">

      <div class="chat-head">
        <div>
          <strong>VÉRTEX AI</strong>
          <span>Especialista em marketing e renda extra</span>
        </div>
      </div>

      <div id="messages" class="messages"></div>

      <div class="composer">

        <div class="plus-wrap">

          <button
            id="plusButton"
            class="plus-button"
            type="button"
            onclick="togglePlusMenu()"
          >
            +
          </button>

          <div
            id="plusMenu"
            class="plus-menu hidden"
          >

            <button
              class="plus-option"
              onclick="openPlus('projects')"
            >
              <span>□</span>
              <span>Projetos</span>
            </button>

            <button
              class="plus-option"
              onclick="openPlus('history')"
            >
              <span>◷</span>
              <span>Histórico</span>
            </button>

            <button
              class="plus-option"
              onclick="openPlus('plans')"
            >
              <span>▭</span>
              <span>Planos</span>
            </button>

            <button
              class="plus-option"
              onclick="openPlus('settings')"
            >
              <span>⚙</span>
              <span>Configurações</span>
            </button>

          </div>

        </div>

        <textarea
          id="prompt"
          rows="1"
          placeholder="Digite sua mensagem..."
          oninput="autoResize(this)"
          onkeydown="handlePromptKey(event)"
        ></textarea>

        <button
          class="send-button"
          type="button"
          onclick="sendAI()"
        >
          ➤
        </button>

      </div>

    </div>
  `;

  if (!currentChatId) {

    const chats = await api("/api/chats");

    if (chats.chats.length) {

      currentChatId =
        chats.chats[0].id;

      await loadChat(currentChatId);

    } else {

      await newChat(true);
    }

  } else {

    await loadChat(currentChatId);
  }

  addSuggestions();
}


function addSuggestions() {

  const messages = $("#messages");

  if (!messages) return;

  if (messages.dataset.suggestions) return;

  const suggestions = document.createElement("div");

  suggestions.className = "suggestions-row";

  suggestions.innerHTML = `
    <button class="quick" onclick="usePrompt('Começar do zero')">
      Começar do zero
    </button>

    <button class="quick" onclick="usePrompt('Criar um criativo para anúncio')">
      Criativo
    </button>

    <button class="quick" onclick="usePrompt('Criar ideias de posts para Instagram')">
      Posts
    </button>

    <button class="quick" onclick="usePrompt('Criar uma copy para vender')">
      Copy
    </button>

    <button class="quick" onclick="usePrompt('Criar uma estratégia de vendas')">
      Estratégia
    </button>
  `;

  messages.appendChild(suggestions);

  messages.dataset.suggestions = "1";
}


function usePrompt(text) {

  const input = $("#prompt");

  if (!input) return;

  input.value = text;

  autoResize(input);

  input.focus();
}


function handlePromptKey(event) {

  if (
    event.key === "Enter" &&
    !event.shiftKey
  ) {

    event.preventDefault();

    sendAI();
  }
}


function autoResize(textarea) {

  textarea.style.height = "auto";

  textarea.style.height =
    Math.min(textarea.scrollHeight, 150) + "px";
}


/* =====================================================
   NOVA CONVERSA
===================================================== */

async function newChat(silent = false) {

  const data = await api(
    "/api/chats",
    {
      method: "POST",
      body: JSON.stringify({
        title: "Nova conversa"
      })
    }
  );

  currentChatId = data.chat.id;

  if (!silent) {

    show("workspace");

    await workspace();
  }
}


/* =====================================================
   CARREGAR CHAT
===================================================== */

async function loadChat(id) {

  const data =
    await api(`/api/chats/${id}`);

  const messages = $("#messages");

  if (!messages) return;

  messages.innerHTML = "";

  data.messages.forEach(message => {

    renderMessage(
      message.role,
      message.content
    );

  });

  if (!data.messages.length) {

    renderMessage(
      "assistant",
      `Olá! 👋

Como posso te ajudar hoje?

Estou aqui para te orientar em marketing digital, conteúdo, vendas online, afiliados e estratégias para renda extra.`
    );
  }

  scrollMessages();
}


function renderMessage(role, content) {

  const messages = $("#messages");

  if (!messages) return;

  const row =
    document.createElement("div");

  row.className =
    role === "user"
      ? "message-row message-user"
      : "message-row message-vertex";

  if (role === "assistant") {

    row.innerHTML = `
      <div class="vertex-avatar">
        ${vertexLogo()}
      </div>

      <div class="message-bubble">
        <div class="message-name">
          VÉRTEX AI
        </div>

        <div class="message-text"></div>
      </div>
    `;

  } else {

    const letter =
      (me?.name || "U")
        .charAt(0)
        .toUpperCase();

    row.innerHTML = `
      <div class="message-bubble">
        <div class="message-text"></div>
      </div>

      <div class="user-message-avatar">
        ${letter}
      </div>
    `;
  }

  const text =
    row.querySelector(".message-text");

  text.textContent = content;

  messages.appendChild(row);
}


async function sendAI() {

  const input = $("#prompt");

  if (!input) return;

  const prompt =
    input.value.trim();

  if (!prompt) return;

  input.value = "";

  autoResize(input);

  document
    .querySelector(".suggestions-row")
    ?.remove();

  renderMessage(
    "user",
    prompt
  );

  scrollMessages();

  const loading =
    document.createElement("div");

  loading.className =
    "message-row message-vertex";

  loading.innerHTML = `
    <div class="vertex-avatar">
      ${vertexLogo()}
    </div>

    <div class="message-bubble">
      <div class="message-name">VÉRTEX AI</div>
      <div class="message-text">Pensando...</div>
    </div>
  `;

  $("#messages").appendChild(loading);

  scrollMessages();

  try {

    const data =
      await api(
        "/api/ai/generate",
        {
          method: "POST",
          body: JSON.stringify({
            chatId: currentChatId,
            prompt
          })
        }
      );

    loading.remove();

    renderMessage(
      "assistant",
      data.message
    );

  } catch (error) {

    loading.remove();

    renderMessage(
      "assistant",
      "Não consegui responder agora. Tente novamente em alguns segundos."
    );

  }

  scrollMessages();
}


function scrollMessages() {

  const box = $("#messages");

  if (!box) return;

  requestAnimationFrame(() => {

    box.scrollTop =
      box.scrollHeight;

  });
}


/* =====================================================
   +
===================================================== */

function togglePlusMenu() {

  const menu =
    $("#plusMenu");

  if (!menu) return;

  menu.classList.toggle("hidden");
}


function openPlus(view) {

  $("#plusMenu")?.classList.add("hidden");

  show(view);

  if (view === "projects") loadProjects();
  if (view === "history") loadHistory();
  if (view === "plans") plans();
  if (view === "settings") settings();
}


/* =====================================================
   DASHBOARD
===================================================== */

function dashboard() {

  $("#dashboard").innerHTML = `
    <div class="page">

      <div class="page-inner">

        <h1>Olá, ${me?.name || "Usuário"} 👋</h1>

        <p class="page-subtitle">
          Seu ponto de partida para renda extra no digital.
        </p>

        <div class="cards">

          <div class="card">
            <div class="small muted">Créditos da IA</div>
            <h2>${me?.credits ?? 30}</h2>
          </div>

          <div class="card">
            <div class="small muted">Plano</div>
            <h2>${me?.plan || "FREE"}</h2>
          </div>

          <div class="card">
            <div class="small muted">Especialidade</div>
            <h2>RENDA</h2>
          </div>

        </div>

      </div>

    </div>
  `;
}


/* =====================================================
   FERRAMENTAS
===================================================== */

function templates() {

  $("#templates").innerHTML = `
    <div class="page">

      <div class="page-inner">

        <h1>Ferramentas</h1>

        <p class="page-subtitle">
          Atalhos para acelerar seu trabalho digital.
        </p>

        <div class="grid">

          <button class="quick"
            onclick="openTool('Começar do zero')">
            <strong>Começar do zero</strong>
            <div class="small muted">
              Monte uma estratégia desde o início.
            </div>
          </button>

          <button class="quick"
            onclick="openTool('Criar um criativo para anúncio')">
            <strong>Criativo</strong>
            <div class="small muted">
              Ideias de anúncios e ganchos.
            </div>
          </button>

          <button class="quick"
            onclick="openTool('Criar ideias de posts para Instagram')">
            <strong>Posts</strong>
            <div class="small muted">
              Conteúdo para redes sociais.
            </div>
          </button>

          <button class="quick"
            onclick="openTool('Criar uma copy para vender')">
            <strong>Copy</strong>
            <div class="small muted">
              Textos focados em conversão.
            </div>
          </button>

          <button class="quick"
            onclick="openTool('Criar uma estratégia de vendas')">
            <strong>Estratégia</strong>
            <div class="small muted">
              Planejamento de vendas.
            </div>
          </button>

        </div>

      </div>

    </div>
  `;
}


function openTool(text) {

  show("workspace");

  workspace().then(() => {
    usePrompt(text);
  });
}


/* =====================================================
   BÔNUS
===================================================== */

async function loadBonuses() {

  $("#bonuses").innerHTML = `
    <div class="page">
      <div class="page-inner">
        <h1>Bônus</h1>

        <p class="page-subtitle">
          Materiais extras do VÉRTEX.
        </p>

        <div class="cards">

          <div class="card">
            <h3>6 criativos bônus</h3>
            <p class="muted">
              Criativos prontos para adaptar às suas campanhas.
            </p>
          </div>

        </div>

      </div>
    </div>
  `;
}


/* =====================================================
   PROJETOS
===================================================== */

async function loadProjects() {

  try {

    const data =
      await api("/api/projects");

    $("#projects").innerHTML = `
      <div class="page">

        <div class="page-inner">

          <div class="row">
            <div>
              <h1>Projetos</h1>
              <p class="page-subtitle">
                Organize seus projetos.
              </p>
            </div>

            <button
              class="btn orange"
              onclick="createProject()"
            >
              + Novo projeto
            </button>
          </div>

          <div id="projectList"></div>

        </div>

      </div>
    `;

    const list =
      $("#projectList");

    if (!data.projects.length) {

      list.innerHTML = `
        <div class="card" style="margin-top:20px">
          <strong>Nenhum projeto ainda.</strong>
          <p class="muted">
            Crie seu primeiro projeto.
          </p>
        </div>
      `;

      return;
    }

    data.projects.forEach(project => {

      const item =
        document.createElement("div");

      item.className = "listitem";

      item.innerHTML = `
        <div>
          <strong>${escapeHtml(project.title)}</strong>
          <div class="small muted">
            ${escapeHtml(project.description || "Sem descrição")}
          </div>
        </div>

        <span class="badge">
          ${escapeHtml(project.status || "Ativo")}
        </span>
      `;

      list.appendChild(item);
    });

  } catch (error) {

    toast(error.message);
  }
}


async function createProject() {

  const title =
    prompt("Nome do projeto:");

  if (!title) return;

  const description =
    prompt("Descrição do projeto:") || "";

  await api(
    "/api/projects",
    {
      method: "POST",
      body: JSON.stringify({
        title,
        description
      })
    }
  );

  loadProjects();
}


/* =====================================================
   HISTÓRICO
===================================================== */

async function loadHistory() {

  try {

    const data =
      await api("/api/history");

    $("#history").innerHTML = `
      <div class="page">

        <div class="page-inner">

          <h1>Histórico</h1>

          <p class="page-subtitle">
            Suas conversas anteriores.
          </p>

          <div id="historyList"></div>

        </div>

      </div>
    `;

    const list =
      $("#historyList");

    if (!data.history.length) {

      list.innerHTML = `
        <div class="card" style="margin-top:20px">
          Nenhuma conversa ainda.
        </div>
      `;

      return;
    }

    data.history.forEach(item => {

      const el =
        document.createElement("button");

      el.className =
        "listitem";

      el.style.width = "100%";
      el.style.textAlign = "left";

      el.innerHTML = `
        <div>
          <strong>
            ${escapeHtml(item.title)}
          </strong>

          <div class="small muted">
            ${item.message_count} mensagens
          </div>
        </div>

        <span>›</span>
      `;

      el.onclick = async () => {

        currentChatId = item.id;

        show("workspace");

        await workspace();
      };

      list.appendChild(el);
    });

  } catch (error) {

    toast(error.message);
  }
}


/* =====================================================
   PLANOS
===================================================== */

async function loadPlans() {

  try {

    const data =
      await api("/api/plans");

    plansCache =
      data.plans || [];

  } catch {

    plansCache = [];
  }
}


function plans() {

  $("#plans").innerHTML = `
    <div class="page">

      <div class="page-inner">

        <h1>Planos</h1>

        <p class="page-subtitle">
          Escolha seu plano VÉRTEX.
        </p>

        <div class="plans">

          ${plansCache.map(plan => `

            <div class="card price ${
              plan.id === "PRO"
                ? "featured"
                : ""
            }">

              <h3>
                ${escapeHtml(plan.name)}
              </h3>

              <div class="price-value">
                ${escapeHtml(plan.price)}
              </div>

              <p>
                ${plan.credits} créditos
              </p>

              ${
                plan.checkout
                  ? `
                    <button
                      class="btn orange"
                      onclick="checkout('${plan.id}')"
                    >
                      Escolher plano
                    </button>
                  `
                  : `
                    <button
                      class="btn"
                      disabled
                    >
                      Plano atual
                    </button>
                  `
              }

            </div>

          `).join("")}

        </div>

      </div>

    </div>
  `;
}


function checkout(id) {

  const plan =
    plansCache.find(
      item => item.id === id
    );

  if (!plan || !plan.checkout) return;

  window.open(
    plan.checkout,
    "_blank"
  );
}


/* =====================================================
   CONFIGURAÇÕES
===================================================== */

function settings() {

  $("#settings").innerHTML = `
    <div class="page">

      <div class="page-inner">

        <h1>Configurações</h1>

        <p class="page-subtitle">
          Informações da sua conta.
        </p>

        <div class="panel">

          <div class="form">

            <div class="field">
              <label>Nome</label>
              <input
                value="${escapeHtml(me?.name || "")}"
                disabled
              >
            </div>

            <div class="field">
              <label>E-mail</label>
              <input
                value="${escapeHtml(me?.email || "")}"
                disabled
              >
            </div>

            <button
              class="btn"
              onclick="logout()"
            >
              Sair da conta
            </button>

          </div>

        </div>

      </div>

    </div>
  `;
}


/* =====================================================
   LOGOUT
===================================================== */

function logout() {

  token = null;
  me = null;
  currentChatId = null;

  localStorage.removeItem(
    "vertex_token"
  );

  location.reload();
}


/* =====================================================
   UTILITÁRIOS
===================================================== */

function escapeHtml(value) {

  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function toast(message) {

  const old =
    document.querySelector(".toast");

  old?.remove();

  const el =
    document.createElement("div");

  el.className = "toast";

  el.textContent = message;

  document.body.appendChild(el);

  setTimeout(() => {
    el.remove();
  }, 3000);
}


/* =====================================================
   RENDER
===================================================== */

function renderAll() {

  dashboard();

  templates();

  loadBonuses();

  loadProjects();

  loadHistory();

  plans();

  settings();

  bindNavigation();
}


/* =====================================================
   INÍCIO
===================================================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    start();

  }
);

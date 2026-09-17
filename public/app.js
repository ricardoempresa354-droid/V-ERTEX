const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let token = localStorage.getItem("vertex_token");
let me = null;
let plansCache = [];
let currentChatId = null;

const meta = {
  dashboard: [
    "Dashboard",
    "Seu ponto de partida para renda extra no digital."
  ],
  workspace: [
    "VÉRTEX IA",
    "Peça para a IA criar, orientar e organizar sua próxima ação."
  ],
  templates: [
    "Ferramentas",
    "Comandos prontos para renda extra."
  ],
  bonuses: [
    "6 criativos bônus",
    "Use seus 6 criativos prontos."
  ],
  projects: [
    "Meus projetos",
    "Organize campanhas, posts e estratégias."
  ],
  history: [
    "Histórico",
    "Tudo que você já gerou fica aqui."
  ],
  plans: [
    "Assinatura",
    "Escolha seu acesso ao VÉRTEX AI."
  ],
  settings: [
    "Configurações",
    "Gerencie seu perfil e sessão."
  ]
};


/* =========================================
   API
========================================= */

async function api(url, opt = {}) {

  const options = {
    ...opt,
    headers: {
      "Content-Type": "application/json",
      ...(opt.headers || {})
    }
  };

  if (token) {
    options.headers.Authorization =
      `Bearer ${token}`;
  }

  const response =
    await fetch(url, options);

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      "Ocorreu um erro."
    );
  }

  return data;
}


/* =========================================
   LOGIN
========================================= */

function authMode(mode) {

  const loginTab =
    $("#loginTab");

  const registerTab =
    $("#registerTab");

  const form =
    $("#authForm");

  if (!loginTab || !registerTab || !form) {
    return;
  }

  loginTab.classList.toggle(
    "on",
    mode === "login"
  );

  registerTab.classList.toggle(
    "on",
    mode === "register"
  );

  $("#authError").textContent = "";

  if (mode === "login") {

    form.innerHTML = `
      <form class="form" onsubmit="login(event)">

        <div class="field">
          <label>E-mail</label>
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            required
          >
        </div>

        <div class="field">
          <label>Senha</label>
          <input
            id="password"
            type="password"
            placeholder="Sua senha"
            required
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
            placeholder="Seu nome"
            required
          >
        </div>

        <div class="field">
          <label>E-mail</label>
          <input
            id="email"
            type="email"
            placeholder="seu@email.com"
            required
          >
        </div>

        <div class="field">
          <label>Senha</label>
          <input
            id="password"
            type="password"
            placeholder="Mínimo de 6 caracteres"
            minlength="6"
            required
          >
        </div>

        <button class="btn orange" type="submit">
          Criar minha conta
        </button>

      </form>
    `;
  }
}


async function login(e) {

  e.preventDefault();

  const email =
    $("#email").value.trim();

  const password =
    $("#password").value;

  try {

    const data =
      await api(
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

  } catch (error) {

    $("#authError").textContent =
      error.message;
  }
}


async function register(e) {

  e.preventDefault();

  const name =
    $("#name").value.trim();

  const email =
    $("#email").value.trim();

  const password =
    $("#password").value;

  try {

    const data =
      await api(
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

  } catch (error) {

    $("#authError").textContent =
      error.message;
  }
}


async function start() {

  try {

    const data =
      await api("/api/me");

    me = data.user;

    $("#auth").classList.add("hidden");

    $("#app").classList.remove("hidden");

    if ($("#userName")) {
      $("#userName").textContent =
        me.name || "Usuário";
    }

    const avatar =
      document.querySelector(
        ".top-user-avatar"
      );

    if (avatar) {
      avatar.textContent =
        (me.name || "U")
          .charAt(0)
          .toUpperCase();
    }

    const sideAvatar =
      document.querySelector(
        ".side-user .user-message-avatar"
      );

    if (sideAvatar) {
      sideAvatar.textContent =
        (me.name || "U")
          .charAt(0)
          .toUpperCase();
    }

    await loadPlans();

    renderAll();

    show("workspace");

  } catch (error) {

    console.error(error);

    token = null;

    localStorage.removeItem(
      "vertex_token"
    );

    $("#auth").classList.remove("hidden");

    $("#app").classList.add("hidden");

    authMode("login");
  }
}


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


/* =========================================
   NAVEGAÇÃO
========================================= */

function show(id) {

  $$(".view").forEach(
    (view) => {
      view.classList.toggle(
        "on",
        view.id === id
      );
    }
  );

  const info =
    meta[id];

  if (info) {

    if ($("#title")) {
      $("#title").textContent =
        info[0];
    }

    if ($("#sub")) {
      $("#sub").textContent =
        info[1];
    }
  }

  $$(".side nav button")
    .forEach(
      (button) => {
        button.classList.toggle(
          "active",
          button.dataset.view === id
        );
      }
    );

  document.body.classList.remove(
    "menu-open"
  );

  if (id === "projects") {
    loadProjects();
  }

  if (id === "history") {
    loadHistory();
  }

  if (id === "bonuses") {
    loadBonuses();
  }
}


function bindNavigation() {

  $$(".side nav button")
    .forEach(
      (button) => {

        button.onclick = () => {

          show(
            button.dataset.view
          );
        };
      }
    );
}


/* =========================================
   DASHBOARD
========================================= */

function dashboard() {

  const credits =
    me?.credits ?? 30;

  const plan =
    me?.plan || "FREE";

  $("#dashboard").innerHTML = `

    <div class="page">

      <div class="page-inner">

        <h1>Olá, ${esc(
          me?.name || "Usuário"
        )} 👋</h1>

        <p class="page-subtitle">
          Vamos transformar sua próxima ideia em uma ação.
        </p>

        <div class="cards">

          <div class="card">
            <h3>Créditos da IA</h3>

            <div class="metric">
              ${credits}
            </div>

            <div class="small muted">
              Créditos disponíveis
            </div>
          </div>

          <div class="card">
            <h3>Seu plano</h3>

            <div class="metric purpleText">
              ${esc(plan)}
            </div>

            <div class="small muted">
              Acesso atual
            </div>
          </div>

          <div class="card">
            <h3>Especialidade</h3>

            <div class="metric green">
              RENDA
            </div>

            <div class="small muted">
              Marketing digital
            </div>
          </div>

        </div>

        <div class="panel" style="margin-top:15px">

          <h3>
            Comece agora
          </h3>

          <p class="muted">
            Escolha uma ação para abrir a VÉRTEX IA.
          </p>

          <div class="quick">

            <button
              class="tool"
              onclick="openAI('Quero começar do zero no marketing digital e aprender formas legítimas de vender online.')"
            >
              💡 Começar do zero
            </button>

            <button
              class="tool"
              onclick="openAI('Crie um criativo para anúncio de um produto de renda extra, com gancho, texto, título e CTA.')"
            >
              ✎ Criativo
            </button>

            <button
              class="tool"
              onclick="openAI('Crie 7 ideias de posts para Instagram sobre renda extra e marketing digital.')"
            >
              ▧ Posts
            </button>

            <button
              class="tool"
              onclick="openAI('Crie uma copy curta e persuasiva para divulgar um produto como afiliado.')"
            >
              ▣ Copy
            </button>

            <button
              class="tool"
              onclick="openAI('Monte uma estratégia simples para começar a vender como afiliado usando Instagram e conteúdo.')"
            >
              ◎ Estratégia
            </button>

          </div>

        </div>

      </div>

    </div>
  `;
}


/* =========================================
   AVATAR
========================================= */

function vertexAvatar() {

  return `
    <div class="vertex-avatar">

      <svg viewBox="0 0 100 100">
        <path d="M14 10h27l9 17 9-17h27L50 90 14 10z"/>
      </svg>

    </div>
  `;
}


function userAvatar() {

  const letter =
    (me?.name || "U")
      .charAt(0)
      .toUpperCase();

  return `
    <div class="user-message-avatar">
      ${esc(letter)}
    </div>
  `;
}


/* =========================================
   CHAT
========================================= */

function workspace() {

  $("#workspace").innerHTML = `

    <div class="panel chat">

      <div class="messages" id="messages">

        <div class="message-row message-vertex">

          <div class="message-wrap">

            ${vertexAvatar()}

            <div>

              <div class="message-bubble">

                <div class="message-name">
                  VÉRTEX AI
                </div>

                <div class="message-text">
Olá, ${esc(me?.name || "Ricardo")}! 👋

Como posso te ajudar hoje?

Estou aqui para te orientar em marketing digital, conteúdo, vendas online, afiliados e estratégias para renda extra.
                </div>

              </div>

              <div class="message-time">
                agora
              </div>

            </div>

          </div>

        </div>

      </div>


      <div class="quick">

        <button
          class="tool"
          onclick="setPrompt('Quero começar do zero no marketing digital.')"
        >
          💡 Começar do zero
        </button>

        <button
          class="tool"
          onclick="setPrompt('Crie um criativo para anúncio.')"
        >
          ✎ Criativo
        </button>

        <button
          class="tool"
          onclick="setPrompt('Crie 7 posts para Instagram.')"
        >
          ▧ Posts
        </button>

        <button
          class="tool"
          onclick="setPrompt('Crie uma copy para vendas como afiliado.')"
        >
          ▣ Copy
        </button>

        <button
          class="tool"
          onclick="setPrompt('Monte uma estratégia para vender como afiliado.')"
        >
          ◎ Estratégia
        </button>

      </div>


      <div class="composer">

        <div class="plus-wrap">

          <button
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
              onclick="show('projects'); closePlusMenu()"
            >
              <span>📁 Projetos</span>
              <span>›</span>
            </button>

            <button
              class="plus-option"
              onclick="show('history'); closePlusMenu()"
            >
              <span>◷ Histórico</span>
              <span>›</span>
            </button>

            <button
              class="plus-option"
              onclick="show('plans'); closePlusMenu()"
            >
              <span>▣ Planos</span>
              <span>›</span>
            </button>

            <button
              class="plus-option"
              onclick="show('settings'); closePlusMenu()"
            >
              <span>⚙ Configurações</span>
              <span>›</span>
            </button>

          </div>

        </div>


        <textarea
          id="prompt"
          rows="1"
          placeholder="Digite sua mensagem..."
          onkeydown="handlePromptKey(event)"
          oninput="autoResizeTextarea(this)"
        ></textarea>


        <button
          id="sendButton"
          class="send-button"
          type="button"
          onclick="sendAI()"
        >
          ➤
        </button>

      </div>

    </div>
  `;
}


function handlePromptKey(e) {

  if (
    e.key === "Enter" &&
    !e.shiftKey
  ) {

    e.preventDefault();

    sendAI();
  }
}


function togglePlusMenu() {

  const menu =
    $("#plusMenu");

  if (!menu) return;

  menu.classList.toggle(
    "hidden"
  );
}


function closePlusMenu() {

  const menu =
    $("#plusMenu");

  if (menu) {
    menu.classList.add(
      "hidden"
    );
  }
}


function setPrompt(text) {

  show("workspace");

  const input =
    $("#prompt");

  if (!input) return;

  input.value = text;

  autoResizeTextarea(input);

  input.focus();
}


function autoResizeTextarea(el) {

  el.style.height = "auto";

  el.style.height =
    Math.min(
      el.scrollHeight,
      150
    ) + "px";
}


/* =========================================
   ENVIAR IA
========================================= */

async function sendAI() {

  const input =
    $("#prompt");

  const messages =
    $("#messages");

  if (!input || !messages) {
    return;
  }

  const prompt =
    input.value.trim();

  if (!prompt) {
    return;
  }

  input.value = "";

  autoResizeTextarea(input);

  closePlusMenu();


  if (!currentChatId) {

    try {

      const data =
        await api(
          "/api/chats",
          {
            method: "POST",
            body: JSON.stringify({
              title:
                prompt.length > 45
                  ? prompt.slice(0,45) + "..."
                  : prompt
            })
          }
        );

      currentChatId =
        data.chat.id;

    } catch (error) {

      toast(error.message);

      return;
    }
  }


  messages.insertAdjacentHTML(
    "beforeend",
    `
      <div class="message-row message-user">

        <div class="message-wrap">

          ${userAvatar()}

          <div>

            <div class="message-bubble">

              <div class="message-text">
                ${esc(prompt)}
              </div>

            </div>

            <div class="message-time">
              agora
            </div>

          </div>

        </div>

      </div>
    `
  );


  messages.insertAdjacentHTML(
    "beforeend",
    `
      <div
        id="vertexLoading"
        class="message-row message-vertex"
      >

        <div class="message-wrap">

          ${vertexAvatar()}

          <div class="message-bubble">

            <div class="message-name">
              VÉRTEX AI
            </div>

            <div class="vertex-loading">

              <span></span>
              <span></span>
              <span></span>

              <span style="margin-left:4px">
                Pensando...
              </span>

            </div>

          </div>

        </div>

      </div>
    `
  );


  messages.scrollTop =
    messages.scrollHeight;


  try {

    const result =
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


    const loading =
      $("#vertexLoading");

    if (loading) {
      loading.remove();
    }


    messages.insertAdjacentHTML(
      "beforeend",
      `
        <div class="message-row message-vertex">

          <div class="message-wrap">

            ${vertexAvatar()}

            <div>

              <div class="message-bubble">

                <div class="message-name">
                  VÉRTEX AI
                </div>

                <div class="message-text">
                  ${esc(result.message || "")}
                </div>

              </div>

              <div class="message-time">
                agora
              </div>

            </div>

          </div>

        </div>
      `
    );


    messages.scrollTop =
      messages.scrollHeight;

  } catch (error) {

    const loading =
      $("#vertexLoading");

    if (loading) {
      loading.remove();
    }

    messages.insertAdjacentHTML(
      "beforeend",
      `
        <div class="message-row message-vertex">

          <div class="message-wrap">

            ${vertexAvatar()}

            <div class="message-bubble error">

              ${esc(error.message)}

            </div>

          </div>

        </div>
      `
    );
  }
}


/* =========================================
   FERRAMENTAS
========================================= */

function templates() {

  $("#templates").innerHTML = `

    <div class="page">

      <div class="page-inner">

        <h1>Ferramentas</h1>

        <p class="page-subtitle">
          Comandos prontos para você usar na VÉRTEX IA.
        </p>

        <div class="cards">

          <div class="card">

            <h3>Começar do zero</h3>

            <p class="muted small">
              Aprenda os primeiros passos no digital.
            </p>

            <button
              class="btn orange"
              onclick="openAI('Me ensine passo a passo como começar no marketing digital do zero.')"
            >
              Usar
            </button>

          </div>

          <div class="card">

            <h3>Criativo</h3>

            <p class="muted small">
              Gere ideias de anúncios.
            </p>

            <button
              class="btn orange"
              onclick="openAI('Crie um criativo completo para um anúncio.')"
            >
              Usar
            </button>

          </div>

          <div class="card">

            <h3>Posts</h3>

            <p class="muted small">
              Ideias para conteúdo.
            </p>

            <button
              class="btn orange"
              onclick="openAI('Crie 7 ideias de posts para Instagram.')"
            >
              Usar
            </button>

          </div>

          <div class="card">

            <h3>Copy</h3>

            <p class="muted small">
              Textos para divulgação.
            </p>

            <button
              class="btn orange"
              onclick="openAI('Crie uma copy curta para divulgar um produto como afiliado.')"
            >
              Usar
            </button>

          </div>

        </div>

      </div>

    </div>
  `;
}


/* =========================================
   BÔNUS
========================================= */

async function loadBonuses() {

  $("#bonuses").innerHTML = `

    <div class="page">

      <div class="page-inner">

        <h1>6 criativos bônus</h1>

        <p class="page-subtitle">
          Seus criativos prontos para começar.
        </p>

        <div class="cards">

          ${[
            "Criativo 01",
            "Criativo 02",
            "Criativo 03",
            "Criativo 04",
            "Criativo 05",
            "Criativo 06"
          ].map(
            (name, index) => `
              <div class="card">

                <h3>${name}</h3>

                <p class="muted small">
                  Criativo pronto para adaptar.
                </p>

                <button
                  class="btn orange"
                  onclick="openAI('Crie uma versão completa do ${name} para divulgação de um produto digital.')"
                >
                  Usar criativo
                </button>

              </div>
            `
          ).join("")}

        </div>

      </div>

    </div>
  `;
}


async function useBonus(id) {

  openAI(
    "Crie um criativo profissional para divulgação de um produto digital."
  );
}


/* =========================================
   PROJETOS
========================================= */

async function loadProjects() {

  try {

    const data =
      await api("/api/projects");

    const projects =
      data.projects || [];

    $("#projects").innerHTML = `

      <div class="page">

        <div class="page-inner">

          <div class="row">

            <div>

              <h1>Meus projetos</h1>

              <p class="page-subtitle">
                Organize suas ideias e campanhas.
              </p>

            </div>

            <button
              class="btn orange"
              onclick="newProject()"
            >
              + Novo projeto
            </button>

          </div>

          <div style="margin-top:20px">

            ${
              projects.length
                ? projects.map(
                    (project) => `
                      <div class="project-card">

                        <div class="row">

                          <div>

                            <strong>
                              ${esc(project.title)}
                            </strong>

                            <div class="small muted">
                              ${esc(project.description || "Sem descrição")}
                            </div>

                          </div>

                          <span class="small green">
                            ${esc(project.status || "Ativo")}
                          </span>

                        </div>

                        <div class="project-actions">

                          <button
                            class="btn"
                            onclick="editProject(${project.id})"
                          >
                            Editar
                          </button>

                          <button
                            class="btn"
                            onclick="deleteProject(${project.id})"
                          >
                            Excluir
                          </button>

                        </div>

                      </div>
                    `
                  ).join("")
                : `
                  <div class="panel">
                    <p class="muted">
                      Você ainda não possui projetos.
                    </p>

                    <button
                      class="btn orange"
                      onclick="newProject()"
                    >
                      Criar primeiro projeto
                    </button>
                  </div>
                `
            }

          </div>

        </div>

      </div>
    `;

  } catch (error) {

    toast(error.message);
  }
}


async function newProject() {

  const title =
    prompt("Nome do projeto:");

  if (!title) return;

  const description =
    prompt("Descrição do projeto:") || "";

  try {

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

    toast("Projeto criado.");

    loadProjects();

  } catch (error) {

    toast(error.message);
  }
}


async function editProject(id) {

  const title =
    prompt("Novo nome do projeto:");

  if (!title) return;

  const description =
    prompt("Nova descrição:") || "";

  try {

    await api(
      `/api/projects/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          title,
          description,
          status: "Ativo"
        })
      }
    );

    toast("Projeto atualizado.");

    loadProjects();

  } catch (error) {

    toast(error.message);
  }
}


async function deleteProject(id) {

  if (
    !confirm(
      "Excluir este projeto?"
    )
  ) {
    return;
  }

  try {

    await api(
      `/api/projects/${id}`,
      {
        method: "DELETE"
      }
    );

    toast("Projeto excluído.");

    loadProjects();

  } catch (error) {

    toast(error.message);
  }
}


/* =========================================
   HISTÓRICO
========================================= */

async function loadHistory() {

  try {

    const data =
      await api("/api/history");

    const history =
      data.history || [];

    $("#history").innerHTML = `

      <div class="page">

        <div class="page-inner">

          <h1>Histórico</h1>

          <p class="page-subtitle">
            Suas conversas anteriores.
          </p>

          <div style="margin-top:20px">

            ${
              history.length
                ? history.map(
                    (item) => `
                      <div class="history-card">

                        <div class="row">

                          <div>

                            <strong>
                              ${esc(item.title)}
                            </strong>

                            <div class="small muted">
                              ${item.message_count || 0}
                              mensagens
                            </div>

                          </div>

                          <button
                            class="btn"
                            onclick="openHistoryChat(${item.id})"
                          >
                            Abrir
                          </button>

                        </div>

                      </div>
                    `
                  ).join("")
                : `
                  <div class="panel">
                    <p class="muted">
                      Seu histórico aparecerá aqui.
                    </p>
                  </div>
                `
            }

          </div>

        </div>

      </div>
    `;

  } catch (error) {

    toast(error.message);
  }
}


async function openHistoryChat(id) {

  try {

    const data =
      await api(
        `/api/chats/${id}`
      );

    currentChatId =
      data.chat.id;

    show("workspace");

    const messages =
      $("#messages");

    messages.innerHTML = "";

    for (
      const message
      of data.messages
    ) {

      if (
        message.role === "user"
      ) {

        messages.insertAdjacentHTML(
          "beforeend",
          `
            <div class="message-row message-user">

              <div class="message-wrap">

                ${userAvatar()}

                <div>

                  <div class="message-bubble">

                    <div class="message-text">
                      ${esc(message.content)}
                    </div>

                  </div>

                </div>

              </div>

            </div>
          `
        );

      } else {

        messages.insertAdjacentHTML(
          "beforeend",
          `
            <div class="message-row message-vertex">

              <div class="message-wrap">

                ${vertexAvatar()}

                <div>

                  <div class="message-bubble">

                    <div class="message-name">
                      VÉRTEX AI
                    </div>

                    <div class="message-text">
                      ${esc(message.content)}
                    </div>

                  </div>

                </div>

              </div>

            </div>
          `
        );
      }
    }

    messages.scrollTop =
      messages.scrollHeight;

  } catch (error) {

    toast(error.message);
  }
}


/* =========================================
   PLANOS
========================================= */

function plans() {

  const plans =
    plansCache.length
      ? plansCache
      : [
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
            checkout:
              "https://pay.cakto.com.br/ubpqtkf_1087308"
          },
          {
            id: "PRO_ANNUAL",
            name: "PRO Anual",
            price: "R$ 190,00",
            credits: 8000,
            checkout:
              "https://pay.cakto.com.br/qikjmty"
          }
        ];

  $("#plans").innerHTML = `

    <div class="page">

      <div class="page-inner">

        <h1>Escolha seu acesso</h1>

        <p class="page-subtitle">
          Tenha acesso às ferramentas da VÉRTEX AI.
        </p>

        <div class="plans">

          ${plans.map(
            (plan) => `

              <div
                class="card price ${
                  plan.id === "PRO"
                    ? "featured"
                    : ""
                }"
              >

                <h2>
                  ${esc(plan.name)}
                </h2>

                <div class="price">
                  ${esc(plan.price)}
                </div>

                <ul>

                  <li>
                    ${plan.credits}
                    créditos
                  </li>

                  <li>
                    VÉRTEX IA
                  </li>

                  <li>
                    Ferramentas digitais
                  </li>

                  <li>
                    Projetos e histórico
                  </li>

                </ul>

                ${
                  plan.id === "FREE"
                    ? `
                      <button
                        class="btn"
                        onclick="selectFreePlan()"
                      >
                        Plano atual / grátis
                      </button>
                    `
                    : `
                      <button
                        class="btn orange"
                        onclick="checkout('${plan.id}')"
                      >
                        Assinar ${esc(plan.name)}
                      </button>
                    `
                }

              </div>
            `
          ).join("")}

        </div>

        <div class="panel" style="margin-top:15px">

          <strong>
            Pagamento
          </strong>

          <p class="muted small">
            O pagamento das assinaturas é realizado pela Cakto.
          </p>

        </div>

      </div>

    </div>
  `;
}


/* =========================================
   PLANO GRÁTIS
========================================= */

async function selectFreePlan() {

  toast(
    "Você já está no plano gratuito."
  );
}


/* =========================================
   CHECKOUT
========================================= */

function checkout(plan) {

  const selected =
    plansCache.find(
      (item) =>
        item.id === plan
    );

  if (
    !selected ||
    !selected.checkout
  ) {

    toast(
      "Checkout indisponível."
    );

    return;
  }

  window.open(
    selected.checkout,
    "_blank"
  );
}


/* =========================================
   CONFIGURAÇÕES
========================================= */

function settings() {

  $("#settings").innerHTML = `

    <div class="page">

      <div class="page-inner">

        <h1>Configurações</h1>

        <p class="page-subtitle">
          Gerencie seus dados da conta.
        </p>

        <div
          class="panel"
          style="margin-top:20px"
        >

          <form
            class="form"
            onsubmit="saveAccount(event)"
          >

            <div class="field">

              <label>
                Nome
              </label>

              <input
                id="settingsName"
                value="${esc(me?.name || "")}"
                required
              >

            </div>

            <div class="field">

              <label>
                E-mail
              </label>

              <input
                value="${esc(me?.email || "")}"
                disabled
              >

            </div>

            <button
              class="btn orange"
              type="submit"
            >
              Salvar alterações
            </button>

          </form>

          <button
            class="btn"
            style="margin-top:10px"
            onclick="logout()"
          >
            Sair da conta
          </button>

        </div>

      </div>

    </div>
  `;
}


async function saveAccount(e) {

  e.preventDefault();

  toast(
    "Configuração salva nesta sessão."
  );
}


/* =========================================
   RENDER
========================================= */

function renderAll() {

  dashboard();

  workspace();

  templates();

  loadBonuses();

  loadProjects();

  loadHistory();

  plans();

  settings();

  bindNavigation();
}


/* =========================================
   ATALHO IA
========================================= */

function openAI(text) {

  currentChatId = null;

  show("workspace");

  setTimeout(
    () => {

      if (text) {
        setPrompt(text);
      } else {

        const input =
          $("#prompt");

        if (input) {
          input.focus();
        }
      }

    },
    50
  );
}


/* =========================================
   LOGOUT
========================================= */

function logout() {

  token = null;

  me = null;

  currentChatId = null;

  localStorage.removeItem(
    "vertex_token"
  );

  $("#app").classList.add(
    "hidden"
  );

  $("#auth").classList.remove(
    "hidden"
  );

  authMode("login");

  toast("Sessão encerrada.");
}


/* =========================================
   TOAST
========================================= */

function toast(text) {

  const old =
    $(".toast");

  if (old) {
    old.remove();
  }

  const element =
    document.createElement("div");

  element.className =
    "toast";

  element.textContent =
    text;

  document.body.appendChild(
    element
  );

  setTimeout(
    () => {
      element.remove();
    },
    2600
  );
}


/* =========================================
   ESCAPE
========================================= */

function esc(s) {

  return String(s ?? "")
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


/* =========================================
   CLIQUE FORA DO +
========================================= */

document.addEventListener(
  "click",
  (e) => {

    const menu =
      $("#plusMenu");

    const button =
      e.target.closest(
        ".plus-button"
      );

    if (
      menu &&
      !menu.contains(e.target) &&
      !button
    ) {

      menu.classList.add(
        "hidden"
      );
    }
  }
);


/* =========================================
   INÍCIO
========================================= */

authMode("login");

if (token) {
  start();
}

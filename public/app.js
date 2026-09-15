const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let token = localStorage.getItem("vertex_token");
let me = null;
let plansCache = [];

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
    "Use seus 6 criativos prontos. Depois, continue pela assinatura."
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

/* =========================
   API
========================= */

async function api(url, opt = {}) {
  opt.headers = {
    ...(opt.headers || {}),
    "Content-Type": "application/json",
    ...(token
      ? { Authorization: "Bearer " + token }
      : {})
  };

  const r = await fetch(url, opt);

  const d = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(
      d.error || "Erro ao comunicar com o servidor."
    );
  }

  return d;
}

/* =========================
   LOGIN / CADASTRO
========================= */

function authMode(mode) {
  const loginTab = $("#loginTab");
  const registerTab = $("#registerTab");
  const authForm = $("#authForm");

  if (loginTab) {
    loginTab.classList.toggle(
      "on",
      mode === "login"
    );
  }

  if (registerTab) {
    registerTab.classList.toggle(
      "on",
      mode === "register"
    );
  }

  if (!authForm) return;

  authForm.innerHTML =
    mode === "login"
      ? `
        <form class="form" onsubmit="login(event)">
          <div class="field">
            <label>E-mail</label>
            <input
              id="email"
              type="email"
              required
            >
          </div>

          <div class="field">
            <label>Senha</label>
            <input
              id="password"
              type="password"
              required
            >
          </div>

          <button
            class="btn orange"
            type="submit"
          >
            Entrar
          </button>
        </form>
      `
      : `
        <form
          class="form"
          onsubmit="register(event)"
        >
          <div class="field">
            <label>Nome</label>
            <input
              id="name"
              required
            >
          </div>

          <div class="field">
            <label>E-mail</label>
            <input
              id="email"
              type="email"
              required
            >
          </div>

          <div class="field">
            <label>Senha</label>
            <input
              id="password"
              type="password"
              minlength="6"
              required
            >
          </div>

          <button
            class="btn orange"
            type="submit"
          >
            Criar minha conta
          </button>
        </form>
      `;
}

async function login(e) {
  e.preventDefault();

  try {
    const d = await api(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          email: $("#email").value,
          password: $("#password").value
        })
      }
    );

    token = d.token;

    localStorage.setItem(
      "vertex_token",
      token
    );

    await start();

  } catch (e) {
    if ($("#authError")) {
      $("#authError").textContent =
        e.message;
    }
  }
}

async function register(e) {
  e.preventDefault();

  try {
    const d = await api(
      "/api/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          name: $("#name").value,
          email: $("#email").value,
          password: $("#password").value
        })
      }
    );

    token = d.token;

    localStorage.setItem(
      "vertex_token",
      token
    );

    await start();

  } catch (e) {
    if ($("#authError")) {
      $("#authError").textContent =
        e.message;
    }
  }
}

async function start() {
  try {
    me = (
      await api("/api/me")
    ).user;

    if ($("#auth")) {
      $("#auth").classList.add("hidden");
    }

    if ($("#app")) {
      $("#app").classList.remove("hidden");
    }

    if ($("#userName")) {
      $("#userName").textContent =
        me.name;
    }

    await loadPlans();

    renderAll();

    show("dashboard");

  } catch (e) {
    localStorage.removeItem(
      "vertex_token"
    );

    token = null;

    if ($("#auth")) {
      $("#auth").classList.remove("hidden");
    }
  }
}

async function loadPlans() {
  try {
    const d = await api(
      "/api/plans"
    );

    plansCache =
      Array.isArray(d.plans)
        ? d.plans
        : [];

  } catch {
    /*
      Fallback para os planos.
      Assim os botões continuam funcionando
      mesmo se a API dos planos estiver
      temporariamente indisponível.
    */

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
  }

  /*
    Garante os preços e checkouts corretos
    mesmo se o servidor ainda estiver
    retornando valores antigos.
  */

  plansCache = plansCache.map((p) => {

    if (p.id === "PRO") {
      return {
        ...p,
        name: "PRO",
        price: "R$ 39,90",
        checkout:
          p.checkout ||
          "https://pay.cakto.com.br/ubpqtkf_1087308"
      };
    }

    if (p.id === "PRO_ANNUAL") {
      return {
        ...p,
        name: "PRO Anual",
        price: "R$ 190,00",
        checkout:
          p.checkout ||
          "https://pay.cakto.com.br/qikjmty"
      };
    }

    return p;
  });
}

/* =========================
   NAVEGAÇÃO
========================= */

function show(id) {
  $$(".view").forEach((x) => {
    x.classList.remove("on");
  });

  const view = $("#" + id);

  if (view) {
    view.classList.add("on");
  }

  $$(".side nav button").forEach((x) => {
    x.classList.toggle(
      "on",
      x.dataset.view === id
    );
  });

  if (meta[id]) {

    if ($("#title")) {
      $("#title").textContent =
        meta[id][0];
    }

    if ($("#sub")) {
      $("#sub").textContent =
        meta[id][1];
    }
  }

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
  $$(".side nav button").forEach((b) => {
    b.onclick = () => {
      show(b.dataset.view);
    };
  });
}

/* =========================
   DASHBOARD
========================= */

function dashboard() {
  return `
    <div class="cards">

      <div class="card">
        <div class="small muted">
          Créditos da IA
        </div>

        <div class="metric">
          ${me.credits}
        </div>

        <div class="green">
          Plano ${esc(me.plan)}
        </div>
      </div>

      <div class="card">
        <div class="small muted">
          Bônus usados
        </div>

        <div class="metric">
          ${me.bonus_used || 0}/6
        </div>

        <div class="purpleText">
          6 criativos disponíveis
        </div>
      </div>

      <div class="card">
        <div class="small muted">
          Especialidade
        </div>

        <div class="metric">
          RENDA
        </div>

        <div class="green">
          Renda extra online
        </div>
      </div>

      <div class="card">
        <div class="small muted">
          IA
        </div>

        <div class="metric">
          ON
        </div>

        <div class="small muted">
          Suporte focado no nicho
        </div>
      </div>

    </div>

    <div class="grid">

      <div class="panel">

        <h2>
          O que você quer fazer?
        </h2>

        <div class="quick">

          <button
            onclick="openAI(
              'Estou começando do zero. Monte um passo a passo simples para começar no nicho de renda extra online.'
            )"
          >
            <strong>
              🚀 Começar do zero
            </strong>

            <small>
              Receba orientação passo a passo.
            </small>
          </button>

          <button
            onclick="openAI(
              'Crie um criativo completo para anúncio de renda extra, com gancho, texto, título e CTA.'
            )"
          >
            <strong>
              🎨 Criar criativo
            </strong>

            <small>
              Anúncios prontos para adaptar.
            </small>
          </button>

          <button
            onclick="openAI(
              'Crie 7 posts para Instagram sobre renda extra online, cada um com legenda e CTA.'
            )"
          >
            <strong>
              📱 Criar posts
            </strong>

            <small>
              Conteúdo para redes sociais.
            </small>
          </button>

          <button
            onclick="openAI(
              'Me ajude a montar uma estratégia de divulgação para começar no nicho de renda extra.'
            )"
          >
            <strong>
              💰 Estratégia
            </strong>

            <small>
              Plano de ação para executar.
            </small>
          </button>

        </div>
      </div>

      <div class="panel">

        <h2>
          Seu próximo passo
        </h2>

        <p class="muted">
          Se você é novo, peça:
          <b>“me guia do zero”</b>.
          O VÉRTEX foi feito para responder
          dentro do nicho de renda extra.
        </p>

        <button
          class="btn orange"
          onclick="show('workspace')"
        >
          Falar com a IA
        </button>

      </div>

    </div>
  `;
}

/* =========================
   AVATAR VÉRTEX
========================= */

function vertexAvatar() {
  return `
    <div class="vertex-avatar">

      <svg
        viewBox="0 0 40 40"
        width="28"
        height="28"
        aria-hidden="true"
      >

        <path
          d="
            M8 6
            L17 6
            L20 17
            L28 5
            L34 5
            L24 20
            L31 34
            L23 34
            L19 24
            L11 35
            L5 35
            L15 20
            Z
          "
          fill="currentColor"
        />

      </svg>

    </div>
  `;
}

function userAvatar() {
  const name = String(
    me?.name || "U"
  )
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0])
    .join("")
    .toUpperCase();

  return `
    <div class="user-message-avatar">
      ${esc(name || "U")}
    </div>
  `;
}

/* =========================
   CHAT
========================= */

function workspace() {
  return `
    <div class="panel chat">

      <div class="chat-head">

        <div>

          <h2>
            VÉRTEX AI

            <span class="small muted">
              • especialista em renda extra
            </span>
          </h2>

          <div class="tools">

            <button
              class="tool"
              onclick="setPrompt(
                'Me guia do zero para começar no nicho de renda extra.'
              )"
            >
              Começar do zero
            </button>

            <button
              class="tool"
              onclick="setPrompt(
                'Crie um criativo para anúncio de renda extra.'
              )"
            >
              Criativo
            </button>

            <button
              class="tool"
              onclick="setPrompt(
                'Crie 5 posts para Instagram sobre renda extra.'
              )"
            >
              Posts
            </button>

            <button
              class="tool"
              onclick="setPrompt(
                'Crie uma copy de anúncio com gancho, benefícios e CTA.'
              )"
            >
              Copy
            </button>

            <button
              class="tool"
              onclick="setPrompt(
                'Monte uma estratégia de conteúdo de 7 dias para renda extra.'
              )"
            >
              Estratégia
            </button>

          </div>

        </div>

      </div>

      <div
        class="messages"
        id="messages"
      >

        <div
          class="message-row message-vertex"
        >

          ${vertexAvatar()}

          <div class="message-bubble">

            <div class="message-name">
              VÉRTEX AI
            </div>

            <div class="message-text">
              Olá, ${esc(me.name)}.
              Pode me pedir para criar,
              explicar ou te guiar.
              Meu foco é renda extra no digital.
            </div>

          </div>

        </div>

      </div>

      <div class="composer">

        <button
          class="plus-button"
          type="button"
          onclick="togglePlusMenu()"
          aria-label="Mais opções"
        >
          +
        </button>

        <textarea
          id="prompt"
          placeholder="Mensagem para o VÉRTEX..."
          rows="1"
          onkeydown="handlePromptKey(event)"
        ></textarea>

        <button
          class="send-button"
          type="button"
          onclick="sendAI()"
          aria-label="Enviar"
        >
          ➤
        </button>

      </div>

      <div
        id="plusMenu"
        class="plus-menu hidden"
      >

        <button
          onclick="
            show('projects');
            closePlusMenu();
          "
        >
          📁 Projetos
        </button>

        <button
          onclick="
            show('history');
            closePlusMenu();
          "
        >
          🕘 Histórico
        </button>

        <button
          onclick="
            show('plans');
            closePlusMenu();
          "
        >
          💳 Planos
        </button>

        <button
          onclick="
            show('settings');
            closePlusMenu();
          "
        >
          ⚙️ Configurações
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
  const menu = $("#plusMenu");

  if (!menu) return;

  menu.classList.toggle("hidden");
}

function closePlusMenu() {
  const menu = $("#plusMenu");

  if (menu) {
    menu.classList.add("hidden");
  }
}

function setPrompt(text) {
  const input = $("#prompt");

  if (!input) return;

  input.value = text;

  input.focus();

  autoResizeTextarea(input);
}

function autoResizeTextarea(el) {
  if (!el) return;

  el.style.height = "auto";

  el.style.height =
    Math.min(
      el.scrollHeight,
      140
    ) + "px";
}

/* =========================
   ENVIAR IA
========================= */

async function sendAI() {
  const p = $("#prompt");

  if (!p) return;

  const text =
    p.value.trim();

  if (!text) return;

  const messages =
    $("#messages");

  if (!messages) return;

  /* Usuário */

  messages.insertAdjacentHTML(
    "beforeend",
    `
      <div class="message-row message-user">

        <div class="message-bubble">

          <div class="message-text">
            ${esc(text)}
          </div>

        </div>

        ${userAvatar()}

      </div>
    `
  );

  p.value = "";

  autoResizeTextarea(p);

  /* Loading */

  messages.insertAdjacentHTML(
    "beforeend",
    `
      <div class="message-row message-vertex">

        ${vertexAvatar()}

        <div class="message-bubble">

          <div class="message-name">
            VÉRTEX AI
          </div>

          <div class="message-text vertex-loading">
            Pensando...
          </div>

        </div>

      </div>
    `
  );

  const loading =
    messages.lastElementChild.querySelector(
      ".message-text"
    );

  messages.scrollTop =
    messages.scrollHeight;

  try {

    const d = await api(
      "/api/ai/generate",
      {
        method: "POST",

        body: JSON.stringify({
          prompt: text
        })
      }
    );

    loading.classList.remove(
      "vertex-loading"
    );

    loading.innerHTML =
      esc(
        d.response ||
        "Não consegui gerar uma resposta."
      ).replace(
        /\n/g,
        "<br>"
      );

    if (
      d.credits !== undefined
    ) {
      me.credits =
        d.credits;
    }

  } catch (e) {

    loading.classList.remove(
      "vertex-loading"
    );

    loading.innerHTML =
      `
        <span class="error">
          ${esc(e.message)}
        </span>
      `;
  }

  messages.scrollTop =
    messages.scrollHeight;
}

/* =========================
   FERRAMENTAS
========================= */

function templates() {
  return `
    <div class="panel">

      <h2>
        Ferramentas para renda extra
      </h2>

      <div class="quick">

        <button
          onclick="openAI(
            'Crie 10 ideias de posts para Instagram sobre renda extra online.'
          )"
        >
          <strong>
            10 ideias de posts
          </strong>

          <small>
            Conteúdo para iniciantes.
          </small>
        </button>

        <button
          onclick="openAI(
            'Crie um anúncio completo para Facebook Ads sobre renda extra, sem prometer ganhos garantidos.'
          )"
        >
          <strong>
            Anúncio completo
          </strong>

          <small>
            Headline, copy e CTA.
          </small>
        </button>

        <button
          onclick="openAI(
            'Crie um roteiro de Reels de 30 segundos sobre como começar uma renda extra.'
          )"
        >
          <strong>
            Roteiro de Reels
          </strong>

          <small>
            Gancho, desenvolvimento e CTA.
          </small>
        </button>

        <button
          onclick="openAI(
            'Monte um calendário de conteúdo de 7 dias para o nicho de renda extra.'
          )"
        >
          <strong>
            Calendário de 7 dias
          </strong>

          <small>
            Uma semana de conteúdo.
          </small>
        </button>

        <button
          onclick="openAI(
            'Crie uma oferta de serviço digital para alguém que está começando no nicho de renda extra.'
          )"
        >
          <strong>
            Oferta digital
          </strong>

          <small>
            Estruture uma oferta.
          </small>
        </button>

        <button
          onclick="openAI(
            'Crie uma sequência de 5 stories para divulgar um conteúdo de renda extra.'
          )"
        >
          <strong>
            Stories
          </strong>

          <small>
            Sequência pronta para adaptar.
          </small>
        </button>

      </div>

    </div>
  `;
}

/* =========================
   BÔNUS
========================= */

async function loadBonuses() {
  try {

    const d =
      await api("/api/bonuses");

    $("#bonuses").innerHTML = `
      <div class="panel">

        <div class="row">

          <div>

            <h2>
              6 criativos bônus
            </h2>

            <p class="muted small">
              Você recebe exatamente
              6 criativos prontos.
              Depois disso, continue criando
              com a IA através da assinatura.
            </p>

          </div>

          <span class="badge">
            ${d.remaining} restantes
          </span>

        </div>

        <div class="quick">

          ${d.items
            .map(
              (x) => `
                <div class="card">

                  <b>
                    ${esc(x.title)}
                  </b>

                  <div class="small muted">
                    ${esc(x.type)}
                  </div>

                  <p class="small">
                    ${esc(x.copy)}
                  </p>

                  <button
                    class="btn ${
                      d.used >= x.id
                        ? "ghost"
                        : "orange"
                    }"
                    ${
                      d.used >= x.id
                        ? "disabled"
                        : ""
                    }
                    onclick="useBonus(${x.id})"
                  >
                    ${
                      d.used >= x.id
                        ? "Usado"
                        : "Usar criativo"
                    }
                  </button>

                </div>
              `
            )
            .join("")}

        </div>

      </div>
    `;

  } catch (e) {
    toast(e.message);
  }
}

async function useBonus(id) {
  try {

    const d =
      await api(
        "/api/bonuses/" +
        id +
        "/use",
        {
          method: "POST"
        }
      );

    me = d.user;

    toast(
      "Criativo bônus liberado"
    );

    await loadBonuses();

    renderAll();

  } catch (e) {
    toast(e.message);
  }
}

/* =========================
   PROJETOS
========================= */

async function loadProjects() {
  try {

    const d =
      await api("/api/projects");

    $("#projects").innerHTML = `
      <div class="panel">

        <div class="row">

          <h2>
            Meus projetos
          </h2>

          <button
            class="btn orange"
            onclick="newProject()"
          >
            + Novo projeto
          </button>

        </div>

        ${
          d.projects.length
            ? d.projects
                .map(
                  (p) => `
                    <div class="listitem row">

                      <span>

                        <b>
                          ${esc(p.name)}
                        </b>

                        <br>

                        <span class="small muted">
                          ${esc(
                            p.content || ""
                          ).slice(0, 100)}
                        </span>

                      </span>

                      <button
                        class="btn ghost"
                        onclick="editProject(${p.id})"
                      >
                        Abrir
                      </button>

                    </div>
                  `
                )
                .join("")
            : `
              <p class="muted">
                Nenhum projeto ainda.
              </p>
            `
        }

      </div>
    `;

  } catch (e) {
    toast(e.message);
  }
}

async function newProject() {
  const name = prompt(
    "Nome do projeto:",
    "Minha campanha de renda extra"
  );

  if (!name) return;

  try {

    await api(
      "/api/projects",
      {
        method: "POST",
        body: JSON.stringify({
          name
        })
      }
    );

    toast(
      "Projeto criado"
    );

    await loadProjects();

  } catch (e) {
    toast(e.message);
  }
}

async function editProject(id) {
  try {

    const d =
      await api("/api/projects");

    const p =
      d.projects.find(
        (x) => x.id === id
      );

    if (!p) return;

    const content =
      prompt(
        "Conteúdo do projeto:",
        p.content || ""
      );

    if (content === null) {
      return;
    }

    await api(
      "/api/projects/" + id,
      {
        method: "PUT",
        body: JSON.stringify({
          name: p.name,
          content
        })
      }
    );

    toast(
      "Projeto salvo"
    );

    await loadProjects();

  } catch (e) {
    toast(e.message);
  }
}

/* =========================
   HISTÓRICO
========================= */

async function loadHistory() {
  try {

    const d =
      await api("/api/history");

    $("#history").innerHTML = `
      <div class="panel">

        <h2>
          Histórico
        </h2>

        ${
          d.history.length
            ? d.history
                .map(
                  (h) => `
                    <div class="listitem">

                      <b>
                        ${esc(
                          h.prompt
                        ).slice(0, 120)}
                      </b>

                      <p class="muted small">
                        ${esc(
                          h.response
                        ).slice(0, 250)}
                      </p>

                    </div>
                  `
                )
                .join("")
            : `
              <p class="muted">
                Seu histórico aparecerá aqui.
              </p>
            `
        }

      </div>
    `;

  } catch (e) {
    toast(e.message);
  }
}

/* =========================
   PLANOS
========================= */

function plans() {
  return `
    <div class="plans">

      ${plansCache
        .map((p) => {

          /*
            Garante os dados corretos
            dos planos no botão.
          */

          let planName =
            p.name;

          let planPrice =
            p.price;

          let checkoutUrl =
            p.checkout;

          if (p.id === "PRO") {

            planName = "PRO";

            planPrice =
              "R$ 39,90";

            checkoutUrl =
              "https://pay.cakto.com.br/ubpqtkf_1087308";
          }

          if (
            p.id === "PRO_ANNUAL"
          ) {

            planName =
              "PRO Anual";

            planPrice =
              "R$ 190,00";

            checkoutUrl =
              "https://pay.cakto.com.br/qikjmty";
          }

          return `
            <div
              class="card price ${
                p.id === "PRO_ANNUAL"
                  ? "featured"
                  : ""
              }"
            >

              <h3>
                ${esc(planName)}
              </h3>

              <strong>
                ${esc(planPrice)}
              </strong>

              <p class="muted">
                ${Number(
                  p.credits || 0
                ).toLocaleString(
                  "pt-BR"
                )}
                créditos
              </p>

              ${
                p.id === "FREE"

                  ? `
                    <p class="small muted">
                      Acesso inicial para conhecer
                      o VÉRTEX.
                    </p>

                    <button
                      class="btn ghost"
                      type="button"
                      onclick="selectFreePlan()"
                    >
                      ${
                        me &&
                        me.plan === "FREE"
                          ? "Plano atual"
                          : "Usar grátis"
                      }
                    </button>
                  `

                  : `
                    <ul>

                      <li>
                        IA especializada em renda extra
                      </li>

                      <li>
                        Posts, criativos, copies e estratégias
                      </li>

                      <li>
                        Suporte para iniciantes
                      </li>

                      <li>
                        Projetos e histórico
                      </li>

                      <li>
                        6 criativos bônus
                      </li>

                    </ul>

                    <button
                      class="btn orange"
                      type="button"
                      onclick="checkout('${p.id}')"
                    >
                      Assinar ${esc(planName)}
                    </button>
                  `
              }

            </div>
          `;
        })
        .join("")}

    </div>

    <div
      class="panel"
      style="margin-top:15px"
    >

      <b>
        Pagamento pela Cakto
      </b>

      <p class="small muted">
        Escolha mensal ou anual.
        Após o pagamento aprovado,
        a Cakto envia o webhook e
        o VÉRTEX libera o acesso.
      </p>

    </div>
  `;
}

/* =========================
   PLANO GRÁTIS
========================= */

async function selectFreePlan() {
  if (
    me &&
    me.plan === "FREE"
  ) {
    toast(
      "Você já está no plano grátis."
    );

    return;
  }

  try {

    const d =
      await api(
        "/api/me/plan",
        {
          method: "PUT",
          body: JSON.stringify({
            plan: "FREE"
          })
        }
      );

    if (d.user) {
      me = d.user;
    } else {
      me.plan = "FREE";
    }

    toast(
      "Plano grátis selecionado"
    );

    renderAll();

    show("dashboard");

  } catch (e) {

    toast(
      e.message ||
      "Não foi possível selecionar o plano grátis."
    );
  }
}

/* =========================
   CHECKOUT CAKTO
========================= */

function checkout(plan) {

  let url = null;

  /*
    Links oficiais configurados
    para cada plano.
  */

  if (plan === "PRO") {

    url =
      "https://pay.cakto.com.br/ubpqtkf_1087308";

  }

  if (
    plan === "PRO_ANNUAL"
  ) {

    url =
      "https://pay.cakto.com.br/qikjmty";

  }

  /*
    Caso o plano venha da API
    e tenha checkout configurado.
  */

  if (!url) {

    const p =
      plansCache.find(
        (x) => x.id === plan
      );

    if (p && p.checkout) {
      url = p.checkout;
    }
  }

  if (!url) {

    toast(
      "Checkout não configurado."
    );

    return;
  }

  /*
    Adiciona nome e e-mail
    para facilitar o preenchimento
    da compra na Cakto.
  */

  const sep =
    url.includes("?")
      ? "&"
      : "?";

  const finalUrl =
    url +
    sep +
    "name=" +
    encodeURIComponent(
      me?.name || ""
    ) +
    "&email=" +
    encodeURIComponent(
      me?.email || ""
    );

  /*
    Redireciona diretamente.
    No celular isso é mais confiável
    do que window.open().
  */

  window.location.href =
    finalUrl;
}

/* =========================
   CONFIGURAÇÕES
========================= */

function settings() {
  return `
    <div class="panel">

      <h2>
        Configurações
      </h2>

      <div class="form">

        <div class="field">

          <label>
            Nome
          </label>

          <input
            id="accountName"
            value="${esc(me.name)}"
          >

        </div>

        <div class="field">

          <label>
            E-mail
          </label>

          <input
            value="${esc(me.email)}"
            disabled
          >

        </div>

        <button
          class="btn orange"
          onclick="saveAccount()"
        >
          Salvar alterações
        </button>

        <button
          class="btn ghost"
          onclick="logout()"
        >
          Sair da conta
        </button>

      </div>

    </div>
  `;
}

async function saveAccount() {
  try {

    const d =
      await api(
        "/api/account",
        {
          method: "PUT",
          body: JSON.stringify({
            name:
              $("#accountName").value
          })
        }
      );

    me = d.user;

    if ($("#userName")) {
      $("#userName").textContent =
        me.name;
    }

    toast(
      "Conta atualizada"
    );

  } catch (e) {
    toast(e.message);
  }
}

/* =========================
   RENDERIZAÇÃO
========================= */

function renderAll() {

  if ($("#dashboard")) {
    $("#dashboard").innerHTML =
      dashboard();
  }

  if ($("#workspace")) {
    $("#workspace").innerHTML =
      workspace();
  }

  if ($("#templates")) {
    $("#templates").innerHTML =
      templates();
  }

  if ($("#bonuses")) {
    $("#bonuses").innerHTML = "";
  }

  if ($("#projects")) {
    $("#projects").innerHTML = "";
  }

  if ($("#history")) {
    $("#history").innerHTML = "";
  }

  if ($("#plans")) {
    $("#plans").innerHTML =
      plans();
  }

  if ($("#settings")) {
    $("#settings").innerHTML =
      settings();
  }

  bindNavigation();

  const prompt =
    $("#prompt");

  if (prompt) {

    prompt.addEventListener(
      "input",
      () =>
        autoResizeTextarea(prompt)
    );
  }
}

/* =========================
   ATALHOS PARA IA
========================= */

function openAI(text) {

  show("workspace");

  setTimeout(() => {
    setPrompt(text);
  }, 30);
}

/* =========================
   LOGOUT
========================= */

function logout() {

  localStorage.removeItem(
    "vertex_token"
  );

  location.reload();
}

/* =========================
   TOAST
========================= */

function toast(text) {

  const x =
    document.createElement(
      "div"
    );

  x.className = "toast";

  x.textContent = text;

  document.body.appendChild(x);

  setTimeout(() => {
    x.remove();
  }, 2500);
}

/* =========================
   ESCAPE HTML
========================= */

function esc(s) {

  return String(
    s ?? ""
  ).replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[c]
  );
}

/* =========================
   CLIQUE FORA DO MENU +
========================= */

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

/* =========================
   INÍCIO
========================= */

authMode("login");

if (token) {
  start();
}

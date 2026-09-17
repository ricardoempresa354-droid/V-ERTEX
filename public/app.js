const META = {
  name: "VÉRTEX AI",
  subtitle: "Seu assistente para renda extra no digital.",
  bonuses: "3 criativos bônus"
};

let token = localStorage.getItem("vertex_token");
let me = null;
let plansCache = [];
let currentChatId = null;
let currentPrompt = "";

async function api(url, options = {}) {
  const config = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, config);

  let data = {};
  try {
    data = await response.json();
  } catch (_) {}

  if (!response.ok) {
    throw new Error(data.message || data.error || "Erro na solicitação.");
  }

  return data;
}

function authMode(mode) {
  const loginTab = document.getElementById("loginTab");
  const registerTab = document.getElementById("registerTab");
  const form = document.getElementById("authForm");
  const error = document.getElementById("authError");

  if (!form) return;

  error.textContent = "";

  if (mode === "login") {
    loginTab.classList.add("on");
    registerTab.classList.remove("on");

    form.innerHTML = `
      <form onsubmit="login(event)">
        <input id="email" type="email" placeholder="Seu e-mail" required>
        <input id="password" type="password" placeholder="Sua senha" required>
        <button class="primary full" type="submit">Entrar</button>
      </form>
    `;
  } else {
    loginTab.classList.remove("on");
    registerTab.classList.add("on");

    form.innerHTML = `
      <form onsubmit="register(event)">
        <input id="name" type="text" placeholder="Seu nome" required>
        <input id="email" type="email" placeholder="Seu e-mail" required>
        <input id="password" type="password" placeholder="Crie uma senha" required>
        <button class="primary full" type="submit">Criar conta</button>
      </form>
    `;
  }
}

async function login(event) {
  event.preventDefault();

  const error = document.getElementById("authError");
  error.textContent = "";

  try {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const data = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        password
      })
    });

    token = data.token;
    localStorage.setItem("vertex_token", token);

    await start();
  } catch (err) {
    error.textContent = err.message;
  }
}

async function register(event) {
  event.preventDefault();

  const error = document.getElementById("authError");
  error.textContent = "";

  try {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const data = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        name,
        email,
        password
      })
    });

    token = data.token;
    localStorage.setItem("vertex_token", token);

    await start();
  } catch (err) {
    error.textContent = err.message;
  }
}

async function start() {
  try {
    me = await api("/api/me");

    if (!me) {
      logout();
      return;
    }

    document.getElementById("auth").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    const userName = document.getElementById("userName");
    if (userName) {
      userName.textContent = me.name || "Usuário";
    }

    await loadPlans();

    renderAll();

    show("workspace");
  } catch (err) {
    console.error(err);

    localStorage.removeItem("vertex_token");
    token = null;
    me = null;

    document.getElementById("auth").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");

    authMode("login");
  }
}

async function loadPlans() {
  try {
    const data = await api("/api/plans");
    plansCache = data.plans || [];
  } catch (err) {
    console.error("Erro carregando planos:", err);
    plansCache = [];
  }
}

function show(view) {
  document.querySelectorAll(".view").forEach(section => {
    section.classList.remove("active");
  });

  const target = document.getElementById(view);

  if (target) {
    target.classList.add("active");
  }

  document.querySelectorAll(".side nav button").forEach(button => {
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
      "VÉRTEX IA",
      "Converse com seu assistente."
    ],
    templates: [
      "Ferramentas",
      "Use recursos rápidos para criar conteúdo."
    ],
    bonuses: [
      "Bônus",
      "Seus criativos disponíveis."
    ],
    projects: [
      "Projetos",
      "Organize seus projetos."
    ],
    history: [
      "Histórico",
      "Veja suas conversas anteriores."
    ],
    plans: [
      "Planos",
      "Escolha os recursos que deseja utilizar."
    ],
    settings: [
      "Configurações",
      "Gerencie sua conta."
    ]
  };

  const info = titles[view] || titles.workspace;

  const title = document.getElementById("title");
  const sub = document.getElementById("sub");

  if (title) title.textContent = info[0];
  if (sub) sub.textContent = info[1];

  document.body.classList.remove("menu-open");

  if (view === "bonuses") loadBonuses();
  if (view === "projects") loadProjects();
  if (view === "history") loadHistory();
}

document.querySelectorAll(".side nav button").forEach(button => {
  button.addEventListener("click", () => {
    show(button.dataset.view);
  });
});

function dashboard() {
  const credits = Number(me?.credits ?? 15);
  const bonusUsed = Number(me?.bonus_used ?? 0);
  const bonusRemaining = Math.max(0, 3 - bonusUsed);

  return `
    <div class="dashboard-grid">

      <div class="stat-card">
        <span class="stat-icon">✦</span>
        <div>
          <small>Créditos da IA</small>
          <strong>${credits}</strong>
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-icon">◆</span>
        <div>
          <small>Plano</small>
          <strong>${me?.plan || "FREE"}</strong>
        </div>
      </div>

      <div class="stat-card">
        <span class="stat-icon">🎁</span>
        <div>
          <small>Bônus disponíveis</small>
          <strong>${bonusRemaining}/3</strong>
        </div>
      </div>

    </div>

    <div class="welcome-card">
      <div>
        <span class="eyebrow">VÉRTEX AI</span>
        <h2>Comece sua jornada no digital.</h2>
        <p>
          Use a inteligência artificial para criar ideias,
          conteúdos, anúncios, estratégias e projetos.
        </p>

        <button class="primary" onclick="show('workspace')">
          Abrir VÉRTEX IA
        </button>
      </div>

      <div class="welcome-mark">V</div>
    </div>

    <div class="section-head">
      <div>
        <h2>Acesso rápido</h2>
        <p>Escolha uma tarefa para começar.</p>
      </div>
    </div>

    <div class="quick-grid">

      <button class="quick-card" onclick="openAI('Comece do zero comigo e me ensine como começar a trabalhar com renda extra no digital.')">
        <span>🚀</span>
        <strong>Começar do zero</strong>
        <small>Aprenda os primeiros passos.</small>
      </button>

      <button class="quick-card" onclick="openAI('Crie um criativo completo para um produto de renda extra, com gancho, texto, título e CTA.')">
        <span>🎯</span>
        <strong>Criar criativo</strong>
        <small>Monte uma ideia de anúncio.</small>
      </button>

      <button class="quick-card" onclick="openAI('Crie 7 ideias de posts para Instagram no nicho de renda extra.')">
        <span>📱</span>
        <strong>Posts para Instagram</strong>
        <small>Tenha conteúdo para publicar.</small>
      </button>

      <button class="quick-card" onclick="openAI('Crie uma estratégia simples de vendas para começar no digital usando apenas o celular.')">
        <span>💡</span>
        <strong>Estratégia</strong>
        <small>Planeje seus próximos passos.</small>
      </button>

    </div>
  `;
}

function workspace() {
  const section = document.getElementById("workspace");

  section.innerHTML = `
    <div class="chat-shell">

      <div class="chat-top">
        <div class="assistant-profile">
          <div class="vertex-avatar">V</div>

          <div>
            <strong>VÉRTEX AI</strong>
            <span>Especialista em renda extra</span>
          </div>
        </div>

        <button class="chat-new" onclick="newChat()" title="Nova conversa">
          ＋
        </button>
      </div>

      <div id="chatMessages" class="chat-messages">

        <div id="chatWelcome" class="chat-welcome">

          <div class="big-vertex">V</div>

          <h2>Como posso ajudar?</h2>

          <p>
            Converse comigo sobre renda extra,
            marketing digital, vendas, conteúdo e estratégias.
          </p>

          <div class="chat-suggestions">

            <button onclick="openAI('Me ensine como começar no digital do zero.')">
              Começar do zero
            </button>

            <button onclick="openAI('Crie um criativo para vender um produto de renda extra.')">
              Criar criativo
            </button>

            <button onclick="openAI('Crie 7 ideias de posts para Instagram.')">
              Criar posts
            </button>

            <button onclick="openAI('Monte uma estratégia simples para conseguir minhas primeiras vendas.')">
              Estratégia
            </button>

          </div>

        </div>

      </div>

      <div class="chat-composer-wrap">

        <div id="plusMenu" class="plus-menu hidden">

          <button onclick="show('projects'); closePlusMenu()">
            <span>📁</span>
            <div>
              <strong>Projetos</strong>
              <small>Organize seus projetos</small>
            </div>
          </button>

          <button onclick="show('history'); closePlusMenu()">
            <span>🕘</span>
            <div>
              <strong>Histórico</strong>
              <small>Conversas anteriores</small>
            </div>
          </button>

          <button onclick="show('plans'); closePlusMenu()">
            <span>💳</span>
            <div>
              <strong>Planos</strong>
              <small>Veja seu plano</small>
            </div>
          </button>

          <button onclick="show('settings'); closePlusMenu()">
            <span>⚙️</span>
            <div>
              <strong>Configurações</strong>
              <small>Gerencie sua conta</small>
            </div>
          </button>

        </div>

        <form class="chat-composer" onsubmit="sendAI(event)">

          <button
            type="button"
            class="plus-button"
            onclick="togglePlusMenu()"
            title="Mais opções"
          >
            +
          </button>

          <input
            id="prompt"
            autocomplete="off"
            placeholder="Pergunte alguma coisa..."
          >

          <button
            type="submit"
            class="send-button"
            title="Enviar"
          >
            ↑
          </button>

        </form>

        <small class="chat-disclaimer">
          O VÉRTEX pode cometer erros. Confira informações importantes.
        </small>

      </div>

    </div>
  `;
}

function templates() {
  return `
    <div class="section-head">
      <div>
        <h2>Ferramentas rápidas</h2>
        <p>Escolha uma ferramenta e deixe a IA começar.</p>
      </div>
    </div>

    <div class="tools-grid">

      <button class="tool-card" onclick="openAI('Crie um anúncio completo para um produto de renda extra.')">
        <span>🎯</span>
        <strong>Criativo de anúncio</strong>
        <small>Gancho, texto, título e CTA.</small>
      </button>

      <button class="tool-card" onclick="openAI('Crie uma copy de vendas persuasiva para um produto digital.')">
        <span>✍️</span>
        <strong>Copy</strong>
        <small>Crie textos para vender.</small>
      </button>

      <button class="tool-card" onclick="openAI('Crie 7 posts para Instagram no nicho de renda extra.')">
        <span>📱</span>
        <strong>Posts</strong>
        <small>Ideias para redes sociais.</small>
      </button>

      <button class="tool-card" onclick="openAI('Crie uma estratégia de vendas usando apenas o celular.')">
        <span>📈</span>
        <strong>Estratégia</strong>
        <small>Planeje sua operação.</small>
      </button>

    </div>
  `;
}

async function loadBonuses() {
  const section = document.getElementById("bonuses");

  section.innerHTML = `
    <div class="loading-card">Carregando bônus...</div>
  `;

  try {
    const data = await api("/api/bonuses");

    const items = data.items || [];

    section.innerHTML = `
      <div class="section-head">
        <div>
          <h2>🎁 Bônus VÉRTEX</h2>
          <p>
            Você tem ${data.remaining ?? 0} de 3 bônus disponíveis.
          </p>
        </div>
      </div>

      <div class="bonus-grid">

        ${
          items.length
            ? items.map(item => `
              <div class="bonus-card">

                <div class="bonus-icon">🎁</div>

                <div class="bonus-content">
                  <span class="eyebrow">BÔNUS</span>

                  <h3>${escapeHTML(item.title || "Criativo bônus")}</h3>

                  <p>
                    ${escapeHTML(
                      item.description ||
                      "Use este recurso para acelerar sua criação."
                    )}
                  </p>

                  <button
                    class="primary"
                    onclick="useBonus(${Number(item.id)})"
                    ${item.used ? "disabled" : ""}
                  >
                    ${item.used ? "Já utilizado" : "Usar bônus"}
                  </button>
                </div>

              </div>
            `).join("")
            : `
              <div class="empty-card">
                Nenhum bônus disponível no momento.
              </div>
            `
        }

      </div>
    `;
  } catch (err) {
    section.innerHTML = `
      <div class="error-card">
        ${escapeHTML(err.message)}
      </div>
    `;
  }
}

async function useBonus(id) {
  try {
    const data = await api(`/api/bonuses/${id}/use`, {
      method: "POST"
    });

    if (data.user) {
      me = data.user;
    }

    toast("Bônus utilizado!");

    await loadBonuses();
    dashboard();

  } catch (err) {
    toast(err.message, true);
  }
}

async function loadProjects() {
  const section = document.getElementById("projects");

  section.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Projetos</h2>
        <p>Guarde suas ideias e trabalhos.</p>
      </div>

      <button class="primary" onclick="newProject()">
        + Novo projeto
      </button>
    </div>

    <div id="projectsList" class="projects-list">
      Carregando...
    </div>
  `;

  try {
    const data = await api("/api/projects");
    const projects = data.projects || [];

    const list = document.getElementById("projectsList");

    if (!projects.length) {
      list.innerHTML = `
        <div class="empty-card">
          <div class="empty-icon">📁</div>
          <h3>Nenhum projeto ainda</h3>
          <p>Crie seu primeiro projeto para começar.</p>
          <button class="primary" onclick="newProject()">
            Criar projeto
          </button>
        </div>
      `;
      return;
    }

    list.innerHTML = projects.map(project => `
      <div class="project-card">

        <div>
          <span class="project-icon">📁</span>
        </div>

        <div class="project-info">
          <h3>${escapeHTML(project.title || project.name || "Projeto")}</h3>

          <p>
            ${escapeHTML(
              project.description ||
              project.content ||
              "Sem descrição."
            )}
          </p>
        </div>

        <button
          class="icon-button"
          onclick="editProject(${Number(project.id)})"
        >
          ✏️
        </button>

      </div>
    `).join("");

  } catch (err) {
    document.getElementById("projectsList").innerHTML = `
      <div class="error-card">
        ${escapeHTML(err.message)}
      </div>
    `;
  }
}

async function newProject() {
  const title = prompt("Nome do projeto:");

  if (!title) return;

  const description = prompt("Descrição do projeto:") || "";

  try {
    await api("/api/projects", {
      method: "POST",
      body: JSON.stringify({
        title,
        description
      })
    });

    toast("Projeto criado!");

    await loadProjects();

  } catch (err) {
    toast(err.message, true);
  }
}

async function editProject(id) {
  try {
    const data = await api("/api/projects");
    const project = (data.projects || []).find(
      item => Number(item.id) === Number(id)
    );

    if (!project) {
      toast("Projeto não encontrado.", true);
      return;
    }

    const title = prompt(
      "Nome do projeto:",
      project.title || project.name || ""
    );

    if (!title) return;

    const description = prompt(
      "Descrição:",
      project.description || project.content || ""
    ) || "";

    await api(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        title,
        description
      })
    });

    toast("Projeto atualizado!");

    await loadProjects();

  } catch (err) {
    toast(err.message, true);
  }
}

async function loadHistory() {
  const section = document.getElementById("history");

  section.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Histórico</h2>
        <p>Suas conversas anteriores.</p>
      </div>
    </div>

    <div id="historyList" class="history-list">
      Carregando...
    </div>
  `;

  try {
    const data = await api("/api/history");
    const history = data.history || data.chats || [];

    const list = document.getElementById("historyList");

    if (!history.length) {
      list.innerHTML = `
        <div class="empty-card">
          <div class="empty-icon">🕘</div>
          <h3>Nenhuma conversa ainda</h3>
          <p>Quando você conversar com a VÉRTEX, suas conversas aparecerão aqui.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = history.map(item => `
      <button
        class="history-card"
        onclick="openHistoryChat(${Number(item.id)})"
      >

        <div class="history-icon">✦</div>

        <div>
          <strong>
            ${escapeHTML(item.title || "Nova conversa")}
          </strong>

          <span>
            ${Number(item.message_count || 0)} mensagens
          </span>
        </div>

        <span class="history-arrow">›</span>

      </button>
    `).join("");

  } catch (err) {
    document.getElementById("historyList").innerHTML = `
      <div class="error-card">
        ${escapeHTML(err.message)}
      </div>
    `;
  }
}

async function openHistoryChat(id) {
  try {
    const data = await api(`/api/chats/${id}`);

    currentChatId = id;

    show("workspace");

    const messages = document.getElementById("chatMessages");

    if (!messages) return;

    const list = data.messages || [];

    messages.innerHTML = "";

    if (!list.length) {
      workspace();
      return;
    }

    list.forEach(message => {
      addMessage(
        message.role === "user" ? "user" : "assistant",
        message.content || message.message || ""
      );
    });

  } catch (err) {
    toast(err.message, true);
  }
}

function plans() {
  const section = document.getElementById("plans");

  const plans = plansCache || [];

  section.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Planos</h2>
        <p>Seu plano atual: <strong>${escapeHTML(me?.plan || "FREE")}</strong></p>
      </div>
    </div>

    <div class="plans-grid">

      ${
        plans.length
          ? plans.map(plan => `
            <div class="plan-card ${plan.id === me?.plan ? "current" : ""}">

              <div class="plan-head">
                <span class="eyebrow">${escapeHTML(plan.id)}</span>
                <h3>${escapeHTML(plan.name || plan.title || plan.id)}</h3>
              </div>

              <div class="plan-price">
                ${
                  plan.price
                    ? `R$ ${escapeHTML(String(plan.price))}`
                    : "Grátis"
                }
              </div>

              <div class="plan-features">

                <div>
                  ✦ ${Number(plan.credits || 0)} créditos
                </div>

                <div>
                  🎁 ${Number(plan.bonuses || 0)} bônus
                </div>

              </div>

              ${
                plan.id === me?.plan
                  ? `
                    <button class="secondary full" disabled>
                      Plano atual
                    </button>
                  `
                  : `
                    <button
                      class="primary full"
                      onclick="checkout('${escapeHTML(plan.id)}')"
                    >
                      Escolher plano
                    </button>
                  `
              }

            </div>
          `).join("")
          : `
            <div class="empty-card">
              Não foi possível carregar os planos.
            </div>
          `
      }

    </div>
  `;
}

function checkout(planId) {
  const plan = plansCache.find(
    item => item.id === planId
  );

  if (!plan) {
    toast("Plano não encontrado.", true);
    return;
  }

  if (plan.url) {
    window.open(plan.url, "_blank");
    return;
  }

  toast("Este plano ainda não possui checkout.");
}

function settings() {
  const section = document.getElementById("settings");

  section.innerHTML = `
    <div class="section-head">
      <div>
        <h2>Configurações</h2>
        <p>Gerencie seus dados da conta.</p>
      </div>
    </div>

    <div class="settings-card">

      <div class="settings-section">
        <h3>Conta</h3>

        <label>Nome</label>
        <input
          id="accountName"
          value="${escapeAttribute(me?.name || "")}"
        >

        <label>E-mail</label>
        <input
          id="accountEmail"
          type="email"
          value="${escapeAttribute(me?.email || "")}"
        >

        <button class="primary" onclick="saveAccount()">
          Salvar alterações
        </button>
      </div>

      <div class="settings-section danger-section">

        <h3>Sessão</h3>

        <button class="danger" onclick="logout()">
          Sair da conta
        </button>

      </div>

    </div>
  `;
}

async function saveAccount() {
  try {
    const name = document.getElementById("accountName").value.trim();
    const email = document.getElementById("accountEmail").value.trim();

    const data = await api("/api/account", {
      method: "PUT",
      body: JSON.stringify({
        name,
        email
      })
    });

    me = data.user || data;

    document.getElementById("userName").textContent =
      me.name || "Usuário";

    toast("Conta atualizada!");

  } catch (err) {
    toast(err.message, true);
  }
}

function renderAll() {
  document.getElementById("dashboard").innerHTML = dashboard();
  document.getElementById("workspace").innerHTML = "";
  document.getElementById("templates").innerHTML = templates();
  document.getElementById("bonuses").innerHTML = "";
  document.getElementById("projects").innerHTML = "";
  document.getElementById("history").innerHTML = "";
  document.getElementById("plans").innerHTML = "";
  document.getElementById("settings").innerHTML = "";

  workspace();
  plans();
  settings();
}

function openAI(text) {
  show("workspace");

  const input = document.getElementById("prompt");

  if (input) {
    input.value = text;
    input.focus();
  }
}

function setPrompt(text) {
  const input = document.getElementById("prompt");

  if (input) {
    input.value = text;
    input.focus();
  }
}

async function sendAI(event) {
  event.preventDefault();

  const input = document.getElementById("prompt");
  const messages = document.getElementById("chatMessages");

  if (!input || !messages) return;

  const promptText = input.value.trim();

  if (!promptText) return;

  input.value = "";

  const welcome = document.getElementById("chatWelcome");

  if (welcome) {
    welcome.remove();
  }

  addMessage("user", promptText);

  const loading = addMessage(
    "assistant",
    "Pensando..."
  );

  try {
    const data = await api("/api/ai/generate", {
      method: "POST",
      body: JSON.stringify({
        chatId: currentChatId,
        prompt: promptText
      })
    });

    if (data.chatId) {
      currentChatId = data.chatId;
    }

    if (data.user) {
      me = data.user;

      const userName = document.getElementById("userName");

      if (userName) {
        userName.textContent = me.name || "Usuário";
      }
    }

    loading.remove();

    addMessage(
      "assistant",
      data.response ||
      data.message ||
      "Não consegui gerar uma resposta agora."
    );

  } catch (err) {
    loading.remove();

    addMessage(
      "assistant",
      `Não consegui responder agora.\n\n${err.message}`
    );
  }
}

function addMessage(role, text) {
  const messages = document.getElementById("chatMessages");

  if (!messages) return null;

  const row = document.createElement("div");
  row.className = `message-row ${role}`;

  const avatar = document.createElement("div");
  avatar.className =
    role === "assistant"
      ? "message-avatar vertex-avatar"
      : "message-avatar user-message-avatar";

  avatar.textContent =
    role === "assistant"
      ? "V"
      : "U";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  bubble.textContent = text;

  row.appendChild(avatar);
  row.appendChild(bubble);

  messages.appendChild(row);

  messages.scrollTop = messages.scrollHeight;

  return row;
}

function newChat() {
  currentChatId = null;

  const section = document.getElementById("workspace");

  if (!section) return;

  section.innerHTML = "";

  workspace();

  show("workspace");

  setTimeout(() => {
    const input = document.getElementById("prompt");

    if (input) {
      input.focus();
    }
  }, 100);
}

function togglePlusMenu() {
  const menu = document.getElementById("plusMenu");

  if (!menu) return;

  menu.classList.toggle("hidden");
}

function closePlusMenu() {
  const menu = document.getElementById("plusMenu");

  if (menu) {
    menu.classList.add("hidden");
  }
}

function logout() {
  localStorage.removeItem("vertex_token");

  token = null;
  me = null;
  currentChatId = null;

  document.getElementById("app").classList.add("hidden");
  document.getElementById("auth").classList.remove("hidden");

  authMode("login");
}

function toast(message, isError = false) {
  let box = document.getElementById("toast");

  if (!box) {
    box = document.createElement("div");
    box.id = "toast";
    document.body.appendChild(box);
  }

  box.textContent = message;
  box.className = isError
    ? "toast error-toast"
    : "toast";

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    box.classList.add("hidden");
  }, 2800);

  box.classList.remove("hidden");
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

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closePlusMenu();
  }
});

document.addEventListener("click", event => {
  const menu = document.getElementById("plusMenu");
  const plus = document.querySelector(".plus-button");

  if (!menu || !plus) return;

  if (
    !menu.contains(event.target) &&
    !plus.contains(event.target)
  ) {
    closePlusMenu();
  }
});

authMode("login");

if (token) {
  start();
}

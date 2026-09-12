const app = document.getElementById("app");

let token = localStorage.getItem("vertex_token");
let user = null;
let chats = [];
let currentChat = null;
let loading = false;

const suggestions = [
  "Quero começar do zero no marketing digital",
  "Crie um anúncio para um produto digital",
  "Me dê 7 ideias de posts para Instagram",
  "Crie uma estratégia de vendas para iniciantes"
];

/* =========================
   API
========================= */

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

/* =========================
   UTILIDADES
========================= */

function escapeHTML(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function initials(name) {
  return String(name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => word[0])
    .join("")
    .toUpperCase();
}

/* =========================
   LOGIN
========================= */

function showLogin(register = false) {
  app.innerHTML = `
    <div class="auth-screen">

      <div class="auth-box">

        <div class="auth-logo">
          <div class="auth-v-logo">
            V
          </div>

          <h1>VÉRTEX AI</h1>

          <p>
            Seu assistente inteligente para o digital
          </p>
        </div>

        <h2>
          ${register ? "Criar sua conta" : "Entrar no VÉRTEX"}
        </h2>

        <form class="auth-form" id="authForm">

          ${
            register
              ? `
                <input
                  id="name"
                  type="text"
                  placeholder="Seu nome"
                  autocomplete="name"
                  required
                >
              `
              : ""
          }

          <input
            id="email"
            type="email"
            placeholder="Seu e-mail"
            autocomplete="email"
            required
          >

          <input
            id="password"
            type="password"
            placeholder="Sua senha"
            autocomplete="${register ? "new-password" : "current-password"}"
            required
          >

          <button
            class="primary-btn"
            type="submit"
          >
            ${register ? "Criar conta" : "Entrar"}
          </button>

        </form>

        <div class="auth-switch">

          ${
            register
              ? `
                Já possui uma conta?
                <button id="switchAuth">
                  Entrar
                </button>
              `
              : `
                Ainda não possui conta?
                <button id="switchAuth">
                  Criar conta
                </button>
              `
          }

        </div>

      </div>

    </div>
  `;

  document
    .getElementById("authForm")
    .addEventListener("submit", event => {
      event.preventDefault();
      submitAuth(register);
    });

  document
    .getElementById("switchAuth")
    .addEventListener("click", () => {
      showLogin(!register);
    });
}

async function submitAuth(register) {
  const email =
    document.getElementById("email").value.trim();

  const password =
    document.getElementById("password").value;

  try {
    let data;

    if (register) {
      const name =
        document.getElementById("name").value.trim();

      data = await api("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password
        })
      });
    } else {
      data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password
        })
      });
    }

    token = data.token;

    localStorage.setItem(
      "vertex_token",
      token
    );

    user = data.user;

    await startApp();

  } catch (error) {
    alert(error.message);
  }
}

/* =========================
   INICIALIZAÇÃO
========================= */

async function startApp() {
  try {
    const data = await api("/api/me");

    user = data.user;

    await loadChats();

    renderApp();

  } catch {
    token = null;
    user = null;

    localStorage.removeItem(
      "vertex_token"
    );

    showLogin(false);
  }
}

async function loadChats() {
  try {
    const data =
      await api("/api/chats");

    chats =
      Array.isArray(data.chats)
        ? data.chats
        : [];

  } catch {
    chats = [];
  }
}

/* =========================
   APLICAÇÃO
========================= */

function renderApp() {
  app.innerHTML = `
    <div class="app-shell">

      <aside
        class="sidebar"
        id="sidebar"
      >

        <div class="sidebar-top">

          <div class="logo-small">
            <span class="logo-v">
              V
            </span>

            <span>
              VÉRTEX
            </span>
          </div>

          <button
            class="new-chat"
            id="newChatBtn"
            title="Nova conversa"
          >
            +
          </button>

        </div>

        <nav class="sidebar-nav">

          <button
            class="nav-item active"
            data-page="chat"
          >
            <span>💬</span>
            Conversa
          </button>

          <button
            class="nav-item"
            data-page="history"
          >
            <span>🕘</span>
            Histórico
          </button>

          <button
            class="nav-item"
            data-page="projects"
          >
            <span>📁</span>
            Projetos
          </button>

          <button
            class="nav-item"
            data-page="plans"
          >
            <span>💳</span>
            Planos
          </button>

          <button
            class="nav-item"
            data-page="settings"
          >
            <span>⚙️</span>
            Configurações
          </button>

        </nav>

        <div class="chat-history">

          <div class="chat-history-title">
            Conversas recentes
          </div>

          <div id="chatHistoryList"></div>

        </div>

        <div class="sidebar-bottom">

          <div class="user-mini">

            <div class="avatar user-avatar">
              ${escapeHTML(
                initials(user?.name)
              )}
            </div>

            <div class="user-info">

              <div class="user-name">
                ${escapeHTML(
                  user?.name || "Usuário"
                )}
              </div>

              <div class="user-plan">
                Plano
                ${escapeHTML(
                  user?.plan || "FREE"
                )}
              </div>

            </div>

            <button
              class="logout-btn"
              id="logoutBtn"
              title="Sair"
            >
              ↪
            </button>

          </div>

        </div>

      </aside>

      <main class="main">

        <header class="topbar">

          <button
            class="icon-btn mobile-menu"
            id="mobileMenuBtn"
            title="Menu"
          >
            ☰
          </button>

          <div
            class="top-title"
            id="topTitle"
          >
            VÉRTEX AI
          </div>

          <div class="top-actions">

            <button
              class="icon-btn"
              id="topNewChat"
              title="Nova conversa"
            >
              ✎
            </button>

            <div class="avatar user-avatar">
              ${escapeHTML(
                initials(user?.name)
              )}
            </div>

          </div>

        </header>

        <section
          class="chat-page"
          id="mainContent"
        ></section>

      </main>

    </div>
  `;

  bindMainEvents();

  renderChatHistory();

  renderChatPage();
}

/* =========================
   EVENTOS PRINCIPAIS
========================= */

function bindMainEvents() {

  document
    .querySelectorAll(".nav-item")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const page =
            button.dataset.page;

          document
            .querySelectorAll(".nav-item")
            .forEach(item =>
              item.classList.remove("active")
            );

          button.classList.add("active");

          if (page === "chat")
            renderChatPage();

          if (page === "history")
            renderHistoryPage();

          if (page === "projects")
            renderProjectsPage();

          if (page === "plans")
            renderPlansPage();

          if (page === "settings")
            renderSettingsPage();

          closeMobileSidebar();
        }
      );

    });

  document
    .getElementById("newChatBtn")
    .addEventListener(
      "click",
      newChat
    );

  document
    .getElementById("topNewChat")
    .addEventListener(
      "click",
      newChat
    );

  document
    .getElementById("logoutBtn")
    .addEventListener(
      "click",
      logout
    );

  document
    .getElementById("mobileMenuBtn")
    .addEventListener(
      "click",
      () => {

        document
          .getElementById("sidebar")
          .classList.toggle("open");

      }
    );
}

function closeMobileSidebar() {
  document
    .getElementById("sidebar")
    ?.classList.remove("open");
}

/* =========================
   HISTÓRICO SIDEBAR
========================= */

function renderChatHistory() {

  const container =
    document.getElementById(
      "chatHistoryList"
    );

  if (!container) return;

  if (!chats.length) {

    container.innerHTML = `
      <div class="empty-history">
        Nenhuma conversa ainda
      </div>
    `;

    return;
  }

  container.innerHTML =
    chats
      .slice(0, 20)
      .map(
        chat => `
          <button
            class="chat-history-item"
            data-chat-id="${chat.id}"
          >
            ${escapeHTML(
              chat.title ||
              "Nova conversa"
            )}
          </button>
        `
      )
      .join("");

  container
    .querySelectorAll(
      ".chat-history-item"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          await openChat(
            Number(
              button.dataset.chatId
            )
          );

          closeMobileSidebar();
        }
      );

    });
}

/* =========================
   PÁGINA DO CHAT
========================= */

function renderChatPage() {

  const main =
    document.getElementById(
      "mainContent"
    );

  if (!main) return;

  main.className =
    "chat-page";

  document.getElementById(
    "topTitle"
  ).textContent =
    "VÉRTEX AI";

  main.innerHTML = `
    <div
      class="messages"
      id="messagesArea"
    >

      <div
        class="message-list"
        id="messageList"
      ></div>

    </div>

    <div class="composer-area">

      <div
        class="plus-menu"
        id="plusMenu"
        style="display:none;"
      >

        <button data-action="projects">
          📁 Projetos
        </button>

        <button data-action="history">
          🕘 Histórico
        </button>

        <button data-action="plans">
          💳 Planos
        </button>

        <button data-action="settings">
          ⚙️ Configurações
        </button>

      </div>

      <div class="composer">

        <button
          class="plus-btn"
          id="plusBtn"
          title="Mais opções"
        >
          +
        </button>

        <textarea
          id="messageInput"
          placeholder="Mensagem para o VÉRTEX..."
          rows="1"
        ></textarea>

        <button
          class="send-btn"
          id="sendBtn"
          title="Enviar"
          disabled
        >
          ↑
        </button>

      </div>

      <div class="composer-note">
        O VÉRTEX pode cometer erros.
        Confira informações importantes.
      </div>

    </div>
  `;

  bindChatEvents();

  renderMessages();
}

/* =========================
   EVENTOS DO CHAT
========================= */

function bindChatEvents() {

  const input =
    document.getElementById(
      "messageInput"
    );

  const send =
    document.getElementById(
      "sendBtn"
    );

  const plus =
    document.getElementById(
      "plusBtn"
    );

  const menu =
    document.getElementById(
      "plusMenu"
    );

  input.addEventListener(
    "input",
    () => {

      input.style.height =
        "auto";

      input.style.height =
        Math.min(
          input.scrollHeight,
          180
        ) + "px";

      send.disabled =
        !input.value.trim();
    }
  );

  input.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Enter" &&
        !event.shiftKey
      ) {

        event.preventDefault();

        if (!loading) {
          sendMessage();
        }

      }

    }
  );

  send.addEventListener(
    "click",
    sendMessage
  );

  plus.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      menu.style.display =
        menu.style.display === "none"
          ? "block"
          : "none";

    }
  );

  menu
    .querySelectorAll("button")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const action =
            button.dataset.action;

          menu.style.display =
            "none";

          navigateTo(action);
        }
      );

    });

  document.addEventListener(
    "click",
    event => {

      if (
        !menu.contains(
          event.target
        ) &&
        event.target !== plus
      ) {

        menu.style.display =
          "none";

      }

    }
  );
}

/* =========================
   MENSAGENS
========================= */

function renderMessages() {

  const list =
    document.getElementById(
      "messageList"
    );

  if (!list) return;

  if (
    !currentChat ||
    !Array.isArray(
      currentChat.messages
    ) ||
    currentChat.messages.length === 0
  ) {

    list.innerHTML = `
      <div class="welcome">

        <div class="welcome-logo">
          V
        </div>

        <h1>
          Como posso ajudar?
        </h1>

        <p>
          Marketing digital, conteúdo,
          anúncios e estratégias.
        </p>

        <div class="suggestions">

          ${suggestions
            .map(
              text => `
                <button
                  class="suggestion"
                  data-suggestion="${escapeHTML(text)}"
                >
                  ${escapeHTML(text)}
                </button>
              `
            )
            .join("")}

        </div>

      </div>
    `;

    list
      .querySelectorAll(
        ".suggestion"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {

            const input =
              document.getElementById(
                "messageInput"
              );

            input.value =
              button.dataset.suggestion;

            input.dispatchEvent(
              new Event("input")
            );

            input.focus();
          }
        );

      });

    return;
  }

  list.innerHTML =
    currentChat.messages
      .map(message => {

        const isUser =
          message.role === "user";

        return `
          <div
            class="message-row ${
              isUser
                ? "message-user"
                : "message-vertex"
            }"
          >

            ${
              !isUser
                ? `
                  <div class="vertex-avatar">

                    <svg
                      viewBox="0 0 40 40"
                      aria-hidden="true"
                    >
                      <path
                        d="M7 7
                           L15 7
                           L20 22
                           L26 7
                           L34 7
                           L25 33
                           L17 33
                           Z"
                      ></path>
                    </svg>

                  </div>
                `
                : ""
            }

            <div class="message-bubble">

              <div class="message-name">
                ${
                  isUser
                    ? escapeHTML(
                        user?.name ||
                        "Você"
                      )
                    : "VÉRTEX AI"
                }
              </div>

              <div class="message-text">
                ${escapeHTML(
                  message.content
                )}
              </div>

            </div>

            ${
              isUser
                ? `
                  <div class="user-message-avatar">
                    ${escapeHTML(
                      initials(
                        user?.name
                      )
                    )}
                  </div>
                `
                : ""
            }

          </div>
        `;
      })
      .join("");

  const area =
    document.getElementById(
      "messagesArea"
    );

  if (area) {

    setTimeout(() => {
      area.scrollTop =
        area.scrollHeight;
    }, 0);

  }
}

/* =========================
   NOVA CONVERSA
========================= */

async function newChat() {

  try {

    const data =
      await api(
        "/api/chats",
        {
          method: "POST",
          body: JSON.stringify({
            title:
              "Nova conversa"
          })
        }
      );

    currentChat =
      data.chat;

    chats.unshift(
      currentChat
    );

    renderChatHistory();

    renderChatPage();

  } catch (error) {

    alert(error.message);

  }
}

/* =========================
   ABRIR CONVERSA
========================= */

async function openChat(id) {

  try {

    const data =
      await api(
        `/api/chats/${id}`
      );

    currentChat =
      data.chat;

    renderChatPage();

  } catch (error) {

    alert(error.message);

  }
}

/* =========================
   ENVIAR MENSAGEM
========================= */

async function sendMessage() {

  if (loading) return;

  const input =
    document.getElementById(
      "messageInput"
    );

  const send =
    document.getElementById(
      "sendBtn"
    );

  if (!input) return;

  const text =
    input.value.trim();

  if (!text) return;

  loading = true;

  send.disabled = true;

  /* Cria conversa */

  if (!currentChat) {

    try {

      const data =
        await api(
          "/api/chats",
          {
            method: "POST",
            body: JSON.stringify({
              title:
                text.length > 35
                  ? text.slice(0, 35) +
                    "..."
                  : text
            })
          }
        );

      currentChat =
        data.chat;

      chats.unshift(
        currentChat
      );

      renderChatHistory();

    } catch (error) {

      loading = false;

      send.disabled = false;

      alert(error.message);

      return;
    }
  }

  if (
    !Array.isArray(
      currentChat.messages
    )
  ) {
    currentChat.messages = [];
  }

  currentChat.messages.push({
    role: "user",
    content: text
  });

  input.value = "";

  input.style.height =
    "auto";

  renderMessages();

  try {

    const data =
      await api(
        "/api/ai/generate",
        {
          method: "POST",
          body: JSON.stringify({
            message: text,
            history:
              currentChat.messages
                .slice(0, -1)
          })
        }
      );

    const answer =
      data.answer ||
      "Não consegui gerar uma resposta agora.";

    currentChat.messages.push({
      role: "assistant",
      content: answer
    });

    await saveCurrentChat();

    renderMessages();

  } catch (error) {

    console.error(
      "Erro na IA:",
      error
    );

    currentChat.messages.push({
      role: "assistant",
      content:
        "Não consegui responder agora. Tente novamente."
    });

    renderMessages();

  } finally {

    loading = false;

    send.disabled =
      !input.value.trim();

    input.focus();

  }
}

/* =========================
   SALVAR CONVERSA
========================= */

async function saveCurrentChat() {

  if (!currentChat) return;

  try {

    await api(
      `/api/chats/${currentChat.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          title:
            currentChat.title ||
            "Nova conversa",

          messages:
            currentChat.messages
        })
      }
    );

    const index =
      chats.findIndex(
        chat =>
          chat.id ===
          currentChat.id
      );

    if (index !== -1) {

      chats[index] =
        currentChat;

    }

    renderChatHistory();

  } catch (error) {

    console.error(
      "Erro ao salvar conversa:",
      error
    );

  }
}

/* =========================
   NAVEGAÇÃO
========================= */

function navigateTo(page) {

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(item => {

      item.classList.toggle(
        "active",
        item.dataset.page === page
      );

    });

  if (page === "chat")
    renderChatPage();

  if (page === "history")
    renderHistoryPage();

  if (page === "projects")
    renderProjectsPage();

  if (page === "plans")
    renderPlansPage();

  if (page === "settings")
    renderSettingsPage();

  closeMobileSidebar();
}

/* =========================
   HISTÓRICO
========================= */

function renderHistoryPage() {

  const main =
    document.getElementById(
      "mainContent"
    );

  document.getElementById(
    "topTitle"
  ).textContent =
    "Histórico";

  main.className =
    "page";

  main.innerHTML = `
    <div class="page-inner">

      <h1>
        Histórico
      </h1>

      <p class="page-subtitle">
        Suas conversas anteriores
        com o VÉRTEX AI.
      </p>

      ${
        chats.length
          ? `
            <div class="card-grid">

              ${chats
                .map(
                  chat => `
                    <button
                      class="card"
                      data-history-id="${chat.id}"
                    >

                      <h3>
                        ${escapeHTML(
                          chat.title ||
                          "Nova conversa"
                        )}
                      </h3>

                      <p>
                        ${
                          chat.messages?.length ||
                          0
                        }
                        mensagens
                      </p>

                    </button>
                  `
                )
                .join("")}

            </div>
          `
          : `
            <div class="card">

              <h3>
                Nenhuma conversa
              </h3>

              <p>
                Comece uma conversa
                com o VÉRTEX AI.
              </p>

            </div>
          `
      }

    </div>
  `;

  main
    .querySelectorAll(
      "[data-history-id]"
    )
    .forEach(button => {

      button.addEventListener(
        "click",
        async () => {

          await openChat(
            Number(
              button.dataset
                .historyId
            )
          );

        }
      );

    });
}

/* =========================
   PROJETOS
========================= */

function renderProjectsPage() {

  const main =
    document.getElementById(
      "mainContent"
    );

  document.getElementById(
    "topTitle"
  ).textContent =
    "Projetos";

  main.className =
    "page";

  main.innerHTML = `
    <div class="page-inner">

      <h1>
        Projetos
      </h1>

      <p class="page-subtitle">
        Organize suas ideias,
        campanhas e trabalhos.
      </p>

      <div class="card-grid">

        <div class="card">
          <h3>📣 Campanhas</h3>
          <p>
            Planeje anúncios e campanhas
            de marketing.
          </p>
        </div>

        <div class="card">
          <h3>📱 Conteúdo</h3>
          <p>
            Organize ideias para Instagram
            e outras redes.
          </p>
        </div>

        <div class="card">
          <h3>✍️ Copywriting</h3>
          <p>
            Crie textos, títulos,
            chamadas e CTAs.
          </p>
        </div>

        <div class="card">
          <h3>💡 Ideias</h3>
          <p>
            Guarde novas ideias
            para seus projetos.
          </p>
        </div>

      </div>

    </div>
  `;
}

/* =========================
   PLANOS
========================= */

async function renderPlansPage() {

  const main =
    document.getElementById(
      "mainContent"
    );

  document.getElementById(
    "topTitle"
  ).textContent =
    "Planos";

  main.className =
    "page";

  main.innerHTML = `
    <div class="page-inner">

      <h1>
        Planos
      </h1>

      <p class="page-subtitle">
        Escolha o plano que melhor
        combina com você.
      </p>

      <div id="plansContainer">

        <div class="card">
          Carregando planos...
        </div>

      </div>

    </div>
  `;

  try {

    const data =
      await api(
        "/api/plans"
      );

    const plans =
      data.plans || [];

    document.getElementById(
      "plansContainer"
    ).innerHTML = `
      <div class="card-grid">

        ${plans
          .map(
            plan => `
              <div class="plan-card">

                <h2>
                  ${escapeHTML(
                    plan.name
                  )}
                </h2>

                <div class="plan-price">

                  ${
                    Number(
                      plan.price
                    ) === 0
                      ? "Grátis"
                      : `R$ ${Number(
                          plan.price
                        )
                          .toFixed(2)
                          .replace(
                            ".",
                            ","
                          )}`
                  }

                </div>

                <p>
                  ${escapeHTML(
                    plan.description
                  )}
                </p>

              </div>
            `
          )
          .join("")}

      </div>
    `;

  } catch {

    document.getElementById(
      "plansContainer"
    ).innerHTML = `
      <div class="card">

        <h3>
          Não foi possível
          carregar os planos.
        </h3>

      </div>
    `;
  }
}

/* =========================
   CONFIGURAÇÕES
========================= */

function renderSettingsPage() {

  const main =
    document.getElementById(
      "mainContent"
    );

  document.getElementById(
    "topTitle"
  ).textContent =
    "Configurações";

  main.className =
    "page";

  main.innerHTML = `
    <div class="page-inner">

      <h1>
        Configurações
      </h1>

      <p class="page-subtitle">
        Informações da sua conta VÉRTEX.
      </p>

      <div class="card">

        <div class="settings-row">

          <div>

            <strong>
              Nome
            </strong>

            <p>
              ${escapeHTML(
                user?.name || "-"
              )}
            </p>

          </div>

        </div>

        <div class="settings-row">

          <div>

            <strong>
              E-mail
            </strong>

            <p>
              ${escapeHTML(
                user?.email || "-"
              )}
            </p>

          </div>

        </div>

        <div class="settings-row">

          <div>

            <strong>
              Plano
            </strong>

            <p>
              ${escapeHTML(
                user?.plan ||
                "FREE"
              )}
            </p>

          </div>

        </div>

        <div class="settings-row">

          <div>

            <strong>
              Conta
            </strong>

            <p>
              Sua conta está ativa.
            </p>

          </div>

          <button
            class="primary-btn"
            id="settingsLogout"
          >
            Sair
          </button>

        </div>

      </div>

    </div>
  `;

  document
    .getElementById(
      "settingsLogout"
    )
    .addEventListener(
      "click",
      logout
    );
}

/* =========================
   LOGOUT
========================= */

function logout() {

  token = null;
  user = null;
  chats = [];
  currentChat = null;

  localStorage.removeItem(
    "vertex_token"
  );

  showLogin(false);
}

/* =========================
   INICIAR
========================= */

if (token) {
  startApp();
} else {
  showLogin(false);
}

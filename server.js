const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;

const JWT_SECRET = process.env.JWT_SECRET || "vertex-secret-change-me";

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// =====================================================
// BANCO DE DADOS
// =====================================================

const dbDir = path.join(__dirname, "data");
fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, "vertex.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    plan TEXT DEFAULT 'FREE',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT DEFAULT 'Nova conversa',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Não autorizado."
    });
  }

  const token = header.substring(7);

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      error: "Sessão expirada."
    });
  }
}

function cleanText(value, max = 12000) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

// =====================================================
// HEALTH
// =====================================================

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "VÉRTEX AI"
  });
});

// =====================================================
// AUTENTICAÇÃO
// =====================================================

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = cleanText(req.body.name, 80);
    const email = cleanText(req.body.email, 160).toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || !password) {
      return res.status(400).json({
        error: "Preencha todos os campos."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "A senha precisa ter pelo menos 6 caracteres."
      });
    }

    const exists = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);

    if (exists) {
      return res.status(409).json({
        error: "Este e-mail já está cadastrado."
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = db
      .prepare(`
        INSERT INTO users (name, email, password)
        VALUES (?, ?, ?)
      `)
      .run(name, email, hash);

    const user = db
      .prepare(`
        SELECT id, name, email, plan
        FROM users
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    res.json({
      token: createToken(user),
      user
    });
  } catch (error) {
    console.error("REGISTER:", error);

    res.status(500).json({
      error: "Não foi possível criar a conta."
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = cleanText(req.body.email, 160).toLowerCase();
    const password = String(req.body.password || "");

    const user = db
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(email);

    if (!user) {
      return res.status(401).json({
        error: "E-mail ou senha incorretos."
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        error: "E-mail ou senha incorretos."
      });
    }

    res.json({
      token: createToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan
      }
    });
  } catch (error) {
    console.error("LOGIN:", error);

    res.status(500).json({
      error: "Erro ao entrar."
    });
  }
});

// =====================================================
// USUÁRIO
// =====================================================

app.get("/api/me", auth, (req, res) => {
  const user = db
    .prepare(`
      SELECT id, name, email, plan, created_at
      FROM users
      WHERE id = ?
    `)
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({
      error: "Usuário não encontrado."
    });
  }

  res.json({
    user
  });
});

// =====================================================
// CHATS
// =====================================================

app.get("/api/chats", auth, (req, res) => {
  const chats = db
    .prepare(`
      SELECT
        id,
        title,
        created_at,
        updated_at
      FROM chats
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `)
    .all(req.user.id);

  res.json({
    chats
  });
});

app.post("/api/chats", auth, (req, res) => {
  const title =
    cleanText(req.body.title, 120) || "Nova conversa";

  const result = db
    .prepare(`
      INSERT INTO chats (user_id, title)
      VALUES (?, ?)
    `)
    .run(req.user.id, title);

  const chat = db
    .prepare(`
      SELECT *
      FROM chats
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);

  res.json({
    chat
  });
});

app.get("/api/chats/:id", auth, (req, res) => {
  const chatId = Number(req.params.id);

  const chat = db
    .prepare(`
      SELECT *
      FROM chats
      WHERE id = ?
      AND user_id = ?
    `)
    .get(chatId, req.user.id);

  if (!chat) {
    return res.status(404).json({
      error: "Conversa não encontrada."
    });
  }

  const messages = db
    .prepare(`
      SELECT id, role, content, created_at
      FROM messages
      WHERE chat_id = ?
      ORDER BY id ASC
    `)
    .all(chatId);

  res.json({
    chat,
    messages
  });
});

app.delete("/api/chats/:id", auth, (req, res) => {
  const chatId = Number(req.params.id);

  const chat = db
    .prepare(`
      SELECT id
      FROM chats
      WHERE id = ?
      AND user_id = ?
    `)
    .get(chatId, req.user.id);

  if (!chat) {
    return res.status(404).json({
      error: "Conversa não encontrada."
    });
  }

  db.prepare("DELETE FROM messages WHERE chat_id = ?")
    .run(chatId);

  db.prepare("DELETE FROM chats WHERE id = ?")
    .run(chatId);

  res.json({
    ok: true
  });
});

// =====================================================
// HISTÓRICO
// =====================================================

app.get("/api/history", auth, (req, res) => {
  const history = db
    .prepare(`
      SELECT
        c.id,
        c.title,
        c.created_at,
        c.updated_at,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.chat_id = c.id
        ) AS message_count
      FROM chats c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
    `)
    .all(req.user.id);

  res.json({
    history
  });
});

// =====================================================
// PROJETOS
// =====================================================

app.get("/api/projects", auth, (req, res) => {
  const projects = db
    .prepare(`
      SELECT *
      FROM projects
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `)
    .all(req.user.id);

  res.json({
    projects
  });
});

app.post("/api/projects", auth, (req, res) => {
  const name = cleanText(req.body.name, 120);
  const description = cleanText(req.body.description, 1000);

  if (!name) {
    return res.status(400).json({
      error: "Digite um nome para o projeto."
    });
  }

  const result = db
    .prepare(`
      INSERT INTO projects
      (user_id, name, description)
      VALUES (?, ?, ?)
    `)
    .run(
      req.user.id,
      name,
      description
    );

  const project = db
    .prepare(`
      SELECT *
      FROM projects
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);

  res.json({
    project
  });
});

app.delete("/api/projects/:id", auth, (req, res) => {
  const id = Number(req.params.id);

  const result = db
    .prepare(`
      DELETE FROM projects
      WHERE id = ?
      AND user_id = ?
    `)
    .run(id, req.user.id);

  if (!result.changes) {
    return res.status(404).json({
      error: "Projeto não encontrado."
    });
  }

  res.json({
    ok: true
  });
});

// =====================================================
// IA VÉRTEX
// =====================================================

const VERTEX_SYSTEM_PROMPT = `
Você é o VÉRTEX AI.

Você é um assistente digital especializado em:
- marketing digital;
- renda extra;
- vendas online;
- criação de conteúdo;
- copywriting;
- anúncios;
- Instagram;
- estratégias de aquisição;
- criação de ofertas;
- páginas de vendas;
- roteiros para vídeos;
- ideias de produtos digitais;
- organização de projetos.

PERSONALIDADE:
- Seja inteligente, direto e estratégico.
- Fale em português do Brasil.
- Explique de forma simples quando o usuário estiver começando.
- Quando o usuário pedir algo prático, entregue algo pronto para usar.
- Não fique repetindo que você é uma IA.
- Não invente resultados, números ou experiências pessoais.
- Não prometa dinheiro fácil ou ganhos garantidos.
- Quando uma estratégia tiver riscos ou depender de testes, deixe isso claro.

COMO RESPONDER:
1. Entenda primeiro o objetivo do usuário.
2. Dê uma resposta prática.
3. Quando fizer sentido, organize em etapas.
4. Use exemplos.
5. Se o usuário pedir uma copy, entregue a copy pronta.
6. Se pedir um anúncio, entregue gancho, texto, título e CTA.
7. Se pedir estratégia, explique o caminho passo a passo.
8. Se o usuário estiver perdido, ajude a escolher o próximo passo.
9. Não faça perguntas desnecessárias quando já houver informação suficiente.

O objetivo do VÉRTEX é ajudar o usuário a transformar ideias em ações concretas no digital.
`;

// =====================================================
// CHAMADA PARA API DE IA
// =====================================================

async function callAI(messages) {
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return {
      demo: true,
      text:
        "O VÉRTEX está funcionando, mas a chave da IA ainda não foi configurada no Railway. Adicione a variável AI_API_KEY para ativar as respostas da IA."
    };
  }

  const apiUrl =
    process.env.AI_API_URL ||
    "https://api.openai.com/v1/responses";

  const model =
    process.env.AI_MODEL ||
    "gpt-5.6-luna";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: messages,
      temperature: 0.7,
      max_output_tokens: 1800
    })
  });

  const raw = await response.text();

  if (!response.ok) {
    console.error("AI STATUS:", response.status);
    console.error("AI RESPONSE:", raw);

    throw new Error(
      `Falha na API de IA: ${response.status}`
    );
  }

  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("Resposta inválida da API de IA.");
  }

  // Formato Responses API
  if (data.output_text) {
    return {
      demo: false,
      text: data.output_text
    };
  }

  // Fallback caso a API retorne blocos de output
  if (Array.isArray(data.output)) {
    const parts = [];

    for (const item of data.output) {
      if (!Array.isArray(item.content)) continue;

      for (const content of item.content) {
        if (
          content.type === "output_text" &&
          content.text
        ) {
          parts.push(content.text);
        }
      }
    }

    if (parts.length) {
      return {
        demo: false,
        text: parts.join("\n")
      };
    }
  }

  throw new Error(
    "A IA respondeu, mas não foi possível encontrar o texto."
  );
}

// =====================================================
// GERAR RESPOSTA
// =====================================================

app.post("/api/ai/generate", auth, async (req, res) => {
  try {
    const chatId = Number(req.body.chat_id);
    const userMessage = cleanText(
      req.body.message,
      12000
    );

    if (!chatId || !userMessage) {
      return res.status(400).json({
        error: "Mensagem inválida."
      });
    }

    // Verifica se o chat pertence ao usuário
    const chat = db
      .prepare(`
        SELECT *
        FROM chats
        WHERE id = ?
        AND user_id = ?
      `)
      .get(chatId, req.user.id);

    if (!chat) {
      return res.status(404).json({
        error: "Conversa não encontrada."
      });
    }

    // Salva mensagem do usuário
    db.prepare(`
      INSERT INTO messages
      (chat_id, role, content)
      VALUES (?, 'user', ?)
    `).run(chatId, userMessage);

    // Atualiza título automaticamente na primeira mensagem
    const messageCount = db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM messages
        WHERE chat_id = ?
      `)
      .get(chatId);

    if (messageCount.total === 1) {
      const title =
        userMessage.length > 55
          ? userMessage.substring(0, 55) + "..."
          : userMessage;

      db.prepare(`
        UPDATE chats
        SET title = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(title, chatId);
    }

    // Pega contexto da conversa
    const history = db
      .prepare(`
        SELECT role, content
        FROM messages
        WHERE chat_id = ?
        ORDER BY id DESC
        LIMIT 20
      `)
      .all(chatId)
      .reverse();

    const aiMessages = [
      {
        role: "system",
        content: VERTEX_SYSTEM_PROMPT
      },
      ...history.map(message => ({
        role:
          message.role === "assistant"
            ? "assistant"
            : "user",
        content: message.content
      }))
    ];

    // Chama a IA
    const result = await callAI(aiMessages);

    const assistantText = cleanText(
      result.text,
      16000
    );

    // Salva resposta
    db.prepare(`
      INSERT INTO messages
      (chat_id, role, content)
      VALUES (?, 'assistant', ?)
    `).run(chatId, assistantText);

    // Atualiza conversa
    db.prepare(`
      UPDATE chats
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(chatId);

    res.json({
      ok: true,
      message: assistantText,
      demo: result.demo || false
    });
  } catch (error) {
    console.error("VÉRTEX AI ERROR:", error);

    res.status(500).json({
      error:
        "O VÉRTEX encontrou um problema ao gerar a resposta."
    });
  }
});

// =====================================================
// PLANOS
// =====================================================

app.get("/api/plans", (req, res) => {
  res.json({
    plans: [
      {
        id: "FREE",
        name: "Grátis",
        price: 0,
        description: "Para começar"
      },
      {
        id: "PRO",
        name: "VÉRTEX PRO",
        price: 29.90,
        description: "Mais recursos e utilização"
      },
      {
        id: "PRO_ANNUAL",
        name: "VÉRTEX PRO Anual",
        price: 299.90,
        description: "Plano anual"
      }
    ]
  });
});

// =====================================================
// ARQUIVOS DO SITE
// =====================================================

const publicDir = path.join(__dirname, "public");

app.use(express.static(publicDir));

app.get("/{*splat}", (req, res) => {
  res.sendFile(
    path.join(publicDir, "index.html")
  );
});

// =====================================================
// INICIAR
// =====================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `VÉRTEX AI rodando na porta ${PORT}`
  );
});

const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "vertex-secret-change-me";

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
  credits INTEGER DEFAULT 30,
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
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT DEFAULT 'Ativo',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

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
      error: "Não autenticado"
    });
  }

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      error: "Sessão expirada"
    });
  }
}

function getUser(id) {
  return db.prepare(`
    SELECT id, name, email, plan, credits, created_at
    FROM users
    WHERE id = ?
  `).get(id);
}

function cleanText(text) {
  return String(text || "")
    .replace(/\u0000/g, "")
    .trim();
}

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "VÉRTEX AI",
    version: "5.0.0"
  });
});

/* =========================
   AUTH
========================= */

app.post("/api/auth/register", (req, res) => {
  const name = cleanText(req.body.name);
  const email = cleanText(req.body.email).toLowerCase();
  const password = String(req.body.password || "");

  if (!name || !email || password.length < 6) {
    return res.status(400).json({
      error: "Preencha nome, e-mail e uma senha com pelo menos 6 caracteres."
    });
  }

  const exists = db.prepare(`
    SELECT id FROM users WHERE email = ?
  `).get(email);

  if (exists) {
    return res.status(409).json({
      error: "Este e-mail já está cadastrado."
    });
  }

  const hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (name, email, password)
    VALUES (?, ?, ?)
  `).run(name, email, hash);

  const user = getUser(result.lastInsertRowid);

  res.json({
    token: createToken(user),
    user
  });
});

app.post("/api/auth/login", (req, res) => {
  const email = cleanText(req.body.email).toLowerCase();
  const password = String(req.body.password || "");

  const user = db.prepare(`
    SELECT * FROM users WHERE email = ?
  `).get(email);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({
      error: "E-mail ou senha incorretos."
    });
  }

  res.json({
    token: createToken(user),
    user: getUser(user.id)
  });
});

app.get("/api/me", auth, (req, res) => {
  const user = getUser(req.user.id);

  if (!user) {
    return res.status(404).json({
      error: "Usuário não encontrado."
    });
  }

  res.json({ user });
});

/* =========================
   CHATS
========================= */

app.get("/api/chats", auth, (req, res) => {
  const chats = db.prepare(`
    SELECT
      c.id,
      c.title,
      c.created_at,
      c.updated_at,
      (
        SELECT content
        FROM messages m
        WHERE m.chat_id = c.id
        ORDER BY m.id DESC
        LIMIT 1
      ) AS last_message
    FROM chats c
    WHERE c.user_id = ?
    ORDER BY c.updated_at DESC
  `).all(req.user.id);

  res.json({ chats });
});

app.post("/api/chats", auth, (req, res) => {
  const title = cleanText(req.body.title) || "Nova conversa";

  const result = db.prepare(`
    INSERT INTO chats (user_id, title)
    VALUES (?, ?)
  `).run(req.user.id, title);

  const chat = db.prepare(`
    SELECT * FROM chats WHERE id = ?
  `).get(result.lastInsertRowid);

  res.json({ chat });
});

app.get("/api/chats/:id", auth, (req, res) => {
  const chat = db.prepare(`
    SELECT *
    FROM chats
    WHERE id = ? AND user_id = ?
  `).get(req.params.id, req.user.id);

  if (!chat) {
    return res.status(404).json({
      error: "Conversa não encontrada."
    });
  }

  const messages = db.prepare(`
    SELECT id, role, content, created_at
    FROM messages
    WHERE chat_id = ?
    ORDER BY id ASC
  `).all(chat.id);

  res.json({
    chat,
    messages
  });
});

app.delete("/api/chats/:id", auth, (req, res) => {
  const chat = db.prepare(`
    SELECT id FROM chats
    WHERE id = ? AND user_id = ?
  `).get(req.params.id, req.user.id);

  if (!chat) {
    return res.status(404).json({
      error: "Conversa não encontrada."
    });
  }

  db.prepare(`
    DELETE FROM messages WHERE chat_id = ?
  `).run(chat.id);

  db.prepare(`
    DELETE FROM chats WHERE id = ?
  `).run(chat.id);

  res.json({ ok: true });
});

/* =========================
   HISTÓRICO
========================= */

app.get("/api/history", auth, (req, res) => {
  const history = db.prepare(`
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
  `).all(req.user.id);

  res.json({ history });
});

/* =========================
   MENSAGENS
========================= */

app.post("/api/chats/:id/messages", auth, (req, res) => {
  const chat = db.prepare(`
    SELECT id
    FROM chats
    WHERE id = ? AND user_id = ?
  `).get(req.params.id, req.user.id);

  if (!chat) {
    return res.status(404).json({
      error: "Conversa não encontrada."
    });
  }

  const content = cleanText(req.body.content);

  if (!content) {
    return res.status(400).json({
      error: "Mensagem vazia."
    });
  }

  db.prepare(`
    INSERT INTO messages (chat_id, role, content)
    VALUES (?, 'user', ?)
  `).run(chat.id, content);

  db.prepare(`
    UPDATE chats
    SET
      title = CASE
        WHEN title = 'Nova conversa' THEN ?
        ELSE title
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    content.length > 45
      ? content.slice(0, 45) + "..."
      : content,
    chat.id
  );

  res.json({
    ok: true
  });
});

/* =========================
   IA
========================= */

async function generateAI(messages) {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl =
    process.env.AI_API_URL ||
    "https://api.openai.com/v1/responses";

  const model =
    process.env.AI_MODEL ||
    "gpt-5.6-luna";

  if (!apiKey) {
    return {
      demo: true,
      text:
        "A VÉRTEX está pronta. Para ativar a resposta real da IA, configure a variável AI_API_KEY no Railway."
    };
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      input: messages.map(m => ({
        role: m.role === "assistant"
          ? "assistant"
          : "user",
        content: m.content
      }))
    })
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      "AI ERROR:",
      response.status,
      errorText
    );

    throw new Error(
      "Falha no provedor de IA."
    );
  }

  const data = await response.json();

  let text = "";

  if (typeof data.output_text === "string") {
    text = data.output_text;
  }

  if (!text && Array.isArray(data.output)) {
    for (const item of data.output) {
      if (Array.isArray(item.content)) {
        for (const part of item.content) {
          if (typeof part.text === "string") {
            text += part.text;
          }
        }
      }
    }
  }

  if (!text) {
    text =
      "Não consegui gerar uma resposta agora.";
  }

  return {
    demo: false,
    text: text.trim()
  };
}

app.post("/api/ai/generate", auth, async (req, res) => {
  try {
    const chatId = Number(req.body.chatId);
    const prompt = cleanText(req.body.prompt);

    if (!chatId || !prompt) {
      return res.status(400).json({
        error: "Chat ou mensagem inválida."
      });
    }

    const chat = db.prepare(`
      SELECT id
      FROM chats
      WHERE id = ? AND user_id = ?
    `).get(chatId, req.user.id);

    if (!chat) {
      return res.status(404).json({
        error: "Conversa não encontrada."
      });
    }

    const history = db.prepare(`
      SELECT role, content
      FROM messages
      WHERE chat_id = ?
      ORDER BY id ASC
      LIMIT 30
    `).all(chatId);

    const aiMessages = [
      {
        role: "user",
        content:
          "Você é a VÉRTEX AI, uma assistente profissional especializada em marketing digital, criação de conteúdo, vendas online, afiliados, copywriting, anúncios, funis, estratégias digitais e ideias legítimas para geração de renda. Responda em português do Brasil, de forma prática, clara e profissional."
      },
      ...history,
      {
        role: "user",
        content: prompt
      }
    ];

    const result = await generateAI(
      aiMessages
    );

    db.prepare(`
      INSERT INTO messages (chat_id, role, content)
      VALUES (?, 'assistant', ?)
    `).run(
      chatId,
      result.text
    );

    db.prepare(`
      UPDATE chats
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(chatId);

    res.json({
      ok: true,
      message: result.text,
      demo: result.demo
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error:
        "A IA não conseguiu responder agora."
    });
  }
});

/* =========================
   PROJETOS
========================= */

app.get("/api/projects", auth, (req, res) => {
  const projects = db.prepare(`
    SELECT *
    FROM projects
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(req.user.id);

  res.json({ projects });
});

app.post("/api/projects", auth, (req, res) => {
  const title = cleanText(req.body.title);
  const description =
    cleanText(req.body.description);

  if (!title) {
    return res.status(400).json({
      error:
        "Informe um nome para o projeto."
    });
  }

  const result = db.prepare(`
    INSERT INTO projects (
      user_id,
      title,
      description,
      status
    )
    VALUES (?, ?, ?, ?)
  `).run(
    req.user.id,
    title,
    description,
    "Ativo"
  );

  const project = db.prepare(`
    SELECT *
    FROM projects
    WHERE id = ?
  `).get(result.lastInsertRowid);

  res.json({ project });
});

app.put("/api/projects/:id", auth, (req, res) => {
  const project = db.prepare(`
    SELECT id
    FROM projects
    WHERE id = ? AND user_id = ?
  `).get(
    req.params.id,
    req.user.id
  );

  if (!project) {
    return res.status(404).json({
      error:
        "Projeto não encontrado."
    });
  }

  const title = cleanText(req.body.title);
  const description =
    cleanText(req.body.description);

  const status =
    cleanText(req.body.status) ||
    "Em andamento";

  db.prepare(`
    UPDATE projects
    SET
      title = ?,
      description = ?,
      status = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title,
    description,
    status,
    project.id
  );

  res.json({
    project: db.prepare(`
      SELECT *
      FROM projects
      WHERE id = ?
    `).get(project.id)
  });
});

app.delete("/api/projects/:id", auth, (req, res) => {
  const result = db.prepare(`
    DELETE FROM projects
    WHERE id = ? AND user_id = ?
  `).run(
    req.params.id,
    req.user.id
  );

  if (!result.changes) {
    return res.status(404).json({
      error:
        "Projeto não encontrado."
    });
  }

  res.json({
    ok: true
  });
});

/* =========================
   PLANOS
========================= */

app.get("/api/plans", (req, res) => {
  res.json({
    plans: [
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
    ]
  });
});

/* =========================
   STATIC
========================= */

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

app.get("/{*splat}", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

app.listen(PORT, () => {
  console.log(
    `VÉRTEX AI rodando na porta ${PORT}`
  );
});

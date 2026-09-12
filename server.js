const express = require("express");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "vertex-secret-change-this";

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
    messages TEXT DEFAULT '[]',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
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
      error: "Não autenticado."
    });
  }

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      error: "Sessão expirada."
    });
  }
}

/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "VÉRTEX AI"
  });
});

/* =========================
   FRONTEND
========================= */

app.use(express.static(path.join(__dirname, "public")));

/* =========================
   AUTH
========================= */

app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
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

    const existing = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);

    if (existing) {
      return res.status(409).json({
        error: "Este e-mail já está cadastrado."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = db
      .prepare(`
        INSERT INTO users
        (name, email, password, plan)
        VALUES (?, ?, ?, 'FREE')
      `)
      .run(name, email, hashedPassword);

    const user = db
      .prepare(`
        SELECT id, name, email, plan, created_at
        FROM users
        WHERE id = ?
      `)
      .get(result.lastInsertRowid);

    const token = createToken(user);

    res.json({
      ok: true,
      token,
      user
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    res.status(500).json({
      error: "Não foi possível criar a conta."
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        error: "Informe e-mail e senha."
      });
    }

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

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      created_at: user.created_at
    };

    const token = createToken(safeUser);

    res.json({
      ok: true,
      token,
      user: safeUser
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    res.status(500).json({
      error: "Erro ao entrar."
    });
  }
});

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
    ok: true,
    user
  });
});

/* =========================
   CHATS
========================= */

app.get("/api/chats", auth, (req, res) => {
  const chats = db
    .prepare(`
      SELECT id, title, messages, created_at, updated_at
      FROM chats
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `)
    .all(req.user.id)
    .map(chat => ({
      ...chat,
      messages: JSON.parse(chat.messages || "[]")
    }));

  res.json({
    ok: true,
    chats
  });
});

app.post("/api/chats", auth, (req, res) => {
  const title =
    String(req.body.title || "Nova conversa").trim() ||
    "Nova conversa";

  const result = db
    .prepare(`
      INSERT INTO chats
      (user_id, title, messages)
      VALUES (?, ?, '[]')
    `)
    .run(req.user.id, title);

  const chat = db
    .prepare(`
      SELECT id, title, messages, created_at, updated_at
      FROM chats
      WHERE id = ?
    `)
    .get(result.lastInsertRowid);

  res.json({
    ok: true,
    chat: {
      ...chat,
      messages: []
    }
  });
});

app.get("/api/chats/:id", auth, (req, res) => {
  const chat = db
    .prepare(`
      SELECT id, title, messages, created_at, updated_at
      FROM chats
      WHERE id = ? AND user_id = ?
    `)
    .get(req.params.id, req.user.id);

  if (!chat) {
    return res.status(404).json({
      error: "Conversa não encontrada."
    });
  }

  res.json({
    ok: true,
    chat: {
      ...chat,
      messages: JSON.parse(chat.messages || "[]")
    }
  });
});

app.put("/api/chats/:id", auth, (req, res) => {
  const title = String(req.body.title || "").trim();
  const messages = Array.isArray(req.body.messages)
    ? req.body.messages
    : [];

  const existing = db
    .prepare(`
      SELECT id
      FROM chats
      WHERE id = ? AND user_id = ?
    `)
    .get(req.params.id, req.user.id);

  if (!existing) {
    return res.status(404).json({
      error: "Conversa não encontrada."
    });
  }

  db.prepare(`
    UPDATE chats
    SET title = ?,
        messages = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
  `).run(
    title || "Nova conversa",
    JSON.stringify(messages),
    req.params.id,
    req.user.id
  );

  res.json({
    ok: true
  });
});

app.delete("/api/chats/:id", auth, (req, res) => {
  db.prepare(`
    DELETE FROM chats
    WHERE id = ? AND user_id = ?
  `).run(req.params.id, req.user.id);

  res.json({
    ok: true
  });
});

/* =========================
   AI
========================= */

app.post("/api/ai/generate", auth, async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();
    const history = Array.isArray(req.body.history)
      ? req.body.history
      : [];

    if (!message) {
      return res.status(400).json({
        error: "Digite uma mensagem."
      });
    }

    const apiKey = process.env.AI_API_KEY;
    const apiUrl =
      process.env.AI_API_URL ||
      "https://api.openai.com/v1/responses";

    const model =
      process.env.AI_MODEL ||
      "gpt-5.6-luna";

    /*
      Se não existir chave de API, o sistema continua funcionando
      em modo demonstração.
    */

    if (!apiKey) {
      return res.json({
        ok: true,
        demo: true,
        answer:
          "O VÉRTEX AI está funcionando. Para ativar respostas reais da inteligência artificial, configure uma AI_API_KEY no Railway."
      });
    }

    const input = [
      {
        role: "system",
        content:
          "Você é o VÉRTEX AI, um assistente profissional em português do Brasil. Seu foco é marketing digital, criação de conteúdo, anúncios, copywriting, estratégias de vendas e educação sobre renda extra de forma responsável. Não prometa ganhos garantidos. Seja claro, prático e direto."
      },
      ...history
        .filter(item => item && item.role && item.content)
        .slice(-20)
        .map(item => ({
          role: item.role,
          content: String(item.content)
        })),
      {
        role: "user",
        content: message
      }
    ];

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("AI API ERROR:", data);

      return res.status(502).json({
        error: "A inteligência artificial não respondeu agora."
      });
    }

    let answer = "";

    if (typeof data.output_text === "string") {
      answer = data.output_text;
    }

    if (!answer && Array.isArray(data.output)) {
      for (const item of data.output) {
        if (!Array.isArray(item.content)) continue;

        for (const part of item.content) {
          if (
            part &&
            typeof part.text === "string"
          ) {
            answer += part.text;
          }
        }
      }
    }

    if (!answer) {
      answer = "Não consegui gerar uma resposta agora.";
    }

    res.json({
      ok: true,
      answer
    });
  } catch (error) {
    console.error("AI ERROR:", error);

    res.status(500).json({
      error: "Erro ao processar sua mensagem."
    });
  }
});

/* =========================
   PLANS
========================= */

app.get("/api/plans", (req, res) => {
  res.json({
    ok: true,
    plans: [
      {
        id: "FREE",
        name: "Grátis",
        price: 0,
        description: "Para começar"
      },
      {
        id: "PRO",
        name: "Pro",
        price: 29.9,
        description: "Mais recursos"
      },
      {
        id: "PRO_ANNUAL",
        name: "Pro Anual",
        price: 199.9,
        description: "Plano anual"
      }
    ]
  });
});

/* =========================
   SPA FALLBACK
========================= */

app.get("/{*splat}", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

/* =========================
   START
========================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `VÉRTEX AI rodando na porta ${PORT}`
  );
});

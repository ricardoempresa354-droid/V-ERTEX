const express = require("express");
const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();

const PORT = process.env.PORT || 3000;

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "vertex-secret-change-me";

/* =========================
   BANCO DE DADOS
========================= */

const dbDir =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(__dirname, "data");

fs.mkdirSync(dbDir, {
  recursive: true
});

const dbPath = path.join(
  dbDir,
  "vertex.db"
);

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

/* =========================
   TABELAS
========================= */

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

/* =========================
   MIDDLEWARE
========================= */

app.use(
  express.json({
    limit: "2mb"
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

/* =========================
   FUNÇÕES
========================= */

function cleanText(text) {
  return String(text || "")
    .trim()
    .replace(/\s+/g, " ");
}

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email
    },
    JWT_SECRET,
    {
      expiresIn: "30d"
    }
  );
}

function auth(req, res, next) {
  try {
    const header =
      req.headers.authorization || "";

    if (!header.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Não autorizado."
      });
    }

    const token =
      header.slice(7);

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    req.user = decoded;

    next();

  } catch (error) {
    return res.status(401).json({
      error: "Sessão expirada. Entre novamente."
    });
  }
}

function getUser(id) {
  return db.prepare(`
    SELECT
      id,
      name,
      email,
      plan,
      credits,
      created_at
    FROM users
    WHERE id = ?
  `).get(id);
}

/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "VÉRTEX AI",
    version: "5.1.0"
  });
});

/* =========================
   AUTH
========================= */

app.post(
  "/api/auth/register",
  (req, res) => {

    const name =
      cleanText(req.body.name);

    const email =
      cleanText(
        req.body.email
      ).toLowerCase();

    const password =
      String(
        req.body.password || ""
      );

    if (
      !name ||
      !email ||
      password.length < 6
    ) {
      return res.status(400).json({
        error:
          "Preencha nome, e-mail e uma senha com pelo menos 6 caracteres."
      });
    }

    const exists =
      db.prepare(`
        SELECT id
        FROM users
        WHERE email = ?
      `).get(email);

    if (exists) {
      return res.status(409).json({
        error:
          "Este e-mail já está cadastrado."
      });
    }

    const hash =
      bcrypt.hashSync(
        password,
        10
      );

    try {

      const result =
        db.prepare(`
          INSERT INTO users (
            name,
            email,
            password
          )
          VALUES (?, ?, ?)
        `).run(
          name,
          email,
          hash
        );

      const user =
        getUser(
          result.lastInsertRowid
        );

      return res.json({
        token: createToken(user),
        user
      });

    } catch (error) {

      if (
        String(error.message)
          .includes("UNIQUE")
      ) {
        return res.status(409).json({
          error:
            "Este e-mail já está cadastrado."
        });
      }

      console.error(error);

      return res.status(500).json({
        error:
          "Não foi possível criar a conta."
      });
    }
  }
);

/* =========================
   LOGIN
========================= */

app.post(
  "/api/auth/login",
  (req, res) => {

    const email =
      cleanText(
        req.body.email
      ).toLowerCase();

    const password =
      String(
        req.body.password || ""
      );

    if (!email || !password) {
      return res.status(400).json({
        error:
          "Informe seu e-mail e sua senha."
      });
    }

    const user =
      db.prepare(`
        SELECT *
        FROM users
        WHERE LOWER(email) = LOWER(?)
        LIMIT 1
      `).get(email);

    if (!user) {
      return res.status(401).json({
        error:
          "E-mail ou senha incorretos."
      });
    }

    let passwordOk = false;

    try {

      passwordOk =
        bcrypt.compareSync(
          password,
          user.password
        );

    } catch (error) {

      console.error(
        "Erro ao verificar senha:",
        error
      );

      passwordOk = false;
    }

    if (!passwordOk) {
      return res.status(401).json({
        error:
          "E-mail ou senha incorretos."
      });
    }

    const cleanUser =
      getUser(user.id);

    return res.json({
      token:
        createToken(cleanUser),
      user:
        cleanUser
    });
  }
);

/* =========================
   USUÁRIO
========================= */

app.get(
  "/api/me",
  auth,
  (req, res) => {

    const user =
      getUser(req.user.id);

    if (!user) {
      return res.status(404).json({
        error:
          "Usuário não encontrado."
      });
    }

    res.json({
      user
    });
  }
);

/* =========================
   CHATS
========================= */

app.get(
  "/api/chats",
  auth,
  (req, res) => {

    const chats =
      db.prepare(`
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
      `).all(
        req.user.id
      );

    res.json({
      chats
    });
  }
);

/* =========================
   NOVO CHAT
========================= */

app.post(
  "/api/chats",
  auth,
  (req, res) => {

    const title =
      cleanText(
        req.body.title
      ) ||
      "Nova conversa";

    const result =
      db.prepare(`
        INSERT INTO chats (
          user_id,
          title
        )
        VALUES (?, ?)
      `).run(
        req.user.id,
        title
      );

    const chat =
      db.prepare(`
        SELECT *
        FROM chats
        WHERE id = ?
      `).get(
        result.lastInsertRowid
      );

    res.json({
      chat
    });
  }
);

/* =========================
   CHAT ESPECÍFICO
========================= */

app.get(
  "/api/chats/:id",
  auth,
  (req, res) => {

    const chat =
      db.prepare(`
        SELECT *
        FROM chats
        WHERE id = ?
        AND user_id = ?
      `).get(
        req.params.id,
        req.user.id
      );

    if (!chat) {
      return res.status(404).json({
        error:
          "Conversa não encontrada."
      });
    }

    const messages =
      db.prepare(`
        SELECT
          id,
          role,
          content,
          created_at
        FROM messages
        WHERE chat_id = ?
        ORDER BY id ASC
      `).all(
        chat.id
      );

    res.json({
      chat,
      messages
    });
  }
);

/* =========================
   APAGAR CHAT
========================= */

app.delete(
  "/api/chats/:id",
  auth,
  (req, res) => {

    const chat =
      db.prepare(`
        SELECT id
        FROM chats
        WHERE id = ?
        AND user_id = ?
      `).get(
        req.params.id,
        req.user.id
      );

    if (!chat) {
      return res.status(404).json({
        error:
          "Conversa não encontrada."
      });
    }

    db.prepare(`
      DELETE FROM messages
      WHERE chat_id = ?
    `).run(
      chat.id
    );

    db.prepare(`
      DELETE FROM chats
      WHERE id = ?
    `).run(
      chat.id
    );

    res.json({
      ok: true
    });
  }
);

/* =========================
   HISTÓRICO
========================= */

app.get(
  "/api/history",
  auth,
  (req, res) => {

    const history =
      db.prepare(`
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
      `).all(
        req.user.id
      );

    res.json({
      history
    });
  }
);

/* =========================
   MENSAGENS
========================= */

app.post(
  "/api/chats/:id/messages",
  auth,
  (req, res) => {

    const chat =
      db.prepare(`
        SELECT id
        FROM chats
        WHERE id = ?
        AND user_id = ?
      `).get(
        req.params.id,
        req.user.id
      );

    if (!chat) {
      return res.status(404).json({
        error:
          "Conversa não encontrada."
      });
    }

    const content =
      cleanText(
        req.body.content
      );

    if (!content) {
      return res.status(400).json({
        error:
          "Mensagem vazia."
      });
    }

    db.prepare(`
      INSERT INTO messages (
        chat_id,
        role,
        content
      )
      VALUES (?, 'user', ?)
    `).run(
      chat.id,
      content
    );

    const title =
      content.length > 45
        ? content.slice(0, 45) + "..."
        : content;

    db.prepare(`
      UPDATE chats
      SET
        title = CASE
          WHEN title = 'Nova conversa'
          THEN ?
          ELSE title
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title,
      chat.id
    );

    res.json({
      ok: true
    });
  }
);

/* =========================
   IA
========================= */

async function generateAI(messages) {

  const apiKey =
    process.env.AI_API_KEY;

  if (!apiKey) {

    return {
      text:
        "A VÉRTEX AI está funcionando em modo de demonstração. Configure a variável AI_API_KEY no Railway para ativar a resposta da IA.",
      demo: true
    };
  }

  const apiUrl =
    process.env.AI_API_URL ||
    "https://api.openai.com/v1/responses";

  const model =
    process.env.AI_MODEL ||
    "gpt-5.6-luna";

  const response =
    await fetch(
      apiUrl,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Authorization":
            `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model,
          input: messages
        })
      }
    );

  const raw =
    await response.text();

  let data;

  try {
    data =
      JSON.parse(raw);
  } catch {
    data = null;
  }

  if (!response.ok) {

    console.error(
      "Erro da API de IA:",
      response.status,
      raw
    );

    throw new Error(
      "Erro na API de IA."
    );
  }

  let text = "";

  if (
    data &&
    typeof data.output_text === "string"
  ) {
    text =
      data.output_text;
  }

  if (
    !text &&
    data &&
    Array.isArray(data.output)
  ) {

    for (
      const item of data.output
    ) {

      if (
        !Array.isArray(
          item.content
        )
      ) {
        continue;
      }

      for (
        const part of item.content
      ) {

        if (
          typeof part.text ===
          "string"
        ) {
          text +=
            part.text;
        }
      }
    }
  }

  if (!text) {
    text =
      "A IA respondeu, mas não foi possível interpretar a resposta.";
  }

  return {
    text:
      text.trim(),
    demo: false
  };
}

/* =========================
   GERAR RESPOSTA IA
========================= */

app.post(
  "/api/ai/generate",
  auth,
  async (req, res) => {

    try {

      const chatId =
        Number(
          req.body.chatId
        );

      const prompt =
        cleanText(
          req.body.prompt
        );

      if (
        !chatId ||
        !prompt
      ) {
        return res.status(400).json({
          error:
            "Chat ou mensagem inválida."
        });
      }

      const chat =
        db.prepare(`
          SELECT id
          FROM chats
          WHERE id = ?
          AND user_id = ?
        `).get(
          chatId,
          req.user.id
        );

      if (!chat) {
        return res.status(404).json({
          error:
            "Conversa não encontrada."
        });
      }

      const history =
        db.prepare(`
          SELECT
            role,
            content
          FROM messages
          WHERE chat_id = ?
          ORDER BY id ASC
          LIMIT 30
        `).all(
          chatId
        );

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

      const result =
        await generateAI(
          aiMessages
        );

      db.prepare(`
        INSERT INTO messages (
          chat_id,
          role,
          content
        )
        VALUES (?, 'assistant', ?)
      `).run(
        chatId,
        result.text
      );

      db.prepare(`
        UPDATE chats
        SET updated_at =
          CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        chatId
      );

      res.json({
        ok: true,
        message:
          result.text,
        demo:
          result.demo
      });

    } catch (error) {

      console.error(
        "Erro ao gerar IA:",
        error
      );

      res.status(500).json({
        error:
          "A IA não conseguiu responder agora."
      });
    }
  }
);

/* =========================
   PROJETOS
========================= */

app.get(
  "/api/projects",
  auth,
  (req, res) => {

    const projects =
      db.prepare(`
        SELECT *
        FROM projects
        WHERE user_id = ?
        ORDER BY updated_at DESC
      `).all(
        req.user.id
      );

    res.json({
      projects
    });
  }
);

/* =========================
   NOVO PROJETO
========================= */

app.post(
  "/api/projects",
  auth,
  (req, res) => {

    const title =
      cleanText(
        req.body.title
      );

    const description =
      cleanText(
        req.body.description
      );

    if (!title) {
      return res.status(400).json({
        error:
          "Informe um nome para o projeto."
      });
    }

    const result =
      db.prepare(`
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

    const project =
      db.prepare(`
        SELECT *
        FROM projects
        WHERE id = ?
      `).get(
        result.lastInsertRowid
      );

    res.json({
      project
    });
  }
);

/* =========================
   EDITAR PROJETO
========================= */

app.put(
  "/api/projects/:id",
  auth,
  (req, res) => {

    const project =
      db.prepare(`
        SELECT id
        FROM projects
        WHERE id = ?
        AND user_id = ?
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

    const title =
      cleanText(
        req.body.title
      );

    const description =
      cleanText(
        req.body.description
      );

    const status =
      cleanText(
        req.body.status
      ) ||
      "Em andamento";

    if (!title) {
      return res.status(400).json({
        error:
          "Informe um nome para o projeto."
      });
    }

    db.prepare(`
      UPDATE projects
      SET
        title = ?,
        description = ?,
        status = ?,
        updated_at =
          CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title,
      description,
      status,
      project.id
    );

    const updated =
      db.prepare(`
        SELECT *
        FROM projects
        WHERE id = ?
      `).get(
        project.id
      );

    res.json({
      project: updated
    });
  }
);

/* =========================
   APAGAR PROJETO
========================= */

app.delete(
  "/api/projects/:id",
  auth,
  (req, res) => {

    const result =
      db.prepare(`
        DELETE FROM projects
        WHERE id = ?
        AND user_id = ?
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
  }
);

/* =========================
   PLANOS
========================= */

app.get(
  "/api/plans",
  (req, res) => {

    res.json({
      plans: [

        {
          id: "FREE",
          name: "Grátis",
          price: "R$ 0",
          credits: 15,
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
          name: "Pro Anual",
          price: "R$ 190,00",
          credits: 8000,
          checkout:
            "https://pay.cakto.com.br/qikjmty"
        }

      ]
    });
  }
);

/* =========================
   ARQUIVOS DO SITE
========================= */

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);

/* =========================
   SPA
========================= */

app.get(
  "/{*splat}",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );
  }
);

/* =========================
   SERVIDOR
========================= */

app.listen(
  PORT,
  () => {

    console.log(
      `VÉRTEX AI rodando na porta ${PORT}`
    );

    console.log(
      `Banco de dados: ${dbPath}`
    );
  }
);

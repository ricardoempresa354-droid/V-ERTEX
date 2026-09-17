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
   BANCO
========================= */

const dbDir =
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(__dirname, "data");

fs.mkdirSync(dbDir, {
  recursive: true
});

const db = new Database(
  path.join(dbDir, "vertex.db")
);

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
  credits INTEGER DEFAULT 15,
  bonus_used INTEGER DEFAULT 0,
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
   AJUSTE CONTAS ANTIGAS
========================= */

try {
  db.exec(`
    ALTER TABLE users
    ADD COLUMN bonus_used INTEGER DEFAULT 0
  `);
} catch {}

try {
  db.exec(`
    ALTER TABLE users
    ADD COLUMN credits INTEGER DEFAULT 15
  `);
} catch {}

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

function getUser(id) {
  return db.prepare(`
    SELECT
      id,
      name,
      email,
      plan,
      credits,
      bonus_used,
      created_at
    FROM users
    WHERE id = ?
  `).get(id);
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
      header.substring(7);

    const decoded =
      jwt.verify(
        token,
        JWT_SECRET
      );

    req.user = decoded;

    next();

  } catch {
    return res.status(401).json({
      error:
        "Sessão expirada. Entre novamente."
    });
  }
}

/* =========================
   HEALTH
========================= */

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "VÉRTEX AI",
    version: "6.0.0"
  });
});

/* =========================
   CADASTRO
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
        WHERE LOWER(email) = LOWER(?)
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
            password,
            plan,
            credits,
            bonus_used
          )
          VALUES (?, ?, ?, 'FREE', 15, 0)
        `).run(
          name,
          email,
          hash
        );

      const user =
        getUser(
          result.lastInsertRowid
        );

      res.json({
        token:
          createToken(user),
        user
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
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

    let valid = false;

    try {
      valid =
        bcrypt.compareSync(
          password,
          user.password
        );
    } catch {
      valid = false;
    }

    if (!valid) {
      return res.status(401).json({
        error:
          "E-mail ou senha incorretos."
      });
    }

    const cleanUser =
      getUser(user.id);

    res.json({
      token:
        createToken(cleanUser),
      user:
        cleanUser
    });
  }
);

/* =========================
   ME
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
   ATUALIZAR CONTA
========================= */

app.put(
  "/api/account",
  auth,
  (req, res) => {

    const name =
      cleanText(
        req.body.name
      );

    if (!name) {
      return res.status(400).json({
        error:
          "Informe seu nome."
      });
    }

    db.prepare(`
      UPDATE users
      SET name = ?
      WHERE id = ?
    `).run(
      name,
      req.user.id
    );

    res.json({
      user:
        getUser(req.user.id)
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
   MENSAGEM
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

    db.prepare(`
      UPDATE chats
      SET
        title = CASE
          WHEN title = 'Nova conversa'
          THEN ?
          ELSE title
        END,
        updated_at =
          CURRENT_TIMESTAMP
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
        "A VÉRTEX AI está funcionando, mas a chave da IA ainda não foi configurada no Railway.",
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

  let data = null;

  try {
    data =
      JSON.parse(raw);
  } catch {}

  if (!response.ok) {

    console.error(
      "Erro IA:",
      response.status,
      raw
    );

    throw new Error(
      "A IA não conseguiu responder."
    );
  }

  let text = "";

  if (
    data &&
    typeof data.output_text ===
      "string"
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
      ) continue;

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

  return {
    text:
      text.trim() ||
      "Não consegui interpretar a resposta da IA.",
    demo: false
  };
}

app.post(
  "/api/ai/generate",
  auth,
  async (req, res) => {

    try {

      const prompt =
        cleanText(
          req.body.prompt
        );

      let chatId =
        Number(
          req.body.chatId
        );

      if (!prompt) {
        return res.status(400).json({
          error:
            "Digite uma mensagem."
        });
      }

      /* CRIA CHAT AUTOMATICAMENTE */

      if (!chatId) {

        const created =
          db.prepare(`
            INSERT INTO chats (
              user_id,
              title
            )
            VALUES (?, ?)
          `).run(
            req.user.id,
            prompt.length > 45
              ? prompt.slice(0, 45) + "..."
              : prompt
          );

        chatId =
          Number(
            created.lastInsertRowid
          );
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

      const user =
        getUser(req.user.id);

      /* LIMITAR CRÉDITOS */

      if (
        user.plan === "FREE" &&
        user.credits <= 0
      ) {
        return res.status(402).json({
          error:
            "Seus créditos gratuitos acabaram. Conheça o plano PRO para continuar."
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
        `).all(chatId);

      const aiMessages = [
        {
          role: "user",
          content:
            "Você é a VÉRTEX AI, assistente profissional especializada em marketing digital, vendas online, afiliados, copywriting, anúncios, conteúdo, estratégias digitais e formas legítimas de geração de renda. Responda em português do Brasil, com clareza, praticidade e sem prometer ganhos garantidos."
        },
        ...history,
        {
          role: "user",
          content: prompt
        }
      ];

      /* SALVA MENSAGEM */

      db.prepare(`
        INSERT INTO messages (
          chat_id,
          role,
          content
        )
        VALUES (?, 'user', ?)
      `).run(
        chatId,
        prompt
      );

      const result =
        await generateAI(
          aiMessages
        );

      /* SALVA RESPOSTA */

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

      /* DESCONTA CRÉDITO */

      if (user.plan === "FREE") {

        db.prepare(`
          UPDATE users
          SET credits =
            CASE
              WHEN credits > 0
              THEN credits - 1
              ELSE 0
            END
          WHERE id = ?
        `).run(
          req.user.id
        );
      }

      db.prepare(`
        UPDATE chats
        SET updated_at =
          CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(chatId);

      const updatedUser =
        getUser(req.user.id);

      res.json({
        ok: true,
        chatId,
        response:
          result.text,
        message:
          result.text,
        credits:
          updatedUser.credits,
        user:
          updatedUser,
        demo:
          result.demo
      });

    } catch (error) {

      console.error(
        "Erro IA:",
        error
      );

      res.status(500).json({
        error:
          error.message ||
          "A IA não conseguiu responder agora."
      });
    }
  }
);

/* =========================
   BÔNUS
========================= */

const bonusCreatives = [
  {
    id: 1,
    title: "Criativo para anúncio",
    type: "Anúncio",
    copy:
      "Gancho + texto principal + título + CTA para adaptar ao seu produto."
  },
  {
    id: 2,
    title: "Copy de divulgação",
    type: "Copy",
    copy:
      "Estrutura com problema, solução, benefícios e chamada para ação."
  },
  {
    id: 3,
    title: "Roteiro para Reels",
    type: "Reels",
    copy:
      "Roteiro curto com gancho, desenvolvimento e CTA para redes sociais."
  }
];

app.get(
  "/api/bonuses",
  auth,
  (req, res) => {

    const user =
      getUser(req.user.id);

    const used =
      Number(
        user.bonus_used || 0
      );

    res.json({
      total: 3,
      used,
      remaining:
        Math.max(
          0,
          3 - used
        ),
      items:
        bonusCreatives
    });
  }
);

app.post(
  "/api/bonuses/:id/use",
  auth,
  (req, res) => {

    const id =
      Number(
        req.params.id
      );

    const bonus =
      bonusCreatives.find(
        x => x.id === id
      );

    if (!bonus) {
      return res.status(404).json({
        error:
          "Bônus não encontrado."
      });
    }

    const user =
      getUser(req.user.id);

    const used =
      Number(
        user.bonus_used || 0
      );

    if (used >= 3) {
      return res.status(402).json({
        error:
          "Você já utilizou seus 3 bônus gratuitos. Conheça o PRO para continuar."
      });
    }

    db.prepare(`
      UPDATE users
      SET bonus_used =
        bonus_used + 1
      WHERE id = ?
    `).run(
      req.user.id
    );

    const updatedUser =
      getUser(req.user.id);

    res.json({
      ok: true,
      user:
        updatedUser,
      creative:
        bonus,
      used:
        updatedUser.bonus_used,
      remaining:
        Math.max(
          0,
          3 - updatedUser.bonus_used
        )
    });
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

app.post(
  "/api/projects",
  auth,
  (req, res) => {

    const title =
      cleanText(
        req.body.title ||
        req.body.name
      );

    const description =
      cleanText(
        req.body.description ||
        req.body.content
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
        VALUES (?, ?, ?, 'Ativo')
      `).run(
        req.user.id,
        title,
        description
      );

    res.json({
      project:
        db.prepare(`
          SELECT *
          FROM projects
          WHERE id = ?
        `).get(
          result.lastInsertRowid
        )
    });
  }
);

app.put(
  "/api/projects/:id",
  auth,
  (req, res) => {

    const project =
      db.prepare(`
        SELECT *
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
        req.body.title ||
        req.body.name
      ) ||
      project.title;

    const description =
      cleanText(
        req.body.description ||
        req.body.content
      );

    const status =
      cleanText(
        req.body.status
      ) ||
      project.status;

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

    res.json({
      project:
        db.prepare(`
          SELECT *
          FROM projects
          WHERE id = ?
        `).get(
          project.id
        )
    });
  }
);

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
          bonuses: 3,
          checkout: null
        },
        {
          id: "PRO",
          name: "PRO",
          price: "R$ 39,90",
          credits: 500,
          bonuses: 3,
          checkout:
            "https://pay.cakto.com.br/ubpqtkf_1087308"
        },
        {
          id: "PRO_ANNUAL",
          name: "Pro Anual",
          price: "R$ 190,00",
          credits: 8000,
          bonuses: 3,
          checkout:
            "https://pay.cakto.com.br/qikjmty"
        }
      ]
    });
  }
);

/* =========================
   SITE
========================= */

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);

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
      `Banco: ${path.join(
        dbDir,
        "vertex.db"
      )}`
    );
  }
);

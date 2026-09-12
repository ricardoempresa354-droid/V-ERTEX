import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const dbDir = path.join(__dirname, "data");
fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(path.join(dbDir, "vertex.db"));
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

app.use(cors());
app.use(express.json({limit:"1mb"}));
app.use(express.static(path.join(__dirname,"public")));

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 plan TEXT NOT NULL DEFAULT 'FREE',
 credits INTEGER NOT NULL DEFAULT 100,
 bonus_used INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS projects (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 name TEXT NOT NULL,
 content TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS history (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 prompt TEXT NOT NULL,
 response TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
`);

try {
  db.prepare("ALTER TABLE users ADD COLUMN bonus_used INTEGER NOT NULL DEFAULT 0").run();
} catch {}

const planCredits = {
  FREE:100,
  PRO:1000,
  BUSINESS:5000
};

const caktoProductPlan = {
  [process.env.CAKTO_PRO_PRODUCT_ID || ""]: "PRO",
  [process.env.CAKTO_BUSINESS_PRODUCT_ID || ""]: "BUSINESS"
};

const bonusCreatives = [
  {
    id:1,
    title:"Comece do zero",
    type:"Post",
    copy:"Quer começar a fazer renda extra pela internet? Comece com um passo por vez. Salve este post e descubra por onde começar."
  },
  {
    id:2,
    title:"Dor + solução",
    type:"Anúncio",
    copy:"Cansado de chegar no fim do mês sem dinheiro sobrando? Aprenda uma forma prática de começar sua renda extra no digital."
  },
  {
    id:3,
    title:"Gancho forte",
    type:"Reels",
    copy:"3 coisas que eu faria se estivesse começando do zero hoje para buscar uma renda extra online."
  },
  {
    id:4,
    title:"Prova social",
    type:"Post",
    copy:"Não precisa saber tudo para começar. Você precisa de direção, consistência e um plano simples para executar."
  },
  {
    id:5,
    title:"Lista rápida",
    type:"Carrossel",
    copy:"5 ideias para começar a produzir conteúdo no nicho de renda extra: dicas, erros, tutoriais, ferramentas e bastidores."
  },
  {
    id:6,
    title:"CTA",
    type:"Anúncio",
    copy:"Quer parar de ficar perdido sem saber o que postar ou fazer? Conheça o VÉRTEX AI e tenha uma IA focada em renda extra para te orientar."
  }
];

function sign(user){
  return jwt.sign(
    {id:user.id},
    JWT_SECRET,
    {expiresIn:"7d"}
  );
}

function auth(req,res,next){
  const h=req.headers.authorization||"";

  if(!h.startsWith("Bearer "))
    return res.status(401).json({error:"Não autenticado"});

  try{
    const p=jwt.verify(h.slice(7),JWT_SECRET);

    const user=db.prepare(
      "SELECT id,name,email,plan,credits,bonus_used,created_at FROM users WHERE id=?"
    ).get(p.id);

    if(!user) throw new Error();

    req.user=user;
    next();
  }catch{
    res.status(401).json({
      error:"Sessão inválida ou expirada"
    });
  }
}

function clean(s){
  return String(s||"").trim().slice(0,10000);
}

app.post("/api/auth/register",(req,res)=>{
  const name=clean(req.body.name);
  const email=clean(req.body.email).toLowerCase();
  const password=String(req.body.password||"");

  if(!name||!email||password.length<6)
    return res.status(400).json({
      error:"Nome, e-mail e senha de 6+ caracteres são obrigatórios."
    });

  try{
    const hash=bcrypt.hashSync(password,10);

    const info=db.prepare(
      "INSERT INTO users(name,email,password_hash) VALUES(?,?,?)"
    ).run(name,email,hash);

    const user=db.prepare(
      "SELECT id,name,email,plan,credits,bonus_used,created_at FROM users WHERE id=?"
    ).get(info.lastInsertRowid);

    res.json({
      token:sign(user),
      user
    });
  }catch(e){
    res.status(409).json({
      error:"Este e-mail já está cadastrado."
    });
  }
});

app.post("/api/auth/login",(req,res)=>{
  const email=clean(req.body.email).toLowerCase();
  const password=String(req.body.password||"");

  const row=db.prepare(
    "SELECT * FROM users WHERE email=?"
  ).get(email);

  if(!row||!bcrypt.compareSync(password,row.password_hash))
    return res.status(401).json({
      error:"E-mail ou senha inválidos."
    });

  const user={
    id:row.id,
    name:row.name,
    email:row.email,
    plan:row.plan,
    credits:row.credits,
    created_at:row.created_at
  };

  res.json({
    token:sign(user),
    user
  });
});

app.get("/health",(req,res)=>
  res.json({
    ok:true,
    service:"VÉRTEX AI"
  })
);

app.get("/api/me",auth,(req,res)=>
  res.json({user:req.user})
);

app.get("/api/bonuses",auth,(req,res)=>
  res.json({
    total:6,
    used:req.user.bonus_used||0,
    remaining:Math.max(0,6-(req.user.bonus_used||0)),
    items:bonusCreatives
  })
);

app.post("/api/bonuses/:id/use",auth,(req,res)=>{
  const id=Number(req.params.id);

  if(!bonusCreatives.some(x=>x.id===id))
    return res.status(404).json({
      error:"Bônus não encontrado"
    });

  if((req.user.bonus_used||0)>=6)
    return res.status(402).json({
      error:"Seus 6 criativos bônus já foram utilizados."
    });

  db.prepare(
    "UPDATE users SET bonus_used=bonus_used+1 WHERE id=?"
  ).run(req.user.id);

  const user=db.prepare(
    "SELECT id,name,email,plan,credits,bonus_used,created_at FROM users WHERE id=?"
  ).get(req.user.id);

  res.json({
    user,
    creative:bonusCreatives.find(x=>x.id===id)
  });
});

app.get("/api/projects",auth,(req,res)=>{
  res.json({
    projects:db.prepare(
      "SELECT id,name,content,created_at,updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC"
    ).all(req.user.id)
  });
});

app.post("/api/projects",auth,(req,res)=>{
  const name=clean(req.body.name)||"Novo projeto";

  const info=db.prepare(
    "INSERT INTO projects(user_id,name,content) VALUES(?,?,?)"
  ).run(
    req.user.id,
    name,
    clean(req.body.content)
  );

  res.json({
    id:info.lastInsertRowid
  });
});

app.put("/api/projects/:id",auth,(req,res)=>{
  const id=Number(req.params.id);

  db.prepare(
    "UPDATE projects SET name=?,content=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?"
  ).run(
    clean(req.body.name)||"Projeto",
    clean(req.body.content),
    id,
    req.user.id
  );

  res.json({ok:true});
});

app.delete("/api/projects/:id",auth,(req,res)=>{
  db.prepare(
    "DELETE FROM projects WHERE id=? AND user_id=?"
  ).run(
    Number(req.params.id),
    req.user.id
  );

  res.json({ok:true});
});

app.get("/api/history",auth,(req,res)=>{
  res.json({
    history:db.prepare(
      "SELECT id,prompt,response,created_at FROM history WHERE user_id=? ORDER BY id DESC LIMIT 100"
    ).all(req.user.id)
  });
});

async function generateAI(prompt){

  if(!process.env.AI_API_KEY){
    return "Modo demonstração: configure AI_API_KEY no .env para ativar a IA real.";
  }

  const model=process.env.AI_MODEL || "gpt-5.6-luna";

  const r=await fetch(
    process.env.AI_API_URL || "https://api.openai.com/v1/responses",
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${process.env.AI_API_KEY}`
      },
      body:JSON.stringify({
        model,
        input:[
          {
            role:"system",
            content:[
              {
                type:"input_text",
                text:"Você é o VÉRTEX AI, uma IA especialista no nicho de renda extra e marketing digital para iniciantes, em português do Brasil. Ajude o usuário com suporte, passo a passo, ideias, posts, copies, criativos, anúncios, roteiros e estratégias. Seja prático e direto. Nunca prometa ganhos garantidos, resultados certos ou dinheiro fácil; incentive testes, consistência e uso responsável de publicidade."
              }
            ]
          },
          {
            role:"user",
            content:[
              {
                type:"input_text",
                text:prompt
              }
            ]
          }
        ]
      })
    }
  );

  if(!r.ok)
    throw new Error("Falha no provedor de IA");

  const data=await r.json();

  return data.output_text ||
    data.output?.flatMap(x=>x.content||[])
      .map(x=>x.text||"")
      .join("") ||
    "Não foi possível gerar uma resposta.";
}

app.post("/api/ai/generate",auth,async(req,res)=>{
  const prompt=clean(req.body.prompt);

  if(!prompt)
    return res.status(400).json({
      error:"Digite um comando."
    });

  if(req.user.credits<=0)
    return res.status(402).json({
      error:"Seus créditos acabaram. Faça upgrade do plano."
    });

  try{

    const response=await generateAI(prompt);

    db.prepare(
      "UPDATE users SET credits=credits-1 WHERE id=?"
    ).run(req.user.id);

    db.prepare(
      "INSERT INTO history(user_id,prompt,response) VALUES(?,?,?)"
    ).run(
      req.user.id,
      prompt,
      response
    );

    res.json({
      response,
      credits:req.user.credits-1
    });

  }catch(e){

    res.status(502).json({
      error:"Não foi possível conectar à IA agora."
    });

  }
});

/* =========================
   GERAÇÃO DE IMAGENS
   ========================= */

app.post("/api/ai/image",auth,async(req,res)=>{

  const prompt=clean(req.body.prompt);

  if(!prompt)
    return res.status(400).json({
      error:"Descreva a imagem que deseja criar."
    });

  if(!process.env.HF_TOKEN)
    return res.status(500).json({
      error:"HF_TOKEN não configurado no Railway."
    });

  try{

    const r=await fetch(
      "https://router.huggingface.co/fal-ai/models/black-forest-labs/FLUX.1-schnell",
      {
        method:"POST",

        headers:{
          "Authorization":`Bearer ${process.env.HF_TOKEN}`,
          "Content-Type":"application/json"
        },

        body:JSON.stringify({
          inputs:prompt
        })
      }
    );

    if(!r.ok){

      const text=await r.text();

      console.error(
        "HF_IMAGE_ERROR:",
        text
      );

      return res.status(502).json({
        error:"O provedor de imagens não conseguiu gerar a imagem agora."
      });
    }

    const buffer=Buffer.from(
      await r.arrayBuffer()
    );

    const image_base64=buffer.toString("base64");

    res.json({
      image_url:null,
      image_base64,
      mime_type:"image/png"
    });

  }catch(e){

    console.error(
      "HF_IMAGE_ERROR:",
      e
    );

    res.status(502).json({
      error:e.message||"Não foi possível gerar a imagem agora."
    });
  }
});

app.get("/api/plans",(req,res)=>
  res.json({
    plans:[
      {
        id:"FREE",
        name:"FREE",
        price:"R$ 0",
        credits:100
      },
      {
        id:"PRO_MONTHLY",
        name:"PRO Mensal",
        price:"Assinatura mensal",
        credits:1000,
        plan:"PRO",
        checkout:process.env.CHECKOUT_MONTHLY_URL||""
      },
      {
        id:"PRO_ANNUAL",
        name:"PRO Anual",
        price:"Assinatura anual",
        credits:1000,
        plan:"PRO",
        checkout:process.env.CHECKOUT_ANNUAL_URL||""
      }
    ]
  })
);

app.post("/api/billing/demo",auth,(req,res)=>{

  const plan=String(
    req.body.plan||""
  ).toUpperCase();

  if(!planCredits[plan])
    return res.status(400).json({
      error:"Plano inválido"
    });

  db.prepare(
    "UPDATE users SET plan=?,credits=? WHERE id=?"
  ).run(
    plan,
    planCredits[plan],
    req.user.id
  );

  const user=db.prepare(
    "SELECT id,name,email,plan,credits,bonus_used,created_at FROM users WHERE id=?"
  ).get(req.user.id);

  res.json({user});
});

// Webhook Cakto
function first(...values){
  return values.find(
    v=>v!==undefined &&
    v!==null &&
    String(v).trim()!==""
  );
}

app.post("/api/billing/cakto",(req,res)=>{

  const secret=first(
    req.headers["x-webhook-secret"],
    req.headers["x-cakto-secret"],
    req.body.secret
  );

  if(
    !process.env.PAYMENT_WEBHOOK_SECRET ||
    secret!==process.env.PAYMENT_WEBHOOK_SECRET
  )
    return res.status(401).json({
      error:"Webhook não autorizado"
    });

  const b=req.body||{};

  const event=String(
    first(
      b.event,
      b.event_name,
      b.type,
      b.status,
      b.data?.event,
      b.data?.type
    )||""
  ).toLowerCase();

  const customer=
    b.customer ||
    b.data?.customer ||
    b.client ||
    {};

  const product=
    b.product ||
    b.data?.product ||
    b.offer ||
    b.data?.offer ||
    {};

  const email=String(
    first(
      b.email,
      customer.email,
      b.data?.email,
      b.data?.customer_email
    )||""
  ).trim().toLowerCase();

  const productId=String(
    first(
      b.product_id,
      product.id,
      b.data?.product_id,
      b.data?.product?.id,
      b.offer_id,
      product.product_id
    )||""
  );

  const explicitPlan=String(
    first(
      b.plan,
      b.data?.plan
    )||""
  ).toUpperCase();

  const plan=
    planCredits[explicitPlan] ?
    explicitPlan :
    (caktoProductPlan[productId]||"");

  const user=db.prepare(
    "SELECT id FROM users WHERE email=?"
  ).get(email);

  if(!email)
    return res.status(400).json({
      error:"E-mail do comprador não encontrado"
    });

  if(!user)
    return res.status(404).json({
      error:"Usuário não encontrado. O cliente deve criar a conta no VÉRTEX antes da compra."
    });

  const approved=[
    "purchase_approved",
    "subscription_renewed",
    "paid",
    "approved",
    "active",
    "completed"
  ].includes(event);

  const revoked=[
    "refund",
    "chargeback",
    "subscription_canceled",
    "canceled",
    "cancelled",
    "expired",
    "refunded"
  ].includes(event);

  if(approved){

    if(!plan)
      return res.status(400).json({
        error:"Não foi possível identificar o plano. Configure CAKTO_PRO_PRODUCT_ID/CAKTO_BUSINESS_PRODUCT_ID."
      });

    db.prepare(
      "UPDATE users SET plan=?,credits=? WHERE id=?"
    ).run(
      plan,
      planCredits[plan],
      user.id
    );

  }else if(revoked){

    db.prepare(
      "UPDATE users SET plan='FREE',credits=? WHERE id=?"
    ).run(
      planCredits.FREE,
      user.id
    );
  }

  res.json({
    ok:true,
    event,
    plan:plan||"FREE"
  });
});

// Compatibilidade com a rota antiga
app.post(
  "/api/billing/webhook",
  (req,res)=>
    res.redirect(
      307,
      "/api/billing/cakto"
    )
);

app.put("/api/account",auth,(req,res)=>{

  const name=clean(req.body.name);

  if(!name)
    return res.status(400).json({
      error:"Nome inválido"
    });

  db.prepare(
    "UPDATE users SET name=? WHERE id=?"
  ).run(
    name,
    req.user.id
  );

  const user=db.prepare(
    "SELECT id,name,email,plan,credits,bonus_used,created_at FROM users WHERE id=?"
  ).get(req.user.id);

  res.json({user});
});

app.get(
  "*",
  (req,res)=>
    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    )
);

app.listen(
  PORT,
 app.get("/{*splat}", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

app.listen(PORT, () => {
  console.log(`VÉRTEX AI rodando na porta ${PORT}`);
});

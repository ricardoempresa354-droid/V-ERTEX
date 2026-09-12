const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);

let token=localStorage.getItem("vertex_token"),me=null,plansCache=[],activeProject=null,previousView="dashboard";

const meta={
  dashboard:["Dashboard","Seu ponto de partida para renda extra no digital."],
  workspace:["VÉRTEX IA","Peça para a IA criar, orientar e organizar sua próxima ação."],
  templates:["Ferramentas","Comandos prontos para renda extra."],
  bonuses:["6 criativos bônus","Use seus 6 criativos prontos. Depois, continue pela assinatura."],
  projects:["Meus projetos","Organize campanhas, posts e estratégias."],
  history:["Histórico","Tudo que você já gerou fica aqui."],
  plans:["Assinatura","Escolha seu acesso ao VÉRTEX AI."],
  settings:["Configurações","Gerencie seu perfil e sessão."]
};

async function api(url,opt={}){
  opt.headers={
    ...(opt.headers||{}),
    "Content-Type":"application/json",
    ...(token?{Authorization:"Bearer "+token}:{})
  };

  const r=await fetch(url,opt);
  const d=await r.json().catch(()=>({}));

  if(!r.ok)throw new Error(d.error||"Erro");

  return d;
}

/* =========================
   LOGIN / CADASTRO
========================= */

function authMode(mode){
  $("#loginTab").classList.toggle("on",mode==="login");
  $("#registerTab").classList.toggle("on",mode==="register");

  $("#authForm").innerHTML=mode==="login"
  ?`<form class="form" onsubmit="login(event)">
      <div class="field">
        <label>E-mail</label>
        <input id="email" type="email" required>
      </div>

      <div class="field">
        <label>Senha</label>
        <input id="password" type="password" required>
      </div>

      <button class="btn orange">Entrar</button>
    </form>`
  :`<form class="form" onsubmit="register(event)">
      <div class="field">
        <label>Nome</label>
        <input id="name" required>
      </div>

      <div class="field">
        <label>E-mail</label>
        <input id="email" type="email" required>
      </div>

      <div class="field">
        <label>Senha</label>
        <input id="password" type="password" minlength="6" required>
      </div>

      <button class="btn orange">Criar minha conta</button>
    </form>`;
}

async function login(e){
  e.preventDefault();

  try{
    const d=await api("/api/auth/login",{
      method:"POST",
      body:JSON.stringify({
        email:$("#email").value,
        password:$("#password").value
      })
    });

    token=d.token;

    localStorage.setItem("vertex_token",token);

    start();

  }catch(e){
    $("#authError").textContent=e.message;
  }
}

async function register(e){
  e.preventDefault();

  try{
    const d=await api("/api/auth/register",{
      method:"POST",
      body:JSON.stringify({
        name:$("#name").value,
        email:$("#email").value,
        password:$("#password").value
      })
    });

    token=d.token;

    localStorage.setItem("vertex_token",token);

    start();

  }catch(e){
    $("#authError").textContent=e.message;
  }
}

async function start(){
  try{
    me=(await api("/api/me")).user;

    $("#auth").classList.add("hidden");
    $("#app").classList.remove("hidden");

    $("#userName").textContent=me.name;

    await loadPlans();

    renderAll();

    show("dashboard");

  }catch{
    localStorage.removeItem("vertex_token");

    token=null;

    $("#auth").classList.remove("hidden");
  }
}

async function loadPlans(){
  try{
    plansCache=(await api("/api/plans")).plans;
  }catch{
    plansCache=[];
  }
}

/* =========================
   NAVEGAÇÃO
========================= */

function show(id){
  $$('.view').forEach(x=>x.classList.remove('on'));

  const view=$("#"+id);

  if(!view)return;

  view.classList.add('on');

  $$('.side nav button').forEach(x=>
    x.classList.toggle('on',x.dataset.view===id)
  );

  if(meta[id]){
    $("#title").textContent=meta[id][0];
    $("#sub").textContent=meta[id][1];
  }

  document.body.classList.toggle(
    'chat-mode',
    id==='workspace'
  );

  if(id==='projects')loadProjects();
  if(id==='history')loadHistory();
  if(id==='bonuses')loadBonuses();
}

$$('.side nav button').forEach(b=>{
  b.onclick=()=>show(b.dataset.view);
});

/* =========================
   DASHBOARD
========================= */

function dashboard(){
  return `
  <div class="cards">

    <div class="card">
      <div class="small muted">Créditos da IA</div>
      <div class="metric">${me.credits}</div>
      <div class="green">Plano ${me.plan}</div>
    </div>

    <div class="card">
      <div class="small muted">Bônus usados</div>
      <div class="metric">${me.bonus_used||0}/6</div>
      <div class="purpleText">6 criativos disponíveis</div>
    </div>

    <div class="card">
      <div class="small muted">Especialidade</div>
      <div class="metric">RENDA</div>
      <div class="green">Renda extra online</div>
    </div>

    <div class="card">
      <div class="small muted">IA</div>
      <div class="metric">ON</div>
      <div class="small muted">Suporte focado no nicho</div>
    </div>

  </div>

  <div class="grid">

    <div class="panel">

      <h2>O que você quer fazer?</h2>

      <div class="quick">

        <button onclick="openAI('Estou começando do zero. Monte um passo a passo simples para começar no nicho de renda extra online.')">
          <strong>🚀 Começar do zero</strong>
          <small>Receba orientação passo a passo.</small>
        </button>

        <button onclick="openAI('Crie um criativo completo para anúncio de renda extra, com gancho, texto, título e CTA.')">
          <strong>🎨 Criar criativo</strong>
          <small>Anúncios prontos para adaptar.</small>
        </button>

        <button onclick="openAI('Crie 7 posts para Instagram sobre renda extra online, cada um com legenda e CTA.')">
          <strong>📱 Criar posts</strong>
          <small>Conteúdo para redes sociais.</small>
        </button>

        <button onclick="openAI('Me ajude a montar uma estratégia de divulgação para começar no nicho de renda extra.')">
          <strong>💰 Estratégia</strong>
          <small>Plano de ação para executar.</small>
        </button>

      </div>

    </div>

    <div class="panel">

      <h2>Seu próximo passo</h2>

      <p class="muted">
        Se você é novo, peça:
        <b>“me guia do zero”</b>.
        O VÉRTEX foi feito para responder dentro do nicho de renda extra.
      </p>

      <button class="btn orange" onclick="openAI('Estou começando do zero. Me guie passo a passo no nicho de renda extra.')">
        Falar com a IA
      </button>

    </div>

  </div>`;
}

/* =========================
   CHAT
========================= */

function workspace(){

  const projectTitle=activeProject
    ?`<span class="project-name">• ${esc(activeProject.name)}</span>`
    :'';

  let initialMessage;

  if(activeProject && activeProject.content){

    initialMessage=`
      <div class="msg ai">
        ${activeProject.content}
      </div>
    `;

  }else{

    initialMessage=`
      <div class="msg ai">
        <b>VÉRTEX AI</b><br><br>
        Olá, ${esc(me.name)}.
        Pode me pedir para criar, explicar ou te guiar.
        Meu foco é renda extra no digital.
      </div>
    `;

  }

  return `
  <div class="chat-shell">

    <div class="chat-header">

      <button
        class="back-chat"
        onclick="backFromChat()"
      >
        ←
      </button>

      <div class="chat-brand">

        <h2>
          VÉRTEX AI ${projectTitle}
        </h2>

        <span>
          Especialista em renda extra
        </span>

      </div>

    </div>

    <div class="tools">

      <button
        class="tool"
        onclick="setPrompt('Me guia do zero para começar no nicho de renda extra.')"
      >
        Começar do zero
      </button>

      <button
        class="tool"
        onclick="setPrompt('Crie um criativo para anúncio de renda extra.')"
      >
        Criativo
      </button>

      <button
        class="tool"
        onclick="setPrompt('Crie 5 posts para Instagram sobre renda extra.')"
      >
        Posts
      </button>

      <button
        class="tool"
        onclick="setPrompt('Crie uma copy de anúncio com gancho, benefícios e CTA.')"
      >
        Copy
      </button>

      <button
        class="tool"
        onclick="setPrompt('Monte uma estratégia de conteúdo de 7 dias para renda extra.')"
      >
        Estratégia
      </button>

    </div>

    <div
      class="messages"
      id="messages"
    >

      ${initialMessage}

    </div>

    <div class="composer-wrap">

      <div
        id="plusMenu"
        class="plus-menu"
      >

        <button onclick="showFromPlus('projects')">
          📁 Projetos
        </button>

        <button onclick="showFromPlus('history')">
          🕘 Histórico
        </button>

        <button onclick="showFromPlus('plans')">
          💳 Planos
        </button>

        <button onclick="showFromPlus('settings')">
          ⚙️ Configurações
        </button>

      </div>

      <div class="composer">

        <button
          class="plus-btn"
          onclick="togglePlusMenu()"
        >
          +
        </button>

        <textarea
          id="prompt"
          placeholder="Mensagem para o VÉRTEX..."
          onkeydown="handleChatKey(event)"
        ></textarea>

        <button
          class="btn orange"
          onclick="sendAI()"
        >
          ➤
        </button>

      </div>

    </div>

  </div>`;
}

/* =========================
   FERRAMENTAS
========================= */

function templates(){
  return `
  <div class="panel">

    <h2>Ferramentas para renda extra</h2>

    <div class="quick">

      <button onclick="openAI('Crie 10 ideias de posts para Instagram sobre renda extra online.')">
        <strong>10 ideias de posts</strong>
        <small>Conteúdo para iniciantes.</small>
      </button>

      <button onclick="openAI('Crie um anúncio completo para Facebook Ads sobre renda extra, sem prometer ganhos garantidos.')">
        <strong>Anúncio completo</strong>
        <small>Headline, copy e CTA.</small>
      </button>

      <button onclick="openAI('Crie um roteiro de Reels de 30 segundos sobre como começar uma renda extra.')">
        <strong>Roteiro de Reels</strong>
        <small>Gancho, desenvolvimento e CTA.</small>
      </button>

      <button onclick="openAI('Monte um calendário de conteúdo de 7 dias para o nicho de renda extra.')">
        <strong>Calendário de 7 dias</strong>
        <small>Uma semana de conteúdo.</small>
      </button>

      <button onclick="openAI('Crie uma oferta de serviço digital para alguém que está começando no nicho de renda extra.')">
        <strong>Oferta digital</strong>
        <small>Estruture uma oferta.</small>
      </button>

      <button onclick="openAI('Crie uma sequência de 5 stories para divulgar um conteúdo de renda extra.')">
        <strong>Stories</strong>
        <small>Sequência pronta para adaptar.</small>
      </button>

    </div>

  </div>`;
}

/* =========================
   BÔNUS
========================= */

async function loadBonuses(){

  const d=await api('/api/bonuses');

  $("#bonuses").innerHTML=`

  <div class="panel">

    <div class="row">

      <div>

        <h2>6 criativos bônus</h2>

        <p class="muted small">
          Você recebe exatamente 6 criativos prontos.
          Depois disso, continue criando com a IA através da assinatura.
        </p>

      </div>

      <span class="badge">
        ${d.remaining} restantes
      </span>

    </div>

    <div class="quick">

      ${d.items.map(x=>`

        <div class="card">

          <b>${esc(x.title)}</b>

          <div class="small muted">
            ${esc(x.type)}
          </div>

          <p class="small">
            ${esc(x.copy)}
          </p>

          <button
            class="btn ${d.used>=x.id?'ghost':'orange'}"
            ${d.used>=x.id?'disabled':''}
            onclick="useBonus(${x.id})"
          >
            ${d.used>=x.id?'Usado':'Usar criativo'}
          </button>

        </div>

      `).join('')}

    </div>

  </div>`;
}

async function useBonus(id){

  try{

    const d=await api('/api/bonuses/'+id+'/use',{
      method:'POST'
    });

    me=d.user;

    toast('Criativo bônus liberado');

    loadBonuses();

    renderAll();

  }catch(e){

    toast(e.message);

  }
}

/* =========================
   PROJETOS
========================= */

async function loadProjects(){

  try{

    const d=await api('/api/projects');

    $("#projects").innerHTML=`

    <div class="panel">

      <div class="page-top">

        <button
          class="back-page"
          onclick="show('workspace')"
        >
          ← Voltar ao chat
        </button>

        <div class="row">

          <div>

            <h2>Meus projetos</h2>

            <p class="muted small">
              Organize e continue seus projetos.
            </p>

          </div>

          <button
            class="btn orange"
            onclick="newProject()"
          >
            + Novo projeto
          </button>

        </div>

      </div>

      ${
        d.projects.length
        ?
        d.projects.map(p=>`

          <div class="listitem project-row">

            <div>

              <b>
                ${esc(p.name)}
              </b>

              <br>

              <span class="small muted">
                ${esc(p.content||'Projeto novo').slice(0,140)}
              </span>

            </div>

            <div class="project-actions">

              <button
                class="btn orange"
                onclick="continueProject(${p.id})"
              >
                Continuar
              </button>

              <button
                class="btn ghost"
                onclick="editProject(${p.id})"
              >
                Editar
              </button>

            </div>

          </div>

        `).join('')

        :

        `
        <p class="muted">
          Nenhum projeto ainda.
        </p>
        `
      }

    </div>`;

  }catch(e){

    toast(e.message);

  }
}

async function newProject(){

  const name=prompt(
    'Nome do projeto:',
    'Minha campanha de renda extra'
  );

  if(!name)return;

  try{

    await api('/api/projects',{
      method:'POST',
      body:JSON.stringify({
        name
      })
    });

    toast('Projeto criado');

    loadProjects();

  }catch(e){

    toast(e.message);

  }
}

async function editProject(id){

  try{

    const d=await api('/api/projects');

    const p=d.projects.find(x=>x.id===id);

    if(!p)return;

    const content=prompt(
      'Conteúdo do projeto:',
      p.content||''
    );

    if(content===null)return;

    await api('/api/projects/'+id,{
      method:'PUT',
      body:JSON.stringify({
        name:p.name,
        content
      })
    });

    toast('Projeto salvo');

    loadProjects();

  }catch(e){

    toast(e.message);

  }
}

async function continueProject(id){

  try{

    const d=await api('/api/projects');

    const p=d.projects.find(x=>x.id===id);

    if(!p)return;

    activeProject={
      ...p
    };

    previousView='projects';

    /*
      Recria o HTML do chat para que
      o projeto realmente apareça.
    */

    $("#workspace").innerHTML=workspace();

    show('workspace');

    setTimeout(()=>{

      const m=$("#messages");

      if(m){
        m.scrollTop=m.scrollHeight;
      }

    },50);

  }catch(e){

    toast(e.message);

  }
}

function backFromChat(){

  activeProject=null;

  show(previousView||'dashboard');

}

/* =========================
   HISTÓRICO
========================= */

async function loadHistory(){

  try{

    const d=await api('/api/history');

    $("#history").innerHTML=`

    <div class="panel">

      <button
        class="back-page"
        onclick="show('workspace')"
      >
        ← Voltar ao chat
      </button>

      <h2>Histórico</h2>

      ${
        d.history.length
        ?
        d.history.map(h=>`

          <div class="listitem">

            <b>
              ${esc(h.prompt).slice(0,120)}
            </b>

            <p class="muted small">
              ${esc(h.response).slice(0,250)}
            </p>

          </div>

        `).join('')

        :

        `
        <p class="muted">
          Seu histórico aparecerá aqui.
        </p>
        `
      }

    </div>`;

  }catch(e){

    toast(e.message);

  }
}

/* =========================
   PLANOS
========================= */

function plans(){

  return `

  <div class="page-top">

    <button
      class="back-page"
      onclick="show('workspace')"
    >
      ← Voltar ao chat
    </button>

  </div>

  <div class="plans">

    ${plansCache.map(p=>`

      <div
        class="card price ${p.id==='PRO_ANNUAL'?'featured':''}"
      >

        <h3>
          ${esc(p.name)}
        </h3>

        <strong>
          ${esc(p.price)}
        </strong>

        <p class="muted">
          ${p.credits.toLocaleString('pt-BR')} créditos
        </p>

        ${
          p.id==='FREE'

          ?

          `
          <p class="small muted">
            Acesso inicial para conhecer o VÉRTEX.
          </p>

          <button class="btn ghost">
            Plano atual
          </button>
          `

          :

          `
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
            onclick="checkout('${esc(p.id)}')"
          >
            Assinar ${esc(p.name)}
          </button>
          `
        }

      </div>

    `).join('')}

  </div>

  <div
    class="panel"
    style="margin-top:15px"
  >

    <b>
      Pagamento pela Cakto
    </b>

    <p class="small muted">
      Escolha mensal ou anual. Após o pagamento aprovado,
      a Cakto envia o webhook e o VÉRTEX libera o acesso.
    </p>

  </div>`;
}

function checkout(plan){

  const p=plansCache.find(
    x=>x.id===plan
  );

  if(!p||!p.checkout){

    toast(
      'O checkout da Cakto ainda não foi configurado.'
    );

    return;
  }

  let u=p.checkout;

  const sep=u.includes('?')
    ?'&'
    :'?';

  u+=sep+
    'name='+encodeURIComponent(me.name)+
    '&email='+encodeURIComponent(me.email);

  window.open(
    u,
    '_blank',
    'noopener'
  );
}

/* =========================
   CONFIGURAÇÕES
========================= */

function settings(){

  return `

  <div class="panel">

    <button
      class="back-page"
      onclick="show('workspace')"
    >
      ← Voltar ao chat
    </button>

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

  </div>`;
}

async function saveAccount(){

  try{

    const d=await api('/api/account',{
      method:'PUT',
      body:JSON.stringify({
        name:$('#accountName').value
      })
    });

    me=d.user;

    $('#userName').textContent=me.name;

    toast('Conta atualizada');

  }catch(e){

    toast(e.message);

  }
}

/* =========================
   RENDER
========================= */

function renderAll(){

  $('#dashboard').innerHTML=dashboard();

  $('#workspace').innerHTML=workspace();

  $('#templates').innerHTML=templates();

  $('#bonuses').innerHTML='';

  $('#projects').innerHTML='';

  $('#history').innerHTML='';

  $('#plans').innerHTML=plans();

  $('#settings').innerHTML=settings();
}

/* =========================
   ABRIR IA
========================= */

function openAI(t){

  activeProject=null;

  previousView='dashboard';

  $("#workspace").innerHTML=workspace();

  show('workspace');

  setTimeout(()=>{
    setPrompt(t);
  },50);
}

function setPrompt(t){

  const p=$('#prompt');

  if(!p)return;

  p.value=t;

  p.focus();
}

/* =========================
   MENU +
========================= */

function togglePlusMenu(){

  const menu=$("#plusMenu");

  if(menu){
    menu.classList.toggle("open");
  }
}

function showFromPlus(id){

  const menu=$("#plusMenu");

  if(menu){
    menu.classList.remove("open");
  }

  previousView='workspace';

  show(id);
}

function handleChatKey(e){

  if(
    e.key==="Enter" &&
    !e.shiftKey
  ){

    e.preventDefault();

    sendAI();

  }
}

/* =========================
   ENVIAR PARA IA
========================= */

async function sendAI(){

  const p=$('#prompt');

  if(!p)return;

  const t=p.value.trim();

  if(!t)return;

  const m=$('#messages');

  if(!m)return;

  /*
    Mensagem do usuário
  */

  m.insertAdjacentHTML(
    'beforeend',
    `<div class="msg me">${esc(t)}</div>`
  );

  p.value='';

  /*
    Mensagem de carregamento
  */

  m.insertAdjacentHTML(
    'beforeend',
    `<div class="msg ai">Gerando...</div>`
  );

  const loading=m.lastElementChild;

  m.scrollTop=m.scrollHeight;

  try{

    const d=await api(
      '/api/ai/generate',
      {
        method:'POST',

        body:JSON.stringify({
          prompt:t
        })
      }
    );

    loading.innerHTML=
      '<b>VÉRTEX AI</b><br><br>'+
      esc(d.response).replace(
        /\n/g,
        '<br>'
      );

    me.credits=d.credits;

    /*
      Se estiver dentro de um projeto,
      salva a conversa automaticamente.
    */

    if(activeProject){

      activeProject.content=m.innerHTML;

      await api(
        '/api/projects/'+activeProject.id,
        {
          method:'PUT',

          body:JSON.stringify({
            name:activeProject.name,
            content:activeProject.content
          })
        }
      );

    }

  }catch(e){

    loading.innerHTML=
      '<span class="error">'+
      esc(e.message)+
      '</span>';

  }

  m.scrollTop=m.scrollHeight;
}

/* =========================
   GERAR IMAGEM
========================= */

async function generateImage(){

  const t=window.prompt(
    '🖼️ O que você quer criar na imagem?'
  );

  if(!t||!t.trim())return;

  const m=$('#messages');

  if(!m)return;

  m.insertAdjacentHTML(
    'beforeend',
    `<div class="msg me">
      🖼️ ${esc(t)}
    </div>`
  );

  m.insertAdjacentHTML(
    'beforeend',
    `<div class="msg ai">
      🖼️ Criando imagem...
    </div>`
  );

  const loading=m.lastElementChild;

  m.scrollTop=m.scrollHeight;

  try{

    const d=await api(
      '/api/ai/image',
      {
        method:'POST',

        body:JSON.stringify({
          prompt:t.trim()
        })
      }
    );

    if(d.image_url){

      loading.innerHTML=
        `<b>VÉRTEX AI</b><br><br>

        <img
          src="${esc(d.image_url)}"
          alt="Imagem gerada pelo VÉRTEX AI"
          style="
            max-width:100%;
            border-radius:12px;
            display:block
          "
        >`;

    }else if(d.image_base64){

      loading.innerHTML=
        `<b>VÉRTEX AI</b><br><br>

        <img
          src="data:image/png;base64,${d.image_base64}"
          alt="Imagem gerada pelo VÉRTEX AI"
          style="
            max-width:100%;
            border-radius:12px;
            display:block
          "
        >`;

    }else{

      loading.innerHTML=
        '<span class="error">'+
        'A imagem não foi gerada.'+
        '</span>';

    }

  }catch(e){

    loading.innerHTML=
      `<span class="error">
        ${esc(e.message)}
      </span>`;

  }

  m.scrollTop=m.scrollHeight;
}

/* =========================
   LOGOUT
========================= */

function logout(){

  localStorage.removeItem(
    'vertex_token'
  );

  location.reload();
}

/* =========================
   TOAST
========================= */

function toast(t){

  const x=document.createElement('div');

  x.className='toast';

  x.textContent=t;

  document.body.appendChild(x);

  setTimeout(()=>{
    x.remove();
  },2500);
}

/* =========================
   ESCAPAR HTML
========================= */

function esc(s){

  return String(s??'').replace(
    /[&<>"']/g,

    c=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#039;'
    }[c])
  );
}

/* =========================
   INICIALIZAÇÃO
========================= */

authMode('login');

if(token){
  start();
}

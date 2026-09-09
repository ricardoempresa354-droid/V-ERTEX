# VÉRTEX AI — SaaS 2.0

Esta versão transforma a interface de referência em uma aplicação SaaS com backend.

## Já implementado
- Cadastro e login
- Sessão com JWT
- Banco SQLite
- Créditos por usuário
- Planos FREE / PRO / BUSINESS
- Workspace de IA
- Histórico persistente
- Projetos persistentes
- Templates
- Área de conta
- Endpoint de IA compatível com APIs que usam formato `chat/completions`
- Interface preta + roxo/neon + laranja inspirada na referência enviada

## Rodar localmente

1. Instale Node.js 18+.
2. Entre na pasta do projeto.
3. Execute `npm install`.
4. Copie `.env.example` para `.env`.
5. Para testar sem IA real, deixe as variáveis AI vazias: o sistema usa uma resposta de demonstração.
6. Execute `npm start`.
7. Abra `http://localhost:3000`.

## IA real

Configure no `.env`:
- `AI_API_URL`
- `AI_API_KEY`
- `AI_MODEL`

O servidor faz a chamada à API no backend, sem expor a chave no navegador.

## Pagamentos

A rota `/api/billing/demo` existe apenas para testar troca de plano. Para produção, ela deve ser substituída por um checkout/webhook do provedor escolhido, validando o pagamento no servidor antes de liberar créditos.

## Produção

Antes de publicar:
- troque `JWT_SECRET`;
- use HTTPS;
- configure CORS para o domínio real;
- configure backup do banco;
- implemente rate limit;
- implemente webhook de pagamento;
- configure limites e renovação mensal de créditos;
- registre logs e erros;
- configure uma política de privacidade e termos de uso.


## Pagamento automático — preparado

Foi adicionado `POST /api/billing/webhook`.

O provedor de pagamento deve enviar um evento com:
- `email`
- `plan` (`PRO` ou `BUSINESS`)
- `status` (`paid`, `approved`, `active`, `completed`, etc.)

E o cabeçalho:
`x-webhook-secret: SEU_SEGREDO`

Quando aprovado, o sistema troca automaticamente o plano e repõe os créditos. Cancelamentos/reembolsos voltam para FREE.

**Não use o endpoint de demonstração em produção.** O webhook deve ser ligado ao evento oficial de pagamento do provedor e validado conforme a documentação dele.

Também foi adicionada a atualização do nome da conta.


## IA real
A integração padrão foi preparada para a Responses API da OpenAI. O projeto usa `gpt-5.6-luna` como padrão de custo mais baixo; você pode alterar `AI_MODEL` no `.env`. A chave fica somente no backend. Consulte a documentação oficial antes de publicar. 

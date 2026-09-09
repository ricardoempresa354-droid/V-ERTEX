# VÉRTEX AI — produção

## Cakto
O endpoint de integração é:
`POST /api/billing/cakto`

Na Cakto, crie um webhook para o produto do VÉRTEX e selecione pelo menos:
- `purchase_approved`
- `subscription_renewed`
- `subscription_canceled`
- `refund`
- `chargeback`

Defina uma chave secreta igual a `PAYMENT_WEBHOOK_SECRET` e informe os IDs dos produtos/planos em `CAKTO_PRO_PRODUCT_ID` e `CAKTO_BUSINESS_PRODUCT_ID`.

O sistema identifica o comprador pelo e-mail e libera/bloqueia o plano conforme o evento. Para segurança, mantenha a chave somente no servidor.

## Checkout
Preencha `CHECKOUT_PRO_URL` e `CHECKOUT_BUSINESS_URL` no `.env`. Os botões do VÉRTEX abrem esses links e passam nome/e-mail para pré-preencher o checkout quando o link aceitar esses parâmetros.

## IA
Preencha `AI_API_KEY`. O backend mantém a chave fora do navegador.

## Bônus
Cada conta possui 6 criativos bônus. Depois dos 6, o usuário continua usando a IA conforme o plano.

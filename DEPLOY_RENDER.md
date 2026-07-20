# Hospedar no GitHub e Render

Antes de subir para o GitHub, resete o token do bot no Discord Developer Portal se ele apareceu em algum print.

## 1. Conferir arquivos secretos

O arquivo `.env` nao pode ir para o GitHub. Ele ja esta no `.gitignore`.

O arquivo `.env.example` pode ir para o GitHub porque tem apenas exemplos.

## 2. Subir para o GitHub

Na pasta do projeto:

```powershell
git init
git add .
git status
git commit -m "bot baile da selva"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/baile-da-selva-bot.git
git push -u origin main
```

Troque `SEU_USUARIO` pelo seu usuario do GitHub.

Se o Git pedir login, entre com sua conta do GitHub.

## 3. Criar no Render

1. Entre em `https://dashboard.render.com`.
2. Clique em `New`.
3. Clique em `Web Service`.
4. Conecte sua conta do GitHub.
5. Escolha o repositorio `baile-da-selva-bot`.
6. Configure:

```txt
Name: baile-da-selva-bot
Runtime: Node
Build Command: npm install
Start Command: npm start
Health Check Path: /healthz
```

## 4. Variaveis de ambiente no Render

Em `Environment`, coloque:

```env
DISCORD_TOKEN=token_novo_do_bot
CLIENT_ID=id_da_aplicacao
GUILD_ID=id_do_servidor
DASHBOARD_PASSWORD=sua_senha_do_painel
SESSION_SECRET=um_texto_grande_aleatorio
NODE_ENV=production
```

Nao coloque `DASHBOARD_HOST` nem `DASHBOARD_PORT` no Render. Ele usa a variavel `PORT` automaticamente.

## 5. Plano gratis ou pago

No plano gratis, o Render pode desligar o servico apos 15 minutos sem acesso ao site. Para bot Discord ficar online 24 horas, o ideal e usar um plano pago.

O painel salva configuracoes em arquivos dentro de `data/`. No Render gratis, arquivos locais podem sumir quando o servico reinicia ou redeploya. Para salvar dados de verdade em producao, use um plano pago com disco persistente ou migre para banco de dados.

# Baile da Selva Bot

Bot profissional para Discord com painel web local. Ele inclui:

- Painel no navegador com login por senha.
- Sistema de tickets com canal privado, assumir, fechar, transcript e logs.
- Formularios com modal do Discord e aprovacao/reprovacao pela equipe.
- Loja com produtos configuraveis, pedidos privados, pagamento manual, entrega e cargo opcional.
- Boas-vindas com mensagem e cargo automatico.
- Registro de eventos no painel.
- Comandos slash para enviar paineis pelo Discord.
- 142 comandos por prefixo com carregamento automatico por categoria.
- Economia, XP, moderacao, seguranca, logs, AFK, lembretes e musica com DisTube.
- Banco JSON por padrao e SQLite opcional.

## 1. Abrir no VS Code

Abra a pasta:

```txt
outputs/BaileDaSelvaBot
```

No terminal do VS Code, rode:

```bash
npm install
```

## 2. Configurar o .env

Copie `.env.example` e renomeie a copia para `.env`.

Preencha:

```env
DISCORD_TOKEN=token_do_seu_bot
CLIENT_ID=id_da_sua_aplicacao
GUILD_ID=id_do_seu_servidor
DASHBOARD_PASSWORD=uma_senha_forte_para_o_painel
SESSION_SECRET=um_texto_grande_aleatorio
DATABASE_DRIVER=json
OWNER_IDS=
```

Nunca envie o token do bot para ninguem e nunca publique o arquivo `.env`.

## 3. Ativar intents no Discord Developer Portal

Na pagina do seu bot, ative:

- Server Members Intent
- Message Content Intent

O bot usa isso para boas-vindas, cargos automaticos e transcript dos tickets.

O bot tambem usa o intent de voz comum para musica. Ele ja e solicitado pelo codigo e nao aparece na area de intents privilegiados.

## 4. Convidar o bot

No Discord Developer Portal, va em OAuth2 > URL Generator:

Scopes:

- `bot`
- `applications.commands`

Permissoes recomendadas:

- Manage Channels
- Manage Roles
- View Channels
- Send Messages
- Manage Messages
- Embed Links
- Attach Files
- Read Message History

Se voce estiver testando e quiser facilitar, pode usar Administrator, mas para servidor grande e melhor usar permissoes especificas.

## 5. Rodar

Modo desenvolvimento:

```bash
npm run dev
```

Modo normal:

```bash
npm start
```

No PowerShell do Windows, se `npm` for bloqueado, use `npm.cmd`:

```powershell
npm.cmd install
npm.cmd run dev
```

Se voce so quer deixar o bot ligado sem ficar reiniciando quando algum arquivo muda, use:

```powershell
npm.cmd start
```

Abra no navegador:

```txt
http://127.0.0.1:3000
```

Se aparecer `EADDRINUSE`, a porta 3000 ja esta sendo usada. Normalmente e outro terminal do bot aberto. Feche o terminal antigo com `Ctrl+C` ou rode em outra porta:

```powershell
$env:DASHBOARD_PORT=3001; npm.cmd start
```

Depois abra:

```txt
http://127.0.0.1:3001
```

Entre com a senha do `DASHBOARD_PASSWORD`.

## 6. Como pegar IDs

No Discord:

1. Configuracoes de usuario.
2. Avancado.
3. Ative Modo Desenvolvedor.
4. Clique com botao direito em servidor, canal, categoria ou cargo.
5. Clique em Copiar ID.

Cole esses IDs no painel.

## 7. Ordem recomendada

1. Preencha `.env`.
2. Rode `npm install`.
3. Rode `npm run dev`.
4. Entre no painel.
5. Configure Geral.
6. Configure Tickets, Formularios, Loja e Boas-vindas.
7. Clique em Registrar comandos.
8. Envie os paineis pelos botoes do painel ou pelos comandos slash.

## 8. Comandos do bot

- `/status`
- `/painel-ticket`
- `/painel-formulario`
- `/painel-loja`

Os 142 comandos por prefixo estao em `COMMANDS.md`. Para ativa-los, entre no painel, abra **Bot > Comandos** e ligue **Ativar esta funcao** e **Comandos por prefixo**. Depois use a tela **Comandos por prefixo** para ativar cada comando e configurar cooldown, cargos e canais. O prefixo padrao e `!`.

## 9. Dados salvos

Os dados ficam na pasta `data/`:

- `config.json`
- `tickets.json`
- `orders.json`
- `submissions.json`
- `events.json`
- `economy.json`
- `xp.json`
- `warns.json`
- `afk.json`
- `snipes.json` e `editsnipes.json`
- `reminders.json`
- `blacklist.json` e `whitelist.json`

Para usar SQLite, configure `DATABASE_DRIVER=sqlite`. O arquivo sera `data/baile-da-selva.sqlite`. O projeto usa Node.js 22.23.1.

Essa pasta e local. Para hospedar em VPS, faca backup dela.

## 10. Observacoes importantes

- A loja abre pedidos e permite marcar como pago/entregue, mas nao processa pagamento automatico.
- Para entregar cargos, o cargo do bot precisa estar acima do cargo que ele vai entregar.
- Para transcripts com texto das mensagens, o Message Content Intent precisa estar ativo.
- Se colocar o painel online, use senha forte, `SESSION_SECRET` forte e HTTPS.
- Musica exige Node.js 22.23.1, FFmpeg e as dependencias instaladas por `npm ci` no Render.

## 11. GitHub e Render

Para hospedar online, siga o arquivo `DEPLOY_RENDER.md`.

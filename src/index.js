require("dotenv").config();

const path = require("node:path");
const { DiscordBot } = require("./bot/client");
const { defaultConfig } = require("./config/defaultConfig");
const { createDatabase } = require("./storage/createDatabase");
const { createWebApp } = require("./web/app");

async function bootstrapConfig(db) {
  const patch = {};
  if (process.env.CLIENT_ID) {
    patch.clientId = process.env.CLIENT_ID;
  }
  if (process.env.GUILD_ID) {
    patch.guildId = process.env.GUILD_ID;
  }
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === "troque-esse-segredo-grande") {
    console.warn("[WEB] Configure SESSION_SECRET no .env antes de hospedar.");
  }
  if (Object.keys(patch).length) {
    await db.setConfig(patch);
  }
}

async function main() {
  const dataDir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.resolve(__dirname, "..", "data");
  const db = createDatabase(dataDir);
  await db.init();
  await bootstrapConfig(db);

  const bot = new DiscordBot(db);
  const app = createWebApp({ db, bot });
  const port = Number(process.env.PORT || process.env.DASHBOARD_PORT || 3000);
  const host = process.env.HOST || process.env.DASHBOARD_HOST || (process.env.RENDER ? "0.0.0.0" : "127.0.0.1");

  await bot.start().catch(async (error) => {
    bot.lastError = error.message;
    await db.addEvent("bot_login_error", { message: error.message });
    console.error("[BOT] Falha ao conectar:", error.message);
  });

  const server = app.listen(port, host, () => {
    console.log(`[WEB] Painel aberto em http://${host}:${port}`);
  });

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`[WEB] A porta ${port} ja esta em uso.`);
      console.error("[WEB] Feche o outro terminal do bot com Ctrl+C ou use outra porta:");
      console.error("[WEB] PowerShell: $env:DASHBOARD_PORT=3001; npm.cmd start");
      process.exit(1);
    }

    throw error;
  });
}

main().catch((error) => {
  console.error("[APP] Falha fatal:", error);
  process.exit(1);
});

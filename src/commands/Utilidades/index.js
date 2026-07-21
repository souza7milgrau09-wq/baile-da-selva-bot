const { PermissionFlagsBits } = require("discord.js");
const { defineCommand } = require("../../bot/prefix/command");
const { parseDuration, snowflake } = require("../../bot/prefix/utils");

function calculate(expression) {
  const source = String(expression || "").replaceAll(",", ".");
  if (!source || source.length > 120 || !/^[0-9+\-*/().%\s]+$/.test(source)) throw new Error("Expressao invalida");
  const result = Function(`"use strict"; return (${source});`)();
  if (!Number.isFinite(result)) throw new Error("Resultado invalido");
  return result;
}

function scheduleReminder(ctx, reminder) {
  const delay = new Date(reminder.dueAt).getTime() - Date.now();
  if (delay <= 0 || delay > 2147483647) return;
  setTimeout(async () => {
    const channel = await ctx.client.channels.fetch(reminder.channelId).catch(() => null);
    if (channel && channel.isTextBased()) {
      await channel.send({ content: `<@${reminder.userId}> lembrete: ${reminder.text}`, allowedMentions: { users: [reminder.userId] } }).catch(() => undefined);
    }
    await ctx.db.update("reminders", async (items) => items.map((item) => item.id === reminder.id ? { ...item, sentAt: new Date().toISOString() } : item));
  }, delay);
}

const commands = [
  defineCommand({
    name: "poll", aliases: ["enquete"], description: "Cria uma enquete simples no canal.", category: "Utilidades", usage: "pergunta", cooldown: 10,
    async execute(ctx) {
      if (!ctx.rawArgs) return ctx.usage();
      const message = await ctx.channel.send({ embeds: [ctx.embed("Enquete", ctx.rawArgs).addFields({ name: "Criada por", value: `${ctx.author}`, inline: true })] });
      await message.react("✅");
      await message.react("❌");
    }
  }),
  defineCommand({
    name: "timer", aliases: ["cronometro"], description: "Inicia um temporizador no canal.", category: "Utilidades", usage: "10m [mensagem]", cooldown: 5,
    async execute(ctx) {
      const duration = parseDuration(ctx.args[0]);
      if (!duration || duration > 30 * 86400000) return ctx.usage("Use `s`, `m`, `h` ou `d`, com maximo de 30 dias.");
      const text = ctx.args.slice(1).join(" ") || "Seu temporizador terminou.";
      const reminder = { id: `timer-${Date.now().toString(36)}`, guildId: ctx.guild.id, channelId: ctx.channel.id, userId: ctx.author.id, text, dueAt: new Date(Date.now() + duration).toISOString(), createdAt: new Date().toISOString() };
      await ctx.db.update("reminders", async (items) => [reminder, ...items]);
      scheduleReminder(ctx, reminder);
      await ctx.success(`Temporizador definido para <t:${Math.floor(new Date(reminder.dueAt).getTime() / 1000)}:R>.`, "Temporizador iniciado");
    }
  }),
  defineCommand({
    name: "calc", aliases: ["calcular", "calculadora"], description: "Calcula uma expressao matematica.", category: "Utilidades", usage: "2 * (10 + 5)",
    async execute(ctx) {
      try {
        const result = calculate(ctx.rawArgs);
        await ctx.info("Calculadora", `\`${ctx.rawArgs}\` = **${result.toLocaleString("pt-BR", { maximumFractionDigits: 10 })}**`);
      } catch {
        await ctx.error("Use somente numeros, parenteses e os operadores `+ - * / %`.");
      }
    }
  }),
  defineCommand({
    name: "weather", aliases: ["clima", "tempo"], description: "Consulta o clima atual de uma cidade.", category: "Utilidades", usage: "cidade", cooldown: 10,
    async execute(ctx) {
      if (!ctx.rawArgs) return ctx.usage();
      const data = await fetch(`https://wttr.in/${encodeURIComponent(ctx.rawArgs)}?format=j1`).then((response) => response.ok ? response.json() : null).catch(() => null);
      const current = data && data.current_condition && data.current_condition[0];
      if (!current) return ctx.error("Nao consegui consultar essa cidade agora.");
      await ctx.info(`Clima em ${ctx.rawArgs}`, current.weatherDesc && current.weatherDesc[0] ? current.weatherDesc[0].value : "Condicao atual", [
        { name: "Temperatura", value: `${current.temp_C} C`, inline: true },
        { name: "Sensacao", value: `${current.FeelsLikeC} C`, inline: true },
        { name: "Umidade", value: `${current.humidity}%`, inline: true },
        { name: "Vento", value: `${current.windspeedKmph} km/h`, inline: true }
      ]);
    }
  }),
  defineCommand({
    name: "translate", aliases: ["traduzir"], description: "Traduz um texto entre dois idiomas.", category: "Utilidades", usage: "pt>en texto", cooldown: 8,
    async execute(ctx) {
      const pair = String(ctx.args.shift() || "").toLowerCase();
      const match = pair.match(/^([a-z]{2})>([a-z]{2})$/);
      const text = ctx.args.join(" ");
      if (!match || !text) return ctx.usage("Exemplo: `pt>en ola mundo`.");
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${match[1]}|${match[2]}`;
      const data = await fetch(url).then((response) => response.ok ? response.json() : null).catch(() => null);
      const translated = data && data.responseData && data.responseData.translatedText;
      if (!translated) return ctx.error("O servico de traducao nao respondeu agora.");
      await ctx.info(`Traducao ${match[1]} > ${match[2]}`, `**Original:** ${text}\n**Traducao:** ${translated}`);
    }
  }),
  defineCommand({
    name: "shorturl", aliases: ["encurtar"], description: "Encurta um link valido.", category: "Utilidades", usage: "https://site.com/link", cooldown: 10,
    async execute(ctx) {
      let url;
      try { url = new URL(ctx.args[0]); } catch { return ctx.usage(); }
      if (!["http:", "https:"].includes(url.protocol)) return ctx.usage();
      const shortened = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url.href)}`).then((response) => response.ok ? response.text() : "").catch(() => "");
      if (!shortened.startsWith("http")) return ctx.error("Nao consegui encurtar esse link agora.");
      await ctx.info("Link encurtado", shortened);
    }
  }),
  defineCommand({
    name: "color", aliases: ["cor"], description: "Mostra uma cor hexadecimal.", category: "Utilidades", usage: "#24c46b",
    async execute(ctx) {
      const color = String(ctx.args[0] || "");
      if (!/^#[0-9a-f]{6}$/i.test(color)) return ctx.usage();
      const decimal = parseInt(color.slice(1), 16);
      await ctx.reply({ embeds: [ctx.embed(`Cor ${color.toUpperCase()}`, `Decimal: **${decimal}**\nRGB: **${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}**`, color)] });
    }
  }),
  defineCommand({
    name: "qr", aliases: ["qrcode"], description: "Gera um QR Code para um texto ou link.", category: "Utilidades", usage: "texto", cooldown: 5,
    async execute(ctx) {
      if (!ctx.rawArgs) return ctx.usage();
      const url = `https://quickchart.io/qr?size=500&text=${encodeURIComponent(ctx.rawArgs)}`;
      await ctx.reply({ embeds: [ctx.embed("QR Code", "Leia o codigo com a camera do celular.").setImage(url)] });
    }
  }),
  defineCommand({
    name: "remind", aliases: ["lembrar", "lembrete"], description: "Agenda um lembrete pessoal.", category: "Utilidades", usage: "10m mensagem", cooldown: 5,
    async execute(ctx) {
      const duration = parseDuration(ctx.args[0]);
      const text = ctx.args.slice(1).join(" ");
      if (!duration || !text || duration > 30 * 86400000) return ctx.usage();
      const reminder = { id: `remind-${Date.now().toString(36)}`, guildId: ctx.guild.id, channelId: ctx.channel.id, userId: ctx.author.id, text: text.slice(0, 1000), dueAt: new Date(Date.now() + duration).toISOString(), createdAt: new Date().toISOString() };
      await ctx.db.update("reminders", async (items) => [reminder, ...items]);
      scheduleReminder(ctx, reminder);
      await ctx.success(`Vou lembrar voce <t:${Math.floor(new Date(reminder.dueAt).getTime() / 1000)}:R>.`, "Lembrete agendado");
    }
  }),
  defineCommand({
    name: "userinfoid", aliases: ["buscarusuario"], description: "Busca um usuario diretamente pelo ID.", category: "Utilidades", usage: "ID",
    async execute(ctx) {
      const id = snowflake(ctx.args[0]);
      const user = id ? await ctx.client.users.fetch(id, { force: true }).catch(() => null) : null;
      if (!user) return ctx.error("Usuario nao encontrado.");
      await ctx.reply({ embeds: [ctx.embed(`Usuario: ${user.username}`, `ID: \`${user.id}\`\nBot: **${user.bot ? "Sim" : "Nao"}**\nConta criada: <t:${Math.floor(user.createdTimestamp / 1000)}:F>`).setThumbnail(user.displayAvatarURL({ size: 512 }))] });
    }
  }),
  defineCommand({
    name: "rolelist", aliases: ["cargos"], description: "Lista os cargos do servidor.", category: "Utilidades",
    async execute(ctx) {
      const roles = ctx.guild.roles.cache.filter((role) => role.id !== ctx.guild.id).sort((a, b) => b.position - a.position);
      await ctx.info(`Cargos de ${ctx.guild.name}`, roles.first(50).map((role) => `${role} - ${role.members.size} membro(s)`).join("\n") || "Nenhum cargo.");
    }
  }),
  defineCommand({
    name: "channelinfo", aliases: ["canalinfo"], description: "Mostra informacoes de um canal.", category: "Utilidades", usage: "[#canal]",
    async execute(ctx) {
      const channel = await ctx.getChannel() || ctx.channel;
      await ctx.info(`Canal: ${channel.name}`, `ID: \`${channel.id}\``, [
        { name: "Tipo", value: String(channel.type), inline: true },
        { name: "Categoria", value: channel.parent ? channel.parent.name : "Nenhuma", inline: true },
        { name: "Criado", value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:F>`, inline: false },
        { name: "Topico", value: channel.topic || "Nenhum", inline: false }
      ]);
    }
  })
];

module.exports = { commands };

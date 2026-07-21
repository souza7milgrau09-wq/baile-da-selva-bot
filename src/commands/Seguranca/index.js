const { ChannelType, PermissionFlagsBits } = require("discord.js");
const { defineCommand } = require("../../bot/prefix/command");
const { snowflake } = require("../../bot/prefix/utils");

const ADMIN = [PermissionFlagsBits.Administrator];

function onOff(value) {
  if (["on", "ativar", "true"].includes(String(value).toLowerCase())) return true;
  if (["off", "desativar", "false"].includes(String(value).toLowerCase())) return false;
  return null;
}

async function updateList(ctx, name) {
  const action = String(ctx.args[0] || "list").toLowerCase();
  if (action === "list") {
    const items = await ctx.db.read(name);
    return ctx.info(name === "blacklist" ? "Blacklist" : "Whitelist", items.length ? items.map((item) => `<@${item.userId || item}> - ${item.reason || "Sem motivo"}`).join("\n") : "Lista vazia.");
  }
  const id = snowflake(ctx.args[1]);
  if (!id || !["add", "remove"].includes(action)) return ctx.usage("Use `add ID motivo`, `remove ID` ou `list`.");
  if (action === "add") {
    const reason = ctx.args.slice(2).join(" ") || `Adicionado por ${ctx.author.tag}`;
    await ctx.db.update(name, async (items) => [{ userId: id, reason, addedBy: ctx.author.id, createdAt: new Date().toISOString() }, ...items.filter((item) => (item.userId || item) !== id)]);
    return ctx.success(`<@${id}> foi adicionado a ${name}.`, "Lista atualizada");
  }
  await ctx.db.update(name, async (items) => items.filter((item) => (item.userId || item) !== id));
  return ctx.success(`<@${id}> foi removido de ${name}.`, "Lista atualizada");
}

const commands = [
  defineCommand({
    name: "lockdown", aliases: ["trancartudo"], description: "Tranca todos os canais de texto em uma emergencia.", category: "Seguranca", usage: "confirmar", userPermissions: ADMIN, botPermissions: [PermissionFlagsBits.ManageChannels], cooldown: 30,
    async execute(ctx) {
      if (ctx.args[0] !== "confirmar") return ctx.usage("Isto impede membros comuns de enviar mensagens.");
      const channels = ctx.guild.channels.cache.filter((channel) => [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum].includes(channel.type));
      let changed = 0;
      for (const channel of channels.values()) {
        const result = await channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false, SendMessagesInThreads: false }, { reason: `Lockdown por ${ctx.author.tag}` }).catch(() => null);
        if (result) changed += 1;
      }
      await ctx.db.setConfig({ commandPermissions: { lockdown: true } });
      await ctx.success(`Lockdown aplicado em **${changed} canais**.`, "Servidor protegido");
    }
  }),
  defineCommand({
    name: "unlockdown", aliases: ["destrancartudo"], description: "Remove o bloqueio geral dos canais.", category: "Seguranca", usage: "confirmar", userPermissions: ADMIN, botPermissions: [PermissionFlagsBits.ManageChannels], cooldown: 30,
    async execute(ctx) {
      if (ctx.args[0] !== "confirmar") return ctx.usage();
      const channels = ctx.guild.channels.cache.filter((channel) => [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum].includes(channel.type));
      let changed = 0;
      for (const channel of channels.values()) {
        const result = await channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: null, SendMessagesInThreads: null }, { reason: `Unlockdown por ${ctx.author.tag}` }).catch(() => null);
        if (result) changed += 1;
      }
      await ctx.db.setConfig({ commandPermissions: { lockdown: false } });
      await ctx.success(`Lockdown removido de **${changed} canais**.`, "Servidor liberado");
    }
  }),
  defineCommand({
    name: "antiraid", aliases: ["raid"], description: "Configura a deteccao de entradas em massa.", category: "Seguranca", usage: "on limite segundos | off", userPermissions: ADMIN,
    async execute(ctx) {
      const enabled = onOff(ctx.args[0]);
      if (enabled === null) return ctx.usage();
      const joinLimit = Math.max(3, Number(ctx.args[1] || 8));
      const secondsWindow = Math.max(5, Number(ctx.args[2] || 15));
      await ctx.db.setConfig({ modules: { "security-anti-raid": { enabled, joinLimit, secondsWindow, lockServer: true } } });
      await ctx.success(enabled ? `Anti-raid ativo: **${joinLimit} entradas em ${secondsWindow}s**.` : "Anti-raid desativado.", "Anti-raid atualizado");
    }
  }),
  defineCommand({
    name: "antispam", aliases: ["spam"], description: "Configura limite de mensagens repetidas.", category: "Seguranca", usage: "on mensagens segundos timeout_min | off", userPermissions: ADMIN,
    async execute(ctx) {
      const enabled = onOff(ctx.args[0]);
      if (enabled === null) return ctx.usage();
      const messageLimit = Math.max(3, Number(ctx.args[1] || 6));
      const secondsWindow = Math.max(3, Number(ctx.args[2] || 8));
      const timeoutMinutes = Math.max(0, Number(ctx.args[3] || 5));
      await ctx.db.setConfig({ modules: { "security-anti-spam": { enabled, messageLimit, secondsWindow, timeoutMinutes, blockCaps: true } } });
      await ctx.success(enabled ? `Anti-spam ativo: **${messageLimit} mensagens em ${secondsWindow}s**.` : "Anti-spam desativado.", "Anti-spam atualizado");
    }
  }),
  defineCommand({
    name: "automod", aliases: ["moderacaoautomatica"], description: "Ativa o filtro de links, convites e conteudo.", category: "Seguranca", usage: "on | off", userPermissions: ADMIN,
    async execute(ctx) {
      const enabled = onOff(ctx.args[0]);
      if (enabled === null) return ctx.usage();
      await ctx.db.setConfig({ modules: {
        "security-anti-link-invite": { enabled, blockInvites: true, blockLinks: true, timeoutMinutes: 5 },
        "security-block-words-images": { enabled, blockImages: false, blockFiles: false, timeoutMinutes: 5 }
      } });
      await ctx.success(enabled ? "Automod ativado. Ajuste palavras e canais pelo painel." : "Automod desativado.", "Automod atualizado");
    }
  }),
  defineCommand({ name: "whitelist", aliases: ["listabranca"], description: "Gerencia usuarios confiaveis da seguranca.", category: "Seguranca", usage: "add ID motivo | remove ID | list", userPermissions: ADMIN, execute: (ctx) => updateList(ctx, "whitelist") }),
  defineCommand({ name: "blacklist", aliases: ["listanegra"], description: "Gerencia usuarios bloqueados de usar o bot.", category: "Seguranca", usage: "add ID motivo | remove ID | list", userPermissions: ADMIN, execute: (ctx) => updateList(ctx, "blacklist") }),
  defineCommand({
    name: "antinuke", aliases: ["protecaonuke"], description: "Ativa protecao contra exclusoes e banimentos em massa.", category: "Seguranca", usage: "on limite | off", userPermissions: ADMIN,
    async execute(ctx) {
      const enabled = onOff(ctx.args[0]);
      if (enabled === null) return ctx.usage();
      const limit = Math.max(1, Number(ctx.args[1] || 3));
      await ctx.db.setConfig({ modules: {
        "security-anti-ban": { enabled, banLimit: limit, minutesWindow: 2, removeRolesFromActor: true },
        "security-role-protection": { enabled },
        "security-url-protection": { enabled }
      } });
      await ctx.success(enabled ? `Anti-nuke ativo com limite de **${limit} acoes**.` : "Anti-nuke desativado.", "Anti-nuke atualizado");
    }
  })
];

module.exports = { commands };

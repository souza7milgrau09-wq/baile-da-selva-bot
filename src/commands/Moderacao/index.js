const { PermissionFlagsBits } = require("discord.js");
const { defineCommand } = require("../../bot/prefix/command");
const { parseDuration, snowflake } = require("../../bot/prefix/utils");

const MOD = [PermissionFlagsBits.ModerateMembers];
const MANAGE_MESSAGES = [PermissionFlagsBits.ManageMessages];
const MANAGE_CHANNELS = [PermissionFlagsBits.ManageChannels];
const MANAGE_ROLES = [PermissionFlagsBits.ManageRoles];

function reasonFrom(ctx, start = 1) {
  return ctx.args.slice(start).join(" ") || `Acao de ${ctx.author.tag}`;
}

function canAct(ctx, target) {
  if (!target) return "Membro nao encontrado.";
  if (target.id === ctx.author.id) return "Voce nao pode aplicar esta acao em si mesmo.";
  if (target.id === ctx.guild.ownerId) return "O dono do servidor nao pode ser moderado.";
  if (!target.moderatable) return "Meu cargo precisa ficar acima do cargo desse membro.";
  if (ctx.author.id !== ctx.guild.ownerId && target.roles.highest.position >= ctx.member.roles.highest.position) {
    return "Seu cargo precisa ficar acima do cargo desse membro.";
  }
  return "";
}

async function applyTimeout(ctx, remove = false) {
  const target = await ctx.getMember();
  const error = canAct(ctx, target);
  if (error) return ctx.error(error);
  if (remove) {
    await target.timeout(null, reasonFrom(ctx));
    return ctx.success(`O timeout de ${target} foi removido.`, "Timeout removido");
  }
  const duration = parseDuration(ctx.args[1]);
  if (!duration || duration > 28 * 86400000) return ctx.usage("Use uma duracao como `10m`, `2h` ou `7d` (maximo de 28 dias).");
  const reason = reasonFrom(ctx, 2);
  await target.timeout(duration, reason);
  await ctx.db.addEvent("member_timeout", { userId: target.id, moderatorId: ctx.author.id, duration, reason });
  return ctx.success(`${target} recebeu timeout por **${ctx.args[1]}**.\nMotivo: ${reason}`, "Timeout aplicado");
}

async function purgeByType(ctx, bots) {
  const amount = Math.min(100, Math.max(1, Number(ctx.args[0] || 20)));
  const messages = await ctx.channel.messages.fetch({ limit: 100 });
  const selected = messages.filter((message) => message.author.bot === bots).first(amount);
  const deleted = await ctx.channel.bulkDelete(selected, true);
  const notice = await ctx.channel.send({ embeds: [ctx.embed("Limpeza concluida", `${deleted.size} mensagem(ns) removida(s).`)] });
  setTimeout(() => notice.delete().catch(() => undefined), 5000);
}

const commands = [
  defineCommand({
    name: "ban", aliases: ["banir"], description: "Bane um membro do servidor.", category: "Moderacao", usage: "@usuario [motivo]", cooldown: 5,
    userPermissions: [PermissionFlagsBits.BanMembers], botPermissions: [PermissionFlagsBits.BanMembers],
    async execute(ctx) {
      const target = await ctx.getMember();
      const error = canAct(ctx, target);
      if (error) return ctx.error(error);
      const reason = reasonFrom(ctx);
      await target.ban({ reason, deleteMessageSeconds: 0 });
      await ctx.db.addEvent("member_ban", { userId: target.id, moderatorId: ctx.author.id, reason });
      await ctx.success(`**${target.user.tag}** foi banido.\nMotivo: ${reason}`, "Membro banido");
    }
  }),
  defineCommand({
    name: "unban", aliases: ["desbanir"], description: "Remove o banimento de um usuario.", category: "Moderacao", usage: "ID [motivo]", cooldown: 5,
    userPermissions: [PermissionFlagsBits.BanMembers], botPermissions: [PermissionFlagsBits.BanMembers],
    async execute(ctx) {
      const id = snowflake(ctx.args[0]);
      if (!id) return ctx.usage("Informe o ID do usuario banido.");
      const reason = reasonFrom(ctx);
      const user = await ctx.guild.bans.remove(id, reason).catch(() => null);
      if (!user) return ctx.error("Esse ID nao esta banido ou nao existe.");
      await ctx.db.addEvent("member_unban", { userId: id, moderatorId: ctx.author.id, reason });
      await ctx.success(`**${user.tag || id}** foi desbanido.`, "Banimento removido");
    }
  }),
  defineCommand({
    name: "kick", aliases: ["expulsar"], description: "Expulsa um membro do servidor.", category: "Moderacao", usage: "@usuario [motivo]", cooldown: 5,
    userPermissions: [PermissionFlagsBits.KickMembers], botPermissions: [PermissionFlagsBits.KickMembers],
    async execute(ctx) {
      const target = await ctx.getMember();
      const error = canAct(ctx, target);
      if (error) return ctx.error(error);
      const reason = reasonFrom(ctx);
      await target.kick(reason);
      await ctx.db.addEvent("member_kick", { userId: target.id, moderatorId: ctx.author.id, reason });
      await ctx.success(`**${target.user.tag}** foi expulso.\nMotivo: ${reason}`, "Membro expulso");
    }
  }),
  defineCommand({ name: "mute", description: "Silencia um membro usando timeout.", category: "Moderacao", usage: "@usuario 10m [motivo]", userPermissions: MOD, botPermissions: MOD, execute: (ctx) => applyTimeout(ctx) }),
  defineCommand({ name: "unmute", description: "Remove o silencio de um membro.", category: "Moderacao", usage: "@usuario [motivo]", userPermissions: MOD, botPermissions: MOD, execute: (ctx) => applyTimeout(ctx, true) }),
  defineCommand({ name: "timeout", aliases: ["castigo"], description: "Aplica timeout temporario em um membro.", category: "Moderacao", usage: "@usuario 10m [motivo]", userPermissions: MOD, botPermissions: MOD, execute: (ctx) => applyTimeout(ctx) }),
  defineCommand({ name: "untimeout", aliases: ["uncastigo"], description: "Remove o timeout de um membro.", category: "Moderacao", usage: "@usuario [motivo]", userPermissions: MOD, botPermissions: MOD, execute: (ctx) => applyTimeout(ctx, true) }),
  defineCommand({
    name: "warn", aliases: ["aviso"], description: "Registra um aviso de moderacao.", category: "Moderacao", usage: "@usuario motivo", userPermissions: MOD,
    async execute(ctx) {
      const target = await ctx.getMember();
      if (!target) return ctx.usage("Mencione um membro valido.");
      const reason = reasonFrom(ctx);
      if (!ctx.args.slice(1).length) return ctx.usage("Informe o motivo do aviso.");
      const warn = { id: `warn-${Date.now().toString(36)}`, guildId: ctx.guild.id, userId: target.id, moderatorId: ctx.author.id, reason, createdAt: new Date().toISOString() };
      const warns = await ctx.db.update("warns", async (items) => [warn, ...items]);
      const active = warns.filter((item) => item.guildId === ctx.guild.id && item.userId === target.id && !item.removedAt);
      await target.send({ embeds: [ctx.embed(`Aviso em ${ctx.guild.name}`, reason).addFields({ name: "Total de avisos", value: String(active.length) })] }).catch(() => undefined);
      const warnModule = ctx.config.modules["security-warns"] || {};
      if (warnModule.autoTimeout && active.length >= Number(warnModule.maxWarns || 3) && target.moderatable) {
        await target.timeout(3600000, `Limite de ${active.length} avisos atingido`).catch(() => undefined);
      }
      await ctx.success(`${target} recebeu um aviso. Total ativo: **${active.length}**.\nMotivo: ${reason}`, "Aviso registrado");
    }
  }),
  defineCommand({
    name: "warnings", aliases: ["warns", "avisos"], description: "Lista os avisos de um membro.", category: "Moderacao", usage: "[@usuario]", userPermissions: MOD,
    async execute(ctx) {
      const target = await ctx.getMember() || ctx.member;
      const warns = (await ctx.db.read("warns")).filter((item) => item.guildId === ctx.guild.id && item.userId === target.id && !item.removedAt);
      await ctx.info(`Avisos de ${target.user.username}`, warns.length ? warns.slice(0, 15).map((warn, index) => `**${index + 1}.** ${warn.reason}\nID: \`${warn.id}\` | <@${warn.moderatorId}>`).join("\n\n") : "Nenhum aviso ativo.");
    }
  }),
  defineCommand({
    name: "clear", aliases: ["limpar", "purge"], description: "Apaga mensagens recentes do canal.", category: "Moderacao", usage: "1-100", userPermissions: MANAGE_MESSAGES, botPermissions: MANAGE_MESSAGES,
    async execute(ctx) {
      const amount = Math.min(100, Math.max(1, Number(ctx.args[0] || 0)));
      if (!Number(ctx.args[0])) return ctx.usage("Informe uma quantidade entre 1 e 100.");
      await ctx.message.delete().catch(() => undefined);
      const deleted = await ctx.channel.bulkDelete(amount, true);
      const notice = await ctx.channel.send({ embeds: [ctx.embed("Canal limpo", `${deleted.size} mensagem(ns) removida(s).`)] });
      setTimeout(() => notice.delete().catch(() => undefined), 5000);
    }
  }),
  defineCommand({
    name: "lock", aliases: ["trancar"], description: "Bloqueia mensagens no canal.", category: "Moderacao", userPermissions: MANAGE_CHANNELS, botPermissions: MANAGE_CHANNELS,
    async execute(ctx) {
      await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: false }, { reason: `Canal trancado por ${ctx.author.tag}` });
      await ctx.success(`O canal ${ctx.channel} foi trancado.`, "Canal trancado");
    }
  }),
  defineCommand({
    name: "unlock", aliases: ["destrancar"], description: "Libera mensagens no canal.", category: "Moderacao", userPermissions: MANAGE_CHANNELS, botPermissions: MANAGE_CHANNELS,
    async execute(ctx) {
      await ctx.channel.permissionOverwrites.edit(ctx.guild.roles.everyone, { SendMessages: null }, { reason: `Canal destrancado por ${ctx.author.tag}` });
      await ctx.success(`O canal ${ctx.channel} foi destrancado.`, "Canal liberado");
    }
  }),
  defineCommand({
    name: "slowmode", aliases: ["slow", "lentidao"], description: "Define o modo lento do canal.", category: "Moderacao", usage: "segundos (0-21600)", userPermissions: MANAGE_CHANNELS, botPermissions: MANAGE_CHANNELS,
    async execute(ctx) {
      const seconds = Number(ctx.args[0]);
      if (!Number.isInteger(seconds) || seconds < 0 || seconds > 21600) return ctx.usage();
      await ctx.channel.setRateLimitPerUser(seconds, `Alterado por ${ctx.author.tag}`);
      await ctx.success(seconds ? `Modo lento definido em **${seconds}s**.` : "Modo lento desativado.", "Modo lento atualizado");
    }
  }),
  defineCommand({
    name: "nick", aliases: ["apelido"], description: "Altera o apelido de um membro.", category: "Moderacao", usage: "@usuario novo apelido | reset", userPermissions: [PermissionFlagsBits.ManageNicknames], botPermissions: [PermissionFlagsBits.ManageNicknames],
    async execute(ctx) {
      const target = await ctx.getMember();
      const error = canAct(ctx, target);
      if (error) return ctx.error(error);
      const nick = ctx.args.slice(1).join(" ");
      if (!nick) return ctx.usage();
      await target.setNickname(nick.toLowerCase() === "reset" ? null : nick.slice(0, 32), `Alterado por ${ctx.author.tag}`);
      await ctx.success(`Apelido de ${target} atualizado.`, "Apelido atualizado");
    }
  }),
  defineCommand({
    name: "role", aliases: ["addrole", "darcargo"], description: "Adiciona um cargo a um membro.", category: "Moderacao", usage: "@usuario @cargo", userPermissions: MANAGE_ROLES, botPermissions: MANAGE_ROLES,
    async execute(ctx) {
      const target = await ctx.getMember();
      const role = await ctx.getRole(ctx.args[1]);
      if (!target || !role) return ctx.usage();
      if (role.managed || role.position >= ctx.guild.members.me.roles.highest.position) return ctx.error("Nao consigo gerenciar esse cargo. Coloque meu cargo acima dele.");
      if (ctx.author.id !== ctx.guild.ownerId && role.position >= ctx.member.roles.highest.position) return ctx.error("Voce nao pode gerenciar um cargo igual ou acima do seu.");
      await target.roles.add(role, `Adicionado por ${ctx.author.tag}`);
      await ctx.success(`${role} adicionado a ${target}.`, "Cargo adicionado");
    }
  }),
  defineCommand({
    name: "unrole", aliases: ["removercargo", "delrole"], description: "Remove um cargo de um membro.", category: "Moderacao", usage: "@usuario @cargo", userPermissions: MANAGE_ROLES, botPermissions: MANAGE_ROLES,
    async execute(ctx) {
      const target = await ctx.getMember();
      const role = await ctx.getRole(ctx.args[1]);
      if (!target || !role) return ctx.usage();
      if (role.managed || role.position >= ctx.guild.members.me.roles.highest.position) return ctx.error("Nao consigo gerenciar esse cargo.");
      await target.roles.remove(role, `Removido por ${ctx.author.tag}`);
      await ctx.success(`${role} removido de ${target}.`, "Cargo removido");
    }
  }),
  defineCommand({
    name: "say", aliases: ["falar"], description: "Envia uma mensagem pelo bot.", category: "Moderacao", usage: "texto", userPermissions: MANAGE_MESSAGES,
    async execute(ctx) {
      if (!ctx.rawArgs) return ctx.usage();
      await ctx.message.delete().catch(() => undefined);
      await ctx.channel.send({ content: ctx.rawArgs.slice(0, 2000), allowedMentions: { parse: [] } });
    }
  }),
  defineCommand({
    name: "embed", aliases: ["embled"], description: "Cria um embed personalizado.", category: "Moderacao", usage: "titulo | descricao | #cor", userPermissions: MANAGE_MESSAGES,
    async execute(ctx) {
      const [title, description, color] = ctx.rawArgs.split("|").map((value) => value.trim());
      if (!title || !description) return ctx.usage();
      await ctx.channel.send({ embeds: [ctx.embed(title, description, /^#[0-9a-f]{6}$/i.test(color || "") ? color : undefined)] });
    }
  }),
  defineCommand({ name: "purgebots", aliases: ["limparbots"], description: "Apaga apenas mensagens de bots.", category: "Moderacao", usage: "[quantidade]", userPermissions: MANAGE_MESSAGES, botPermissions: MANAGE_MESSAGES, execute: (ctx) => purgeByType(ctx, true) }),
  defineCommand({ name: "purgehumans", aliases: ["limparhumanos"], description: "Apaga apenas mensagens de pessoas.", category: "Moderacao", usage: "[quantidade]", userPermissions: MANAGE_MESSAGES, botPermissions: MANAGE_MESSAGES, execute: (ctx) => purgeByType(ctx, false) })
];

module.exports = { commands };

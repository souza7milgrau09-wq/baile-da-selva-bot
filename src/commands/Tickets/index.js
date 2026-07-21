const { AttachmentBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");
const { defineCommand } = require("../../bot/prefix/command");
const { brandEmbed, ticketControls } = require("../../bot/embeds");
const { cleanChannelName, hexToInt, shortId } = require("../../utils/text");

function supportRoles(config) {
  return [...new Set([...(config.ticket.supportRoleIds || []), ...(config.staffRoleIds || [])])];
}

async function channelTicket(ctx) {
  const tickets = await ctx.db.read("tickets");
  return tickets.find((ticket) => ticket.channelId === ctx.channel.id && ticket.status !== "deleted");
}

function canManage(ctx, ticket) {
  return ctx.bot.isStaff(ctx.member, ctx.config) || (ticket && ticket.userId === ctx.author.id);
}

async function updateTicket(ctx, ticketId, patch) {
  await ctx.db.update("tickets", async (items) => items.map((ticket) => ticket.id === ticketId ? { ...ticket, ...patch } : ticket));
}

async function createTicket(ctx) {
  if (!ctx.config.ticket.enabled) return ctx.error("O sistema de tickets esta desativado no painel.");
  const tickets = await ctx.db.read("tickets");
  const existing = tickets.find((ticket) => (!ticket.guildId || ticket.guildId === ctx.guild.id) && ticket.userId === ctx.author.id && ticket.status === "open");
  if (existing && !ctx.config.ticket.allowMultipleTickets) return ctx.error(`Voce ja possui um ticket aberto: <#${existing.channelId}>.`);

  const ticketId = shortId("ticket");
  const roles = supportRoles(ctx.config);
  const name = cleanChannelName(String(ctx.config.ticket.ticketNamePattern || "ticket-{user}-{id}")
    .replaceAll("{user}", ctx.author.username)
    .replaceAll("{id}", ticketId.slice(-4)));
  const permissionOverwrites = [
    { id: ctx.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: ctx.author.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
    { id: ctx.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
    ...roles.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages] }))
  ];
  const channel = await ctx.guild.channels.create({
    name,
    type: ChannelType.GuildText,
    parent: ctx.config.ticket.categoryId || undefined,
    permissionOverwrites,
    topic: `Ticket ${ticketId} | Usuario ${ctx.author.id}`
  });
  const ticket = {
    id: ticketId,
    guildId: ctx.guild.id,
    userId: ctx.author.id,
    userTag: ctx.author.tag,
    channelId: channel.id,
    status: "open",
    claimedBy: "",
    createdAt: new Date().toISOString()
  };
  await ctx.db.update("tickets", async (items) => [ticket, ...items]);
  const embed = brandEmbed(ctx.config)
    .setColor(hexToInt(ctx.config.ticket.panelColor || ctx.config.accentColor))
    .setTitle(ctx.config.ticket.openedTitle || `Ticket de ${ctx.author.username}`)
    .setDescription(ctx.config.ticket.openedMessage)
    .addFields(
      { name: "Usuario", value: `<@${ctx.author.id}>`, inline: true },
      { name: "Status", value: "Aberto", inline: true },
      { name: "Ticket", value: ticketId, inline: true }
    );
  await channel.send({
    content: [`<@${ctx.author.id}>`, ctx.config.ticket.mentionSupport ? roles.map((id) => `<@&${id}>`).join(" ") : ""].filter(Boolean).join(" "),
    embeds: [embed],
    components: ticketControls(ticketId),
    allowedMentions: { users: [ctx.author.id], roles }
  });
  await ctx.db.addEvent("ticket_opened", { ticketId, userId: ctx.author.id, channelId: channel.id });
  return ctx.success(`Seu atendimento foi criado em ${channel}.`, "Ticket aberto");
}

const commands = [
  defineCommand({ name: "ticket", aliases: ["atendimento"], description: "Abre um ticket privado com a equipe.", category: "Tickets", cooldown: 15, botPermissions: [PermissionFlagsBits.ManageChannels], execute: createTicket }),
  defineCommand({
    name: "panel", aliases: ["painelticket"], description: "Envia o painel profissional de tickets.", category: "Tickets", usage: "[#canal]", userPermissions: [PermissionFlagsBits.ManageGuild], botPermissions: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
    async execute(ctx) {
      const channel = await ctx.getChannel() || ctx.channel;
      await ctx.bot.sendTicketPanel(channel.id);
      await ctx.success(`Painel enviado em ${channel}.`, "Painel publicado");
    }
  }),
  defineCommand({
    name: "close", aliases: ["fechar"], description: "Fecha o ticket atual e gera transcript.", category: "Tickets", usage: "[motivo]", cooldown: 5,
    async execute(ctx) {
      const ticket = await channelTicket(ctx);
      if (!ticket || ticket.status !== "open") return ctx.error("Este canal nao e um ticket aberto.");
      if (!canManage(ctx, ticket)) return ctx.error("Voce nao pode fechar este ticket.");
      const transcript = await ctx.bot.buildTranscript(ctx.channel, ticket);
      await updateTicket(ctx, ticket.id, { status: "closed", closedAt: new Date().toISOString(), closedBy: ctx.author.id, closeReason: ctx.rawArgs || "Sem motivo" });
      await ctx.channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false }).catch(() => undefined);
      await ctx.bot.sendTicketLog(ctx.config, ticket, transcript, ctx.author.id);
      await ctx.db.addEvent("ticket_closed", { ticketId: ticket.id, userId: ctx.author.id });
      await ctx.reply({ embeds: [ctx.embed("Ticket fechado", `Fechado por <@${ctx.author.id}>.\nMotivo: ${ctx.rawArgs || "Sem motivo"}`)], components: ticketControls(ticket.id, true) });
    }
  }),
  defineCommand({
    name: "add", aliases: ["ticketadd"], description: "Adiciona um membro ao ticket.", category: "Tickets", usage: "@usuario", userPermissions: [PermissionFlagsBits.ManageChannels], botPermissions: [PermissionFlagsBits.ManageChannels],
    async execute(ctx) {
      const ticket = await channelTicket(ctx);
      const member = await ctx.getMember();
      if (!ticket || !member) return ctx.usage("Use dentro de um ticket e mencione o membro.");
      await ctx.channel.permissionOverwrites.edit(member.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      await ctx.success(`${member} foi adicionado ao ticket.`, "Membro adicionado");
    }
  }),
  defineCommand({
    name: "remove", aliases: ["ticketremove"], description: "Remove um membro do ticket.", category: "Tickets", usage: "@usuario", userPermissions: [PermissionFlagsBits.ManageChannels], botPermissions: [PermissionFlagsBits.ManageChannels],
    async execute(ctx) {
      const ticket = await channelTicket(ctx);
      const member = await ctx.getMember();
      if (!ticket || !member) return ctx.usage("Use dentro de um ticket e mencione o membro.");
      if (member.id === ticket.userId) return ctx.error("Use o comando `close` para retirar o autor do ticket.");
      await ctx.channel.permissionOverwrites.delete(member.id);
      await ctx.success(`${member} foi removido do ticket.`, "Membro removido");
    }
  }),
  defineCommand({
    name: "rename", aliases: ["renomearticket"], description: "Renomeia o canal do ticket.", category: "Tickets", usage: "novo-nome", userPermissions: [PermissionFlagsBits.ManageChannels], botPermissions: [PermissionFlagsBits.ManageChannels],
    async execute(ctx) {
      const ticket = await channelTicket(ctx);
      if (!ticket || !ctx.rawArgs) return ctx.usage("Use dentro de um ticket.");
      await ctx.channel.setName(cleanChannelName(ctx.rawArgs).slice(0, 90));
      await ctx.success(`Canal renomeado para **${ctx.channel.name}**.`, "Ticket renomeado");
    }
  }),
  defineCommand({
    name: "claim", aliases: ["assumir"], description: "Assume a responsabilidade pelo ticket.", category: "Tickets",
    async execute(ctx) {
      const ticket = await channelTicket(ctx);
      if (!ticket) return ctx.error("Este canal nao e um ticket.");
      if (!ctx.bot.isStaff(ctx.member, ctx.config)) return ctx.error("Somente a equipe pode assumir tickets.");
      if (ticket.claimedBy && ticket.claimedBy !== ctx.author.id) return ctx.error(`Este ticket ja foi assumido por <@${ticket.claimedBy}>.`);
      await updateTicket(ctx, ticket.id, { claimedBy: ctx.author.id, claimedAt: new Date().toISOString() });
      await ctx.success(`Ticket assumido por ${ctx.member}.`, "Atendimento assumido");
    }
  }),
  defineCommand({
    name: "unclaim", aliases: ["desassumir"], description: "Libera o ticket para outro atendente.", category: "Tickets",
    async execute(ctx) {
      const ticket = await channelTicket(ctx);
      if (!ticket) return ctx.error("Este canal nao e um ticket.");
      if (!ctx.bot.isStaff(ctx.member, ctx.config)) return ctx.error("Somente a equipe pode liberar tickets.");
      await updateTicket(ctx, ticket.id, { claimedBy: "", claimedAt: "", unclaimedBy: ctx.author.id });
      await ctx.success("O ticket voltou para a fila da equipe.", "Ticket liberado");
    }
  }),
  defineCommand({
    name: "transcript", aliases: ["transcrever"], description: "Gera um transcript HTML do ticket.", category: "Tickets", cooldown: 15,
    async execute(ctx) {
      const ticket = await channelTicket(ctx);
      if (!ticket || !canManage(ctx, ticket)) return ctx.error("Use este comando dentro de um ticket que voce possa gerenciar.");
      const transcript = await ctx.bot.buildTranscript(ctx.channel, ticket);
      await ctx.reply({ embeds: [ctx.embed("Transcript pronto", `Registro do ticket \`${ticket.id}\`.`)], files: [new AttachmentBuilder(transcript, { name: `${ticket.id}.html` })] });
    }
  }),
  defineCommand({
    name: "reopen", aliases: ["reabrir"], description: "Reabre um ticket fechado.", category: "Tickets", userPermissions: [PermissionFlagsBits.ManageChannels], botPermissions: [PermissionFlagsBits.ManageChannels],
    async execute(ctx) {
      const ticket = await channelTicket(ctx);
      if (!ticket || ticket.status !== "closed") return ctx.error("Este canal nao e um ticket fechado.");
      await updateTicket(ctx, ticket.id, { status: "open", reopenedAt: new Date().toISOString(), reopenedBy: ctx.author.id });
      await ctx.channel.permissionOverwrites.edit(ticket.userId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
      await ctx.success(`Ticket reaberto por ${ctx.member}.`, "Ticket reaberto");
    }
  }),
  defineCommand({
    name: "delete", aliases: ["deleteticket", "apagarticket"], description: "Apaga definitivamente o canal do ticket.", category: "Tickets", usage: "confirmar", userPermissions: [PermissionFlagsBits.ManageChannels], botPermissions: [PermissionFlagsBits.ManageChannels], cooldown: 10,
    async execute(ctx) {
      const ticket = await channelTicket(ctx);
      if (!ticket || ctx.args[0] !== "confirmar") return ctx.usage("Use dentro do ticket. Esta acao apaga o canal.");
      await updateTicket(ctx, ticket.id, { status: "deleted", deletedAt: new Date().toISOString(), deletedBy: ctx.author.id });
      await ctx.success("Este canal sera apagado em 5 segundos.", "Ticket apagado");
      setTimeout(() => ctx.channel.delete(`Ticket apagado por ${ctx.author.tag}`).catch(() => undefined), 5000);
    }
  })
];

module.exports = { commands };

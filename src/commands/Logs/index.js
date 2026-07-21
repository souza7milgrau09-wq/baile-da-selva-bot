const { PermissionFlagsBits } = require("discord.js");
const { defineCommand } = require("../../bot/prefix/command");

const VIEW_LOGS = [PermissionFlagsBits.ManageMessages];

const commands = [
  defineCommand({
    name: "logs", aliases: ["logconfig"], description: "Mostra ou configura os logs do bot.", category: "Logs", usage: "[#canal | off]", userPermissions: [PermissionFlagsBits.ManageGuild],
    async execute(ctx) {
      if (ctx.args[0] === "off") {
        await ctx.db.setConfig({ logs: { enabled: false } });
        return ctx.success("Logs desativados.", "Logs atualizados");
      }
      const channel = await ctx.getChannel();
      if (channel) {
        await ctx.db.setConfig({ logs: { enabled: true, channelId: channel.id, moderationChannelId: channel.id }, modLogChannelId: channel.id });
        return ctx.success(`Logs ativados em ${channel}.`, "Logs atualizados");
      }
      await ctx.info("Configuracao de logs", `Status: **${ctx.config.logs.enabled ? "Ativo" : "Desativado"}**\nCanal geral: ${ctx.config.logs.channelId ? `<#${ctx.config.logs.channelId}>` : "Nao definido"}\nModeracao: ${ctx.config.logs.moderationChannelId ? `<#${ctx.config.logs.moderationChannelId}>` : "Nao definido"}`);
    }
  }),
  defineCommand({
    name: "modlogs", aliases: ["historico", "punicoes"], description: "Mostra o historico recente de moderacao.", category: "Logs", usage: "[@usuario]", userPermissions: VIEW_LOGS,
    async execute(ctx) {
      const user = await ctx.getUser();
      const moderationTypes = new Set(["member_ban", "member_unban", "member_kick", "member_timeout", "automod_block", "ticket_closed"]);
      let events = (await ctx.db.read("events")).filter((event) => moderationTypes.has(event.type));
      if (user) events = events.filter((event) => event.payload.userId === user.id);
      const names = { member_ban: "Ban", member_unban: "Unban", member_kick: "Kick", member_timeout: "Timeout", automod_block: "Automod", ticket_closed: "Ticket fechado" };
      await ctx.info(user ? `Historico de ${user.username}` : "Logs de moderacao", events.length ? events.slice(0, 15).map((event) => `**${names[event.type] || event.type}** - <t:${Math.floor(new Date(event.createdAt).getTime() / 1000)}:R>\n${event.payload.reason || event.payload.message || `ID: ${event.payload.userId || event.payload.ticketId || "-"}`}`).join("\n\n") : "Nenhum registro encontrado.");
    }
  }),
  defineCommand({
    name: "sniper", aliases: ["snipe"], description: "Mostra a ultima mensagem apagada do canal.", category: "Logs", userPermissions: VIEW_LOGS,
    async execute(ctx) {
      const record = (await ctx.db.read("snipes"))[ctx.channel.id];
      if (!record) return ctx.error("Nao ha mensagem apagada registrada neste canal.");
      const embed = ctx.embed("Ultima mensagem apagada", record.content || "[sem texto]")
        .addFields(
          { name: "Autor", value: `<@${record.authorId}>`, inline: true },
          { name: "Apagada", value: `<t:${Math.floor(new Date(record.deletedAt).getTime() / 1000)}:R>`, inline: true }
        );
      if (record.attachmentUrl) embed.setImage(record.attachmentUrl);
      await ctx.reply({ embeds: [embed] });
    }
  }),
  defineCommand({
    name: "editsniper", aliases: ["editsnipe"], description: "Mostra a ultima mensagem editada do canal.", category: "Logs", userPermissions: VIEW_LOGS,
    async execute(ctx) {
      const record = (await ctx.db.read("editsnipes"))[ctx.channel.id];
      if (!record) return ctx.error("Nao ha mensagem editada registrada neste canal.");
      await ctx.info("Ultima mensagem editada", `**Antes:** ${record.before || "[sem texto]"}\n**Depois:** ${record.after || "[sem texto]"}`, [
        { name: "Autor", value: `<@${record.authorId}>`, inline: true },
        { name: "Editada", value: `<t:${Math.floor(new Date(record.editedAt).getTime() / 1000)}:R>`, inline: true }
      ]);
    }
  })
];

module.exports = { commands };

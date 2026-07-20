const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");

function buildSlashCommands() {
  return [
    new SlashCommandBuilder()
      .setName("status")
      .setDescription("Mostra o status do bot e do painel.")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("painel-ticket")
      .setDescription("Envia o painel de ticket no canal escolhido.")
      .addChannelOption((option) =>
        option
          .setName("canal")
          .setDescription("Canal onde o painel sera enviado.")
          .setRequired(false)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("painel-formulario")
      .setDescription("Envia o painel de formulario ativo.")
      .addChannelOption((option) =>
        option
          .setName("canal")
          .setDescription("Canal onde o painel sera enviado.")
          .setRequired(false)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
    new SlashCommandBuilder()
      .setName("painel-loja")
      .setDescription("Envia o painel da loja.")
      .addChannelOption((option) =>
        option
          .setName("canal")
          .setDescription("Canal onde o painel sera enviado.")
          .setRequired(false)
      )
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  ].map((command) => command.toJSON());
}

module.exports = { buildSlashCommands };

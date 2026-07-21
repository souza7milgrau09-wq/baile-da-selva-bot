const { ChannelType, PermissionFlagsBits } = require("discord.js");
const { defineCommand } = require("../../bot/prefix/command");
const { snowflake } = require("../../bot/prefix/utils");

const MANAGE_GUILD = [PermissionFlagsBits.ManageGuild];

function cleanMentionText(value) {
  return String(value || "").replace(/<[@#&!]+\d+>/g, "").trim();
}

const commands = [
  defineCommand({
    name: "setprefix", aliases: ["prefixo"], description: "Altera o prefixo do servidor.", category: "Administracao", usage: "novo_prefixo", userPermissions: MANAGE_GUILD,
    async execute(ctx) {
      const prefix = String(ctx.args[0] || "").trim();
      if (!prefix || prefix.length > 5 || /\s/.test(prefix)) return ctx.usage("O prefixo deve ter entre 1 e 5 caracteres e nao pode conter espacos.");
      await ctx.db.setConfig({ botIdentity: { prefix } });
      await ctx.success(`O novo prefixo e \`${prefix}\`.`, "Prefixo atualizado");
    }
  }),
  defineCommand({
    name: "setwelcome", aliases: ["configwelcome"], description: "Configura as boas-vindas.", category: "Administracao", usage: "#canal mensagem | off", userPermissions: MANAGE_GUILD,
    async execute(ctx) {
      if (ctx.args[0] === "off") {
        await ctx.db.setConfig({ welcome: { enabled: false } });
        return ctx.success("Boas-vindas desativadas.");
      }
      const channel = await ctx.getChannel();
      const message = cleanMentionText(ctx.rawArgs);
      if (!channel || !message) return ctx.usage("Variaveis: `{user}` e `{server}`.");
      await ctx.db.setConfig({ welcome: { enabled: true, channelId: channel.id, message } });
      await ctx.success(`Boas-vindas ativadas em ${channel}.`, "Boas-vindas configuradas");
    }
  }),
  defineCommand({
    name: "setleave", aliases: ["configleave"], description: "Configura a mensagem de saida.", category: "Administracao", usage: "#canal mensagem | off", userPermissions: MANAGE_GUILD,
    async execute(ctx) {
      if (ctx.args[0] === "off") {
        await ctx.db.setConfig({ leave: { enabled: false } });
        return ctx.success("Mensagens de saida desativadas.");
      }
      const channel = await ctx.getChannel();
      const message = cleanMentionText(ctx.rawArgs);
      if (!channel || !message) return ctx.usage("Variaveis: `{user}` e `{server}`.");
      await ctx.db.setConfig({ leave: { enabled: true, channelId: channel.id, message } });
      await ctx.success(`Mensagens de saida ativadas em ${channel}.`, "Saidas configuradas");
    }
  }),
  defineCommand({
    name: "setlogs", aliases: ["configlogs"], description: "Define o canal de logs gerais.", category: "Administracao", usage: "#canal | off", userPermissions: MANAGE_GUILD,
    async execute(ctx) {
      if (ctx.args[0] === "off") {
        await ctx.db.setConfig({ logs: { enabled: false }, modLogChannelId: "" });
        return ctx.success("Logs desativados.");
      }
      const channel = await ctx.getChannel();
      if (!channel || !channel.isTextBased()) return ctx.usage();
      await ctx.db.setConfig({ logs: { enabled: true, channelId: channel.id, moderationChannelId: channel.id }, modLogChannelId: channel.id });
      await ctx.success(`Logs serao enviados em ${channel}.`, "Logs configurados");
    }
  }),
  defineCommand({
    name: "setautorole", aliases: ["autorole"], description: "Define o cargo automatico de entrada.", category: "Administracao", usage: "@cargo | off", userPermissions: MANAGE_GUILD, botPermissions: [PermissionFlagsBits.ManageRoles],
    async execute(ctx) {
      if (ctx.args[0] === "off") {
        await ctx.db.setConfig({ welcome: { autoRoleId: "" } });
        return ctx.success("Cargo automatico removido.");
      }
      const role = await ctx.getRole();
      if (!role) return ctx.usage();
      if (role.position >= ctx.guild.members.me.roles.highest.position) return ctx.error("Meu cargo precisa ficar acima do cargo automatico.");
      await ctx.db.setConfig({ welcome: { autoRoleId: role.id } });
      await ctx.success(`${role} sera entregue aos novos membros.`, "Cargo automatico configurado");
    }
  }),
  defineCommand({
    name: "setverify", aliases: ["configverify"], description: "Configura o cargo e canal de verificacao.", category: "Administracao", usage: "#canal @cargo | off", userPermissions: MANAGE_GUILD, botPermissions: [PermissionFlagsBits.ManageRoles],
    async execute(ctx) {
      if (ctx.args[0] === "off") {
        await ctx.db.setConfig({ verification: { enabled: false } });
        return ctx.success("Verificacao desativada.");
      }
      const channel = await ctx.getChannel();
      const role = await ctx.getRole(ctx.args[1]);
      if (!channel || !role) return ctx.usage();
      await ctx.db.setConfig({ verification: { enabled: true, channelId: channel.id, roleId: role.id } });
      await ctx.success(`Verificacao configurada em ${channel} com o cargo ${role}.`, "Verificacao configurada");
    }
  }),
  defineCommand({
    name: "settickets", aliases: ["configticket"], description: "Configura canal, categoria e equipe dos tickets.", category: "Administracao", usage: "#canal ID_categoria @cargo | off", userPermissions: MANAGE_GUILD, botPermissions: [PermissionFlagsBits.ManageChannels],
    async execute(ctx) {
      if (ctx.args[0] === "off") {
        await ctx.db.setConfig({ ticket: { enabled: false } });
        return ctx.success("Tickets desativados.");
      }
      const panelChannel = await ctx.getChannel();
      const categoryId = snowflake(ctx.args.find((arg) => !arg.startsWith("<#") && !arg.startsWith("<@&")));
      const role = await ctx.getRole();
      const category = categoryId ? await ctx.guild.channels.fetch(categoryId).catch(() => null) : null;
      if (!panelChannel || !category || category.type !== ChannelType.GuildCategory || !role) return ctx.usage();
      await ctx.db.setConfig({
        ticket: { enabled: true, panelChannelId: panelChannel.id, categoryId: category.id, supportRoleIds: [role.id] },
        staffRoleIds: [...new Set([...(ctx.config.staffRoleIds || []), role.id])]
      });
      await ctx.success(`Tickets ativados em ${panelChannel}, categoria **${category.name}**, equipe ${role}.`, "Tickets configurados");
    }
  }),
  defineCommand({
    name: "setxp", aliases: ["configxp"], description: "Ativa e configura XP por mensagem.", category: "Administracao", usage: "on XP cooldown_segundos | off", userPermissions: MANAGE_GUILD,
    async execute(ctx) {
      const enabled = ["on", "ativar", "true"].includes(String(ctx.args[0]).toLowerCase());
      if (!enabled && ctx.args[0] !== "off") return ctx.usage();
      const xpPerMessage = Math.min(1000, Math.max(1, Number(ctx.args[1] || 15)));
      const cooldownSeconds = Math.min(3600, Math.max(5, Number(ctx.args[2] || 60)));
      await ctx.db.setConfig({ leveling: { enabled, xpPerMessage, cooldownSeconds } });
      await ctx.success(enabled ? `XP ativado: **${xpPerMessage} XP** a cada **${cooldownSeconds}s**.` : "Sistema de XP desativado.", "XP atualizado");
    }
  }),
  defineCommand({
    name: "backup", aliases: ["backupserver"], description: "Salva a estrutura atual de cargos e canais.", category: "Administracao", userPermissions: [PermissionFlagsBits.Administrator], cooldown: 30,
    async execute(ctx) {
      const backup = {
        id: `backup-${Date.now().toString(36)}`,
        guildId: ctx.guild.id,
        createdBy: ctx.author.id,
        createdAt: new Date().toISOString(),
        roles: ctx.guild.roles.cache.filter((role) => role.id !== ctx.guild.id && !role.managed).sort((a, b) => a.position - b.position).map((role) => ({
          name: role.name, color: role.color, hoist: role.hoist, mentionable: role.mentionable, permissions: role.permissions.bitfield.toString()
        })),
        channels: ctx.guild.channels.cache.sort((a, b) => a.rawPosition - b.rawPosition).map((channel) => ({
          name: channel.name, type: channel.type, topic: channel.topic || "", nsfw: Boolean(channel.nsfw), rateLimitPerUser: channel.rateLimitPerUser || 0, parentName: channel.parent ? channel.parent.name : ""
        }))
      };
      await ctx.db.update("backups", async (items) => [backup, ...items.filter((item) => item.guildId !== ctx.guild.id).slice(0, 9)]);
      await ctx.success(`Backup criado com **${backup.roles.length} cargos** e **${backup.channels.length} canais**.\nID: \`${backup.id}\``, "Backup concluido");
    }
  }),
  defineCommand({
    name: "restore", aliases: ["restaurar"], description: "Recria cargos e canais ausentes de um backup.", category: "Administracao", usage: "ID_do_backup confirmar", userPermissions: [PermissionFlagsBits.Administrator], botPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles], cooldown: 60,
    async execute(ctx) {
      if (ctx.args[1] !== "confirmar") return ctx.usage("A restauracao cria somente estruturas ausentes e nunca apaga as atuais.");
      const backup = (await ctx.db.read("backups")).find((item) => item.id === ctx.args[0] && item.guildId === ctx.guild.id);
      if (!backup) return ctx.error("Backup nao encontrado.");
      let rolesCreated = 0;
      let channelsCreated = 0;
      for (const role of backup.roles) {
        if (ctx.guild.roles.cache.some((current) => current.name === role.name)) continue;
        await ctx.guild.roles.create({ ...role, permissions: BigInt(role.permissions), reason: `Restaurado por ${ctx.author.tag}` });
        rolesCreated += 1;
      }
      const categories = new Map(ctx.guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildCategory).map((channel) => [channel.name, channel.id]));
      for (const channel of backup.channels.filter((item) => item.type === ChannelType.GuildCategory)) {
        if (categories.has(channel.name)) continue;
        const created = await ctx.guild.channels.create({ name: channel.name, type: ChannelType.GuildCategory, reason: `Restaurado por ${ctx.author.tag}` });
        categories.set(created.name, created.id);
        channelsCreated += 1;
      }
      for (const channel of backup.channels.filter((item) => item.type !== ChannelType.GuildCategory)) {
        if (ctx.guild.channels.cache.some((current) => current.name === channel.name && current.type === channel.type)) continue;
        await ctx.guild.channels.create({
          name: channel.name,
          type: channel.type,
          topic: channel.topic || undefined,
          nsfw: channel.nsfw,
          rateLimitPerUser: channel.rateLimitPerUser,
          parent: categories.get(channel.parentName) || undefined,
          reason: `Restaurado por ${ctx.author.tag}`
        });
        channelsCreated += 1;
      }
      await ctx.success(`Criados **${rolesCreated} cargos** e **${channelsCreated} canais** ausentes.`, "Restauracao concluida");
    }
  })
];

module.exports = { commands };

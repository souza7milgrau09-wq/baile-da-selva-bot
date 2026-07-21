const { PermissionFlagsBits } = require("discord.js");
const { defineCommand } = require("../../bot/prefix/command");
const { formatDuration, formatMoney, levelFromXp, xpForLevel } = require("../../bot/prefix/utils");

const commands = [
  defineCommand({
    name: "help",
    aliases: ["ajuda", "comandos"],
    description: "Abre a central interativa de comandos.",
    category: "Usuario",
    usage: "[comando ou termo]",
    cooldown: 3,
    async execute(ctx) {
      await ctx.reply(ctx.manager.helpPayload(ctx, "", ctx.rawArgs));
    }
  }),
  defineCommand({
    name: "ping",
    aliases: ["latencia"],
    description: "Mostra a latencia do bot e da API do Discord.",
    category: "Usuario",
    cooldown: 3,
    async execute(ctx) {
      const sent = await ctx.reply({ embeds: [ctx.embed("Calculando ping", "Aguarde um instante...")] });
      const roundTrip = sent.createdTimestamp - ctx.message.createdTimestamp;
      await sent.edit({ embeds: [ctx.embed("Pong", `Mensagem: **${roundTrip}ms**\nDiscord: **${Math.round(ctx.client.ws.ping)}ms**`)] });
    }
  }),
  defineCommand({
    name: "avatar",
    aliases: ["av", "foto"],
    description: "Mostra o avatar de um usuario.",
    category: "Usuario",
    usage: "[@usuario ou ID]",
    async execute(ctx) {
      const user = await ctx.getUser() || ctx.author;
      const url = user.displayAvatarURL({ size: 4096, extension: "png", forceStatic: false });
      await ctx.reply({ embeds: [ctx.embed(`Avatar de ${user.username}`, `[Abrir imagem](${url})`).setImage(url)] });
    }
  }),
  defineCommand({
    name: "banner",
    description: "Mostra o banner de um usuario.",
    category: "Usuario",
    usage: "[@usuario ou ID]",
    async execute(ctx) {
      const user = await ctx.getUser() || ctx.author;
      const fetched = await ctx.client.users.fetch(user.id, { force: true });
      const url = fetched.bannerURL({ size: 4096, extension: "png" });
      if (!url) return ctx.error(`${fetched.username} nao possui banner configurado.`);
      await ctx.reply({ embeds: [ctx.embed(`Banner de ${fetched.username}`, `[Abrir imagem](${url})`).setImage(url)] });
    }
  }),
  defineCommand({
    name: "userinfo",
    aliases: ["user", "usuario"],
    description: "Mostra informacoes de um membro.",
    category: "Usuario",
    usage: "[@usuario ou ID]",
    async execute(ctx) {
      const member = await ctx.getMember() || ctx.member;
      const roles = member.roles.cache.filter((role) => role.id !== ctx.guild.id).sort((a, b) => b.position - a.position);
      const embed = ctx.embed(`Usuario: ${member.user.username}`, `ID: \`${member.id}\``)
        .setThumbnail(member.displayAvatarURL({ size: 512 }))
        .addFields(
          { name: "Conta criada", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
          { name: "Entrou no servidor", value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Desconhecido", inline: true },
          { name: "Apelido", value: member.nickname || "Nenhum", inline: true },
          { name: "Cargos", value: roles.size ? roles.first(12).join(" ") : "Nenhum", inline: false }
        );
      await ctx.reply({ embeds: [embed] });
    }
  }),
  defineCommand({
    name: "serverinfo",
    aliases: ["server", "servidor"],
    description: "Mostra informacoes do servidor.",
    category: "Usuario",
    async execute(ctx) {
      const guild = await ctx.guild.fetch();
      const embed = ctx.embed(guild.name, `ID: \`${guild.id}\``)
        .setThumbnail(guild.iconURL({ size: 512 }))
        .addFields(
          { name: "Dono", value: `<@${guild.ownerId}>`, inline: true },
          { name: "Membros", value: String(guild.memberCount), inline: true },
          { name: "Canais", value: String(guild.channels.cache.size), inline: true },
          { name: "Cargos", value: String(guild.roles.cache.size), inline: true },
          { name: "Criado", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false }
        );
      if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 1024 }));
      await ctx.reply({ embeds: [embed] });
    }
  }),
  defineCommand({
    name: "roleinfo",
    aliases: ["cargo"],
    description: "Mostra informacoes de um cargo.",
    category: "Usuario",
    usage: "@cargo ou ID",
    async execute(ctx) {
      const role = await ctx.getRole();
      if (!role) return ctx.usage("Mencione um cargo valido.");
      const permissions = role.permissions.toArray();
      await ctx.info(`Cargo: ${role.name}`, `ID: \`${role.id}\``, [
        { name: "Membros", value: String(role.members.size), inline: true },
        { name: "Cor", value: role.hexColor, inline: true },
        { name: "Posicao", value: String(role.position), inline: true },
        { name: "Permissoes", value: permissions.length ? permissions.slice(0, 20).join(", ") : "Nenhuma", inline: false }
      ]);
    }
  }),
  defineCommand({
    name: "botinfo",
    aliases: ["info", "about"],
    description: "Mostra informacoes e numeros do bot.",
    category: "Usuario",
    async execute(ctx) {
      const users = ctx.client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);
      await ctx.info(ctx.config.botIdentity.name || ctx.client.user.username, ctx.config.botIdentity.tagline, [
        { name: "Servidores", value: String(ctx.client.guilds.cache.size), inline: true },
        { name: "Usuarios", value: users.toLocaleString("pt-BR"), inline: true },
        { name: "Comandos", value: String(ctx.manager.list().length), inline: true },
        { name: "Discord.js", value: require("discord.js").version, inline: true },
        { name: "Node.js", value: process.version, inline: true },
        { name: "Online", value: formatDuration(ctx.client.uptime), inline: true }
      ]);
    }
  }),
  defineCommand({
    name: "invite",
    aliases: ["convite", "addbot"],
    description: "Gera o link oficial para adicionar o bot.",
    category: "Usuario",
    async execute(ctx) {
      const url = ctx.client.generateInvite({
        scopes: ["bot", "applications.commands"],
        permissions: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ModerateMembers
        ]
      });
      await ctx.info("Convide o bot", `[Clique aqui para adicionar o ${ctx.config.brandName}](${url}).`);
    }
  }),
  defineCommand({
    name: "uptime",
    aliases: ["online"],
    description: "Mostra ha quanto tempo o bot esta ligado.",
    category: "Usuario",
    async execute(ctx) {
      await ctx.info("Tempo online", `Estou online ha **${formatDuration(ctx.client.uptime)}**.`);
    }
  }),
  defineCommand({
    name: "stats",
    aliases: ["estatisticas"],
    description: "Mostra estatisticas de uso dos comandos.",
    category: "Usuario",
    async execute(ctx) {
      const stats = await ctx.db.read("commandStats");
      const ranking = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 10);
      const total = Object.values(stats).reduce((sum, value) => sum + Number(value || 0), 0);
      await ctx.info("Estatisticas do bot", `Total de comandos executados: **${total}**`, [
        { name: "Mais usados", value: ranking.length ? ranking.map(([name, count], index) => `${index + 1}. \`${name}\` - ${count}`).join("\n") : "Ainda sem dados.", inline: false }
      ]);
    }
  }),
  defineCommand({
    name: "emoji",
    aliases: ["emote"],
    description: "Mostra detalhes de um emoji ou lista os emojis do servidor.",
    category: "Usuario",
    usage: "[emoji]",
    async execute(ctx) {
      const emojiMatch = ctx.rawArgs.match(/<a?:([a-zA-Z0-9_]+):(\d{16,22})>/);
      const custom = emojiMatch ? ctx.guild.emojis.cache.get(emojiMatch[2]) : null;
      if (custom) {
        const url = custom.imageURL({ size: 512 });
        return ctx.reply({ embeds: [ctx.embed(`Emoji: ${custom.name}`, `ID: \`${custom.id}\`\n[Baixar imagem](${url})`).setImage(url)] });
      }
      const emojis = ctx.guild.emojis.cache.map((emoji) => `${emoji} \`:${emoji.name}:\``);
      await ctx.info("Emojis do servidor", emojis.slice(0, 50).join("\n") || "Este servidor nao possui emojis personalizados.");
    }
  }),
  defineCommand({
    name: "afk",
    aliases: ["ausente"],
    description: "Marca voce como ausente ate enviar outra mensagem.",
    category: "Usuario",
    usage: "[motivo]",
    cooldown: 5,
    async execute(ctx) {
      const reason = ctx.rawArgs || "Sem motivo";
      await ctx.db.update("afk", async (records) => ({
        ...records,
        [ctx.db.scopeKey(ctx.guild.id, ctx.author.id)]: {
          reason: reason.slice(0, 300),
          since: new Date().toISOString()
        }
      }));
      await ctx.success(`Agora voce esta AFK: **${reason.slice(0, 300)}**`, "Status AFK ativado");
    }
  }),
  defineCommand({
    name: "perfil",
    aliases: ["profile"],
    description: "Mostra seu perfil de economia, nivel e moderacao.",
    category: "Usuario",
    usage: "[@usuario]",
    async execute(ctx) {
      const member = await ctx.getMember() || ctx.member;
      const economy = await ctx.db.getScoped("economy", ctx.guild.id, member.id, { wallet: 0, bank: 0, inventory: [] });
      const xp = await ctx.db.getScoped("xp", ctx.guild.id, member.id, { xp: 0, messages: 0 });
      const warns = (await ctx.db.read("warns")).filter((warn) => warn.guildId === ctx.guild.id && warn.userId === member.id && !warn.removedAt);
      const level = levelFromXp(xp.xp);
      const embed = ctx.embed(`Perfil de ${member.displayName}`, `ID: \`${member.id}\``)
        .setThumbnail(member.displayAvatarURL({ size: 512 }))
        .addFields(
          { name: "Nivel", value: `${level} (${xp.xp}/${xpForLevel(level + 1)} XP)`, inline: true },
          { name: "Mensagens", value: String(xp.messages || 0), inline: true },
          { name: "Avisos", value: String(warns.length), inline: true },
          { name: "Carteira", value: formatMoney(economy.wallet, ctx.config.economy.currencyName), inline: true },
          { name: "Banco", value: formatMoney(economy.bank, ctx.config.economy.currencyName), inline: true },
          { name: "Itens", value: String((economy.inventory || []).reduce((sum, item) => sum + item.quantity, 0)), inline: true }
        );
      await ctx.reply({ embeds: [embed] });
    }
  })
];

module.exports = { commands };

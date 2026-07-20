const {
  ActionRowBuilder,
  AttachmentBuilder,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  ModalBuilder,
  Partials,
  PermissionFlagsBits,
  REST,
  Routes,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const { buildSlashCommands } = require("./commands");
const {
  brandEmbed,
  formPanel,
  formReviewControls,
  orderControls,
  storePanel,
  ticketControls,
  ticketPanel
} = require("./embeds");
const {
  cleanChannelName,
  formatDate,
  hexToInt,
  shortId,
  truncate
} = require("../utils/text");

class DiscordBot {
  constructor(db) {
    this.db = db;
    this.ready = false;
    this.started = false;
    this.lastError = "";
    this.tempVoiceChannels = new Map();
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
      ],
      partials: [Partials.Channel, Partials.Message]
    });

    this.client.once(Events.ClientReady, async () => {
      this.ready = true;
      await this.db.addEvent("bot_ready", { user: this.client.user.tag });
      await this.registerCommands().catch(async (error) => {
        this.lastError = error.message;
        await this.db.addEvent("command_register_error", { message: error.message });
      });
      console.log(`[BOT] Online como ${this.client.user.tag}`);
    });

    this.client.on(Events.InteractionCreate, (interaction) => {
      this.handleInteraction(interaction).catch(async (error) => {
        console.error("[BOT] Erro em interacao:", error);
        this.lastError = error.message;
        await this.db.addEvent("interaction_error", { message: error.message });
        await this.safeReply(interaction, "Algo deu errado. Confira o painel e os logs do bot.");
      });
    });

    this.client.on(Events.GuildMemberAdd, (member) => {
      this.handleWelcome(member).catch(async (error) => {
        this.lastError = error.message;
        await this.db.addEvent("welcome_error", { message: error.message });
      });
    });

    this.client.on(Events.MessageCreate, (message) => {
      this.handleMessage(message).catch(async (error) => {
        this.lastError = error.message;
        await this.db.addEvent("message_handler_error", { message: error.message });
      });
    });

    this.client.on(Events.MessageDelete, (message) => {
      this.handleMessageDelete(message).catch(async (error) => {
        this.lastError = error.message;
        await this.db.addEvent("message_delete_handler_error", { message: error.message });
      });
    });

    this.client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
      this.handleMessageUpdate(newMessage).catch(async (error) => {
        this.lastError = error.message;
        await this.db.addEvent("message_update_handler_error", { message: error.message });
      });
    });

    this.client.on(Events.VoiceStateUpdate, (oldState, newState) => {
      this.handleVoiceState(oldState, newState).catch(async (error) => {
        this.lastError = error.message;
        await this.db.addEvent("voice_handler_error", { message: error.message });
      });
    });
  }

  async start() {
    const token = process.env.DISCORD_TOKEN;
    if (!token || token === "coloque_o_token_do_bot_aqui") {
      this.lastError = "DISCORD_TOKEN nao configurado";
      console.warn("[BOT] DISCORD_TOKEN nao configurado. O painel vai abrir, mas o bot nao conectara.");
      return;
    }

    this.started = true;
    await this.client.login(token);
  }

  getStatus() {
    return {
      started: this.started,
      ready: this.ready,
      user: this.client.user ? this.client.user.tag : "",
      guilds: this.client.guilds.cache.size,
      lastError: this.lastError
    };
  }

  async registerCommands() {
    const config = await this.db.getConfig();
    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID || config.clientId;
    const guildId = process.env.GUILD_ID || config.guildId;

    if (!token || !clientId || !guildId) {
      throw new Error("CLIENT_ID ou GUILD_ID ausente para registrar comandos.");
    }

    const rest = new REST({ version: "10" }).setToken(token);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: buildSlashCommands()
    });
    await this.db.addEvent("commands_registered", { guildId });
  }

  async handleInteraction(interaction) {
    if (interaction.isChatInputCommand()) {
      await this.handleCommand(interaction);
      return;
    }

    if (interaction.isButton()) {
      await this.handleButton(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await this.handleModal(interaction);
    }
  }

  async handleCommand(interaction) {
    const config = await this.db.getConfig();
    if (interaction.commandName === "ajuda") {
      const prefix = (config.botIdentity && config.botIdentity.prefix) || "bs!";
      await interaction.reply({
        ephemeral: true,
        content: [
          `Comandos do ${config.brandName}:`,
          `/status - mostra o status do bot`,
          `/painel-ticket - envia o painel de ticket`,
          `/painel-formulario - envia o formulario ativo`,
          `/painel-loja - envia a loja interna`,
          `${prefix}ajuda - comandos por prefixo`
        ].join("\n")
      });
      return;
    }

    if (interaction.commandName === "ping") {
      await interaction.reply({ ephemeral: true, content: "Pong. Bot online." });
      return;
    }

    if (interaction.commandName === "status") {
      const status = this.getStatus();
      await interaction.reply({
        ephemeral: true,
        content: `Bot: ${status.ready ? "online" : "offline"} | Painel: ${config.panelBaseUrl}`
      });
      return;
    }

    const channel = interaction.options.getChannel("canal") || interaction.channel;
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ ephemeral: true, content: "Escolha um canal de texto." });
      return;
    }

    if (interaction.commandName === "painel-ticket") {
      await this.sendTicketPanel(channel.id);
      await interaction.reply({ ephemeral: true, content: `Painel de ticket enviado em ${channel}.` });
      return;
    }

    if (interaction.commandName === "painel-formulario") {
      await this.sendFormPanel(config.forms.activeFormId, channel.id);
      await interaction.reply({ ephemeral: true, content: `Painel de formulario enviado em ${channel}.` });
      return;
    }

    if (interaction.commandName === "painel-loja") {
      await this.sendStorePanel(channel.id);
      await interaction.reply({ ephemeral: true, content: `Painel da loja enviado em ${channel}.` });
    }
  }

  async handleButton(interaction) {
    const [scope, action, id] = interaction.customId.split(":");

    if (scope === "ticket" && action === "open") {
      await this.openTicket(interaction);
      return;
    }

    if (scope === "ticket" && action === "claim") {
      await this.claimTicket(interaction, id);
      return;
    }

    if (scope === "ticket" && action === "close") {
      await this.closeTicket(interaction, id);
      return;
    }

    if (scope === "ticket" && action === "delete") {
      await this.deleteTicket(interaction, id);
      return;
    }

    if (scope === "form" && action === "open") {
      await this.openForm(interaction, id);
      return;
    }

    if (scope === "form" && ["approve", "reject"].includes(action)) {
      await this.reviewForm(interaction, id, action);
      return;
    }

    if (scope === "store" && action === "buy") {
      await this.openOrder(interaction, id);
      return;
    }

    if (scope === "order" && ["paid", "deliver", "cancel"].includes(action)) {
      await this.updateOrder(interaction, id, action);
    }
  }

  async handleMessage(message) {
    if (!message.guild || message.author.bot) {
      return;
    }

    const config = await this.db.getConfig();
    if (await this.handleAutomod(message, config)) {
      return;
    }
    if (await this.handlePrefixCommand(message, config)) {
      return;
    }
    await this.handleAutoResponder(message, config);
  }

  async handleAutomod(message, config) {
    const antiLink = config.modules && config.modules["security-anti-link-invite"];
    const antiSpam = config.modules && config.modules["security-anti-spam"];
    const wordFilter = config.modules && config.modules["security-block-words-images"];
    const enabled = Boolean(
      (antiLink && antiLink.enabled) ||
      (antiSpam && antiSpam.enabled) ||
      (wordFilter && wordFilter.enabled)
    );
    if (!enabled || this.isStaff(message.member, config)) {
      return false;
    }

    const content = String(message.content || "");
    const lower = content.toLowerCase();
    const blockedWords = wordFilter && wordFilter.enabled ? (wordFilter.blockedWords || []) : [];
    const hasBlockedWord = blockedWords.some((word) => word && lower.includes(String(word).toLowerCase()));
    const hasInvite = antiLink && antiLink.enabled && antiLink.blockInvites && /discord(?:\.gg|\.com\/invite)\//i.test(content);
    const hasLink = antiLink && antiLink.enabled && antiLink.blockLinks && /(https?:\/\/|www\.)/i.test(content);
    const capsLetters = content.replace(/[^a-zA-Z]/g, "");
    const capsRatio = capsLetters.length ? capsLetters.replace(/[^A-Z]/g, "").length / capsLetters.length : 0;
    const hasCaps = antiSpam && antiSpam.enabled && antiSpam.blockCaps && capsLetters.length >= 14 && capsRatio >= 0.75;
    const attachments = [...message.attachments.values()];
    const hasImage = wordFilter && wordFilter.enabled && wordFilter.blockImages && attachments.some((item) => String(item.contentType || "").startsWith("image/"));
    const hasFile = wordFilter && wordFilter.enabled && wordFilter.blockFiles && attachments.length > 0;

    if (!hasBlockedWord && !hasInvite && !hasLink && !hasCaps && !hasImage && !hasFile) {
      return false;
    }

    await message.delete().catch(() => undefined);
    const reason = hasBlockedWord
      ? "palavra bloqueada"
      : hasInvite
        ? "convite externo"
        : hasLink
          ? "link externo"
          : hasCaps
            ? "caps lock"
            : hasImage
              ? "imagem bloqueada"
              : "arquivo bloqueado";

    const timeoutMinutes = Math.max(
      Number((antiLink && antiLink.timeoutMinutes) || 0),
      Number((antiSpam && antiSpam.timeoutMinutes) || 0),
      Number((wordFilter && wordFilter.timeoutMinutes) || 0)
    );
    const timeoutMs = timeoutMinutes * 60 * 1000;
    if (timeoutMs > 0 && message.member && message.member.moderatable) {
      await message.member.timeout(timeoutMs, `Automod Baile da Selva: ${reason}`).catch(() => undefined);
    }

    const warning = await message.channel.send({
      content: `<@${message.author.id}>, sua mensagem foi removida pelo automod: ${reason}.`
    }).catch(() => null);
    if (warning) {
      setTimeout(() => warning.delete().catch(() => undefined), 6000);
    }

    await this.db.addEvent("automod_block", { userId: message.author.id, reason });
    const logChannel = await this.fetchChannel(
      (wordFilter && wordFilter.logChannelId) ||
      (antiLink && antiLink.logChannelId) ||
      (antiSpam && antiSpam.logChannelId) ||
      config.modLogChannelId
    );
    if (logChannel) {
      await logChannel.send({
        embeds: [
          brandEmbed(config)
            .setTitle("Automod acionado")
            .addFields(
              { name: "Usuario", value: `<@${message.author.id}>`, inline: true },
              { name: "Motivo", value: reason, inline: true },
              { name: "Canal", value: `<#${message.channelId}>`, inline: true }
            )
        ]
      }).catch(() => undefined);
    }
    return true;
  }

  async handlePrefixCommand(message, config) {
    const prefix = (config.botIdentity && config.botIdentity.prefix) || "bs!";
    if (!prefix || !message.content.startsWith(prefix)) {
      return false;
    }

    const args = message.content.slice(prefix.length).trim().split(/\s+/).filter(Boolean);
    const command = String(args.shift() || "").toLowerCase();
    const commandModule = config.modules && config.modules["bot-commands"];
    const entertainment = config.modules && config.modules["entertainment-commands"];

    if (!command) {
      return false;
    }

    if ((!commandModule || !commandModule.enabled) && (!entertainment || !entertainment.enabled)) {
      return false;
    }

    const commandChannelId = (commandModule && commandModule.channelId) || (entertainment && entertainment.channelId);
    if (commandChannelId && message.channelId !== commandChannelId) {
      await message.reply(`Use comandos em <#${commandChannelId}>.`).catch(() => undefined);
      return true;
    }

    if (command === "ajuda" || command === "help") {
      await message.reply([
        `Comandos do ${config.brandName}:`,
        `${prefix}ping - testa o bot`,
        `${prefix}status - mostra o painel`,
        `${prefix}ticket - instrui a abrir ticket`,
        `${prefix}caraoucoroa - sorteia cara ou coroa`,
        `${prefix}8ball pergunta - responde uma pergunta`
      ].join("\n")).catch(() => undefined);
      return true;
    }

    if (command === "ping") {
      await message.reply("Pong. Bot online.").catch(() => undefined);
      return true;
    }

    if (command === "status") {
      await message.reply(`Bot online. Painel: ${config.panelBaseUrl}`).catch(() => undefined);
      return true;
    }

    if (command === "ticket") {
      await message.reply("Use o painel de ticket enviado pela equipe para abrir atendimento.").catch(() => undefined);
      return true;
    }

    if (command === "caraoucoroa" && entertainment && entertainment.enabled && entertainment.coinflipEnabled) {
      await message.reply(Math.random() >= 0.5 ? "Cara" : "Coroa").catch(() => undefined);
      return true;
    }

    if ((command === "8ball" || command === "bola8") && entertainment && entertainment.enabled && entertainment.eightBallEnabled) {
      const answers = [
        "Sim.",
        "Nao.",
        "Talvez.",
        "Com certeza.",
        "Melhor perguntar para a equipe."
      ];
      await message.reply(answers[Math.floor(Math.random() * answers.length)]).catch(() => undefined);
      return true;
    }

    return false;
  }

  async handleAutoResponder(message, config) {
    const community = config.modules && config.modules["community-auto-responder"];
    if (!community || !community.enabled || !community.autoResponderRules) {
      return;
    }

    const rules = String(community.autoResponderRules || "")
      .split(/\r?\n/)
      .map((line) => line.split("=>").map((part) => part.trim()))
      .filter((parts) => parts.length >= 2 && parts[0] && parts[1]);

    const content = String(message.content || "").toLowerCase();
    const rule = rules.find(([trigger]) => content.includes(trigger.toLowerCase()));
    if (!rule) {
      return;
    }

    await message.reply(rule.slice(1).join("=>").replaceAll("{user}", `<@${message.author.id}>`)).catch(() => undefined);
  }

  async handleModal(interaction) {
    const [scope, action, formId] = interaction.customId.split(":");
    if (scope !== "form" || action !== "submit") {
      return;
    }

    const config = await this.db.getConfig();
    const form = config.forms.items.find((item) => item.id === formId && item.enabled);
    if (!form) {
      await interaction.reply({ ephemeral: true, content: "Formulario nao encontrado." });
      return;
    }

    const answers = form.questions.slice(0, 5).map((question, index) => ({
      question,
      answer: interaction.fields.getTextInputValue(`q${index}`)
    }));
    const submission = {
      id: shortId("form"),
      formId,
      formName: form.name,
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      answers,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    await this.db.update("submissions", async (items) => {
      items.unshift(submission);
      return items;
    });
    await this.db.addEvent("form_submitted", { formId, userId: interaction.user.id });

    await interaction.reply({
      ephemeral: true,
      content: "Formulario enviado. A equipe vai analisar sua resposta."
    });

    if (config.forms.reviewChannelId) {
      const channel = await this.fetchChannel(config.forms.reviewChannelId);
      if (channel) {
        const embed = brandEmbed(config)
          .setTitle(`Formulario: ${form.name}`)
          .setDescription(`Enviado por <@${interaction.user.id}>`)
          .addFields(
            answers.map((answer) => ({
              name: truncate(answer.question, 256),
              value: truncate(answer.answer, 1000),
              inline: false
            }))
          );
        await channel.send({ embeds: [embed], components: formReviewControls(submission.id) });
      }
    }
  }

  async sendTicketPanel(channelId) {
    const config = await this.db.getConfig();
    const channel = await this.fetchChannel(channelId || config.ticket.panelChannelId);
    if (!channel) {
      throw new Error("Canal do painel de ticket nao encontrado.");
    }
    const message = await channel.send(ticketPanel(config));
    await this.db.setConfig({
      ticket: {
        panelChannelId: channel.id,
        panelMessageId: message.id,
        panelMessageChannelId: channel.id,
        panelLastSentAt: new Date().toISOString()
      }
    });
    await this.db.addEvent("ticket_panel_sent", { channelId: channel.id, messageId: message.id });
  }

  async handleMessageDelete(message) {
    const config = await this.db.getConfig();
    if (!config.ticket.protectPanelMessage || !config.ticket.panelMessageId) {
      return;
    }
    if (message.id !== config.ticket.panelMessageId) {
      return;
    }

    await this.restoreTicketPanel(
      message.channelId || (message.channel && message.channel.id) || config.ticket.panelMessageChannelId,
      "ticket_panel_deleted"
    );
  }

  async handleMessageUpdate(message) {
    const config = await this.db.getConfig();
    if (!config.ticket.protectPanelMessage || !config.ticket.panelMessageId) {
      return;
    }
    if (!message || message.id !== config.ticket.panelMessageId) {
      return;
    }

    const fetched = message.partial ? await message.fetch().catch(() => null) : message;
    if (!fetched) {
      return;
    }
    if (fetched.author && this.client.user && fetched.author.id !== this.client.user.id) {
      return;
    }
    if (fetched.embeds && fetched.embeds.length > 0 && fetched.components && fetched.components.length > 0) {
      return;
    }

    await fetched.edit(ticketPanel(config)).catch(async () => {
      await this.restoreTicketPanel(fetched.channelId || config.ticket.panelMessageChannelId, "ticket_panel_suppressed");
    });
    await this.db.addEvent("ticket_panel_repaired", { channelId: fetched.channelId, messageId: fetched.id });
  }

  async restoreTicketPanel(channelId, eventType) {
    const config = await this.db.getConfig();
    const channel = await this.fetchChannel(channelId || config.ticket.panelMessageChannelId || config.ticket.panelChannelId);
    if (!channel) {
      return;
    }

    const message = await channel.send(ticketPanel(config));
    await this.db.setConfig({
      ticket: {
        panelMessageId: message.id,
        panelMessageChannelId: channel.id,
        panelLastSentAt: new Date().toISOString()
      }
    });
    await this.db.addEvent(eventType, { channelId: channel.id, messageId: message.id });
  }

  async sendFormPanel(formId, channelId) {
    const config = await this.db.getConfig();
    const form = config.forms.items.find((item) => item.id === formId && item.enabled);
    if (!form) {
      throw new Error("Formulario ativo nao encontrado.");
    }
    const channel = await this.fetchChannel(channelId || config.forms.panelChannelId);
    if (!channel) {
      throw new Error("Canal do painel de formulario nao encontrado.");
    }
    await channel.send(formPanel(config, form));
    await this.db.addEvent("form_panel_sent", { channelId: channel.id, formId });
  }

  async sendStorePanel(channelId) {
    const config = await this.db.getConfig();
    const channel = await this.fetchChannel(channelId || config.store.panelChannelId);
    if (!channel) {
      throw new Error("Canal do painel da loja nao encontrado.");
    }
    await channel.send(storePanel(config));
    await this.db.addEvent("store_panel_sent", { channelId: channel.id });
  }

  async openTicket(interaction) {
    const config = await this.db.getConfig();
    if (!config.ticket.enabled) {
      await interaction.reply({ ephemeral: true, content: "Tickets estao desativados no momento." });
      return;
    }

    const tickets = await this.db.read("tickets");
    const existing = tickets.find(
      (ticket) => ticket.userId === interaction.user.id && ticket.status === "open"
    );
    if (existing && !config.ticket.allowMultipleTickets) {
      await interaction.reply({
        ephemeral: true,
        content: `Voce ja tem um ticket aberto: <#${existing.channelId}>`
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild || await this.fetchGuild();
    const ticketId = shortId("ticket");
    const channelName = cleanChannelName(
      String(config.ticket.ticketNamePattern || "ticket-{user}-{id}")
        .replaceAll("{user}", interaction.user.username)
        .replaceAll("{id}", ticketId.slice(-4))
    );
    const supportRoleIds = [...new Set([...(config.ticket.supportRoleIds || []), ...(config.staffRoleIds || [])])];
    const overwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles
        ]
      },
      {
        id: this.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles
        ]
      }
    ];

    for (const roleId of supportRoleIds) {
      overwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages
        ]
      });
    }

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: config.ticket.categoryId || undefined,
      permissionOverwrites: overwrites,
      topic: `Ticket ${ticketId} | Usuario ${interaction.user.id}`
    });

    const ticket = {
      id: ticketId,
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      channelId: channel.id,
      status: "open",
      claimedBy: "",
      createdAt: new Date().toISOString()
    };

    await this.db.update("tickets", async (items) => {
      items.unshift(ticket);
      return items;
    });
    await this.db.addEvent("ticket_opened", { ticketId, userId: interaction.user.id });

    const embed = brandEmbed(config)
      .setColor(hexToInt(config.ticket.panelColor || config.accentColor))
      .setTitle(config.ticket.openedTitle || `Ticket de ${interaction.user.username}`)
      .setDescription(config.ticket.openedMessage)
      .addFields(
        { name: "Usuario", value: `<@${interaction.user.id}>`, inline: true },
        { name: "Status", value: "Aberto", inline: true },
        { name: "Ticket", value: ticketId, inline: true }
      )
      .setFooter({ text: config.ticket.openedFooter || config.ticket.panelFooter || config.brandName });

    await channel.send({
      content: [
        `<@${interaction.user.id}>`,
        config.ticket.mentionSupport ? supportRoleIds.map((roleId) => `<@&${roleId}>`).join(" ") : ""
      ].filter(Boolean).join(" ").trim(),
      embeds: [embed],
      components: ticketControls(ticketId)
    });
    await interaction.editReply(`Ticket criado: <#${channel.id}>`);
  }

  async claimTicket(interaction, ticketId) {
    const config = await this.db.getConfig();
    if (!this.isStaff(interaction.member, config)) {
      await interaction.reply({ ephemeral: true, content: "Somente a equipe pode assumir tickets." });
      return;
    }

    await this.db.update("tickets", async (tickets) => tickets.map((ticket) => (
      ticket.id === ticketId
        ? { ...ticket, claimedBy: interaction.user.id, claimedAt: new Date().toISOString() }
        : ticket
    )));
    await this.db.addEvent("ticket_claimed", { ticketId, userId: interaction.user.id });
    await interaction.reply({ content: `Ticket assumido por <@${interaction.user.id}>.` });
  }

  async closeTicket(interaction, ticketId) {
    const config = await this.db.getConfig();
    const tickets = await this.db.read("tickets");
    const ticket = tickets.find((item) => item.id === ticketId);
    if (!ticket) {
      await interaction.reply({ ephemeral: true, content: "Ticket nao encontrado." });
      return;
    }

    const canClose = this.isStaff(interaction.member, config) || ticket.userId === interaction.user.id;
    if (!canClose) {
      await interaction.reply({ ephemeral: true, content: "Voce nao pode fechar este ticket." });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const channel = interaction.channel;
    const transcript = await this.buildTranscript(channel, ticket);
    await this.db.update("tickets", async (items) => items.map((item) => (
      item.id === ticketId
        ? {
            ...item,
            status: "closed",
            closedAt: new Date().toISOString(),
            closedBy: interaction.user.id
          }
        : item
    )));
    await this.db.addEvent("ticket_closed", { ticketId, userId: interaction.user.id });

    await this.sendTicketLog(config, ticket, transcript, interaction.user.id);

    if (channel && channel.permissionOverwrites) {
      await channel.permissionOverwrites.edit(ticket.userId, {
        SendMessages: false
      }).catch(() => undefined);
    }

    await interaction.editReply("Ticket fechado e registrado.");
    await interaction.message.edit({
      components: ticketControls(ticketId, true)
    }).catch(() => undefined);
    await channel.send({
      embeds: [
        brandEmbed(config)
          .setTitle("Ticket fechado")
          .setDescription(`Fechado por <@${interaction.user.id}>.`)
      ],
      components: ticketControls(ticketId, true)
    }).catch(() => undefined);

    if (config.ticket.deleteClosedTickets) {
      setTimeout(() => channel.delete("Ticket fechado automaticamente").catch(() => undefined), 5000);
    }
  }

  async deleteTicket(interaction, ticketId) {
    const config = await this.db.getConfig();
    if (!this.isStaff(interaction.member, config)) {
      await interaction.reply({ ephemeral: true, content: "Somente a equipe pode apagar tickets." });
      return;
    }

    await this.db.update("tickets", async (tickets) => tickets.map((ticket) => (
      ticket.id === ticketId
        ? { ...ticket, status: "deleted", deletedAt: new Date().toISOString(), deletedBy: interaction.user.id }
        : ticket
    )));
    await this.db.addEvent("ticket_deleted", { ticketId, userId: interaction.user.id });
    await interaction.reply({ ephemeral: true, content: "Apagando canal..." });
    setTimeout(() => interaction.channel.delete("Ticket apagado pela equipe").catch(() => undefined), 2500);
  }

  async openForm(interaction, formId) {
    const config = await this.db.getConfig();
    const form = config.forms.items.find((item) => item.id === formId && item.enabled);
    if (!form) {
      await interaction.reply({ ephemeral: true, content: "Formulario indisponivel." });
      return;
    }

    const questions = form.questions.slice(0, 5);
    if (!questions.length) {
      await interaction.reply({ ephemeral: true, content: "Este formulario ainda nao tem perguntas." });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId(`form:submit:${form.id}`)
      .setTitle(truncate(form.title || form.name, 45));

    questions.forEach((question, index) => {
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(`q${index}`)
            .setLabel(truncate(question, 45))
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(900)
        )
      );
    });

    await interaction.showModal(modal);
  }

  async reviewForm(interaction, submissionId, action) {
    const config = await this.db.getConfig();
    if (!this.isStaff(interaction.member, config)) {
      await interaction.reply({ ephemeral: true, content: "Somente a equipe pode revisar formularios." });
      return;
    }

    const status = action === "approve" ? "approved" : "rejected";
    let submission;
    await this.db.update("submissions", async (items) => items.map((item) => {
      if (item.id !== submissionId) {
        return item;
      }
      submission = {
        ...item,
        status,
        reviewedBy: interaction.user.id,
        reviewedAt: new Date().toISOString()
      };
      return submission;
    }));

    if (!submission) {
      await interaction.reply({ ephemeral: true, content: "Formulario nao encontrado." });
      return;
    }

    await this.db.addEvent("form_reviewed", { submissionId, status, userId: interaction.user.id });
    await interaction.update({
      components: formReviewControls(submissionId, true)
    }).catch(() => undefined);
    await interaction.followUp({
      ephemeral: true,
      content: status === "approved" ? "Formulario aprovado." : "Formulario reprovado."
    }).catch(() => undefined);

    const user = await this.client.users.fetch(submission.userId).catch(() => null);
    if (user) {
      await user.send(
        status === "approved"
          ? `Seu formulario em ${config.brandName} foi aprovado.`
          : `Seu formulario em ${config.brandName} foi reprovado.`
      ).catch(() => undefined);
    }
  }

  async openOrder(interaction, productId) {
    const config = await this.db.getConfig();
    const product = (config.store.products || []).find((item) => item.id === productId && item.enabled);
    if (!config.store.enabled || !product) {
      await interaction.reply({ ephemeral: true, content: "Produto indisponivel." });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild || await this.fetchGuild();
    const orderId = shortId("order");
    const supportRoleIds = [...new Set([...(config.staffRoleIds || []), ...(config.ticket.supportRoleIds || [])])];
    const overwrites = [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles
        ]
      },
      {
        id: this.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles
        ]
      }
    ];
    for (const roleId of supportRoleIds) {
      overwrites.push({
        id: roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages
        ]
      });
    }

    const channel = await guild.channels.create({
      name: cleanChannelName(`pedido-${product.name}-${interaction.user.username}`),
      type: ChannelType.GuildText,
      parent: config.store.orderCategoryId || undefined,
      permissionOverwrites: overwrites,
      topic: `Pedido ${orderId} | Produto ${product.id} | Usuario ${interaction.user.id}`
    });

    const order = {
      id: orderId,
      userId: interaction.user.id,
      userTag: interaction.user.tag,
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      channelId: channel.id,
      status: "open",
      createdAt: new Date().toISOString()
    };
    await this.db.update("orders", async (orders) => {
      orders.unshift(order);
      return orders;
    });
    await this.db.addEvent("order_opened", { orderId, productId: product.id, userId: interaction.user.id });

    const embed = brandEmbed(config)
      .setTitle(`Pedido: ${product.name}`)
      .setDescription(product.description || "Pedido aberto.")
      .addFields(
        { name: "Cliente", value: `<@${interaction.user.id}>`, inline: true },
        { name: "Detalhe", value: [config.store.currency, product.price].filter(Boolean).join(" ") || "Interno", inline: true },
        { name: "Orientacao", value: truncate(config.store.paymentInstructions, 1000), inline: false }
      );

    await channel.send({
      content: `<@${interaction.user.id}> ${supportRoleIds.map((roleId) => `<@&${roleId}>`).join(" ")}`.trim(),
      embeds: [embed],
      components: orderControls(orderId)
    });
    await interaction.editReply(`Pedido criado: <#${channel.id}>`);
  }

  async updateOrder(interaction, orderId, action) {
    const config = await this.db.getConfig();
    if (!this.isStaff(interaction.member, config)) {
      await interaction.reply({ ephemeral: true, content: "Somente a equipe pode atualizar pedidos." });
      return;
    }

    const orders = await this.db.read("orders");
    const order = orders.find((item) => item.id === orderId);
    if (!order) {
      await interaction.reply({ ephemeral: true, content: "Pedido nao encontrado." });
      return;
    }

    const product = (config.store.products || []).find((item) => item.id === order.productId) || {};
    const statusByAction = {
      paid: "checked",
      deliver: "delivered",
      cancel: "cancelled"
    };
    const status = statusByAction[action];

    await this.db.update("orders", async (items) => items.map((item) => (
      item.id === orderId
        ? {
            ...item,
            status,
            updatedAt: new Date().toISOString(),
            updatedBy: interaction.user.id
          }
        : item
    )));
    await this.db.addEvent("order_updated", { orderId, status, userId: interaction.user.id });

    if (action === "deliver") {
      await this.deliverProduct(interaction, order, product, config);
      await interaction.update({ components: orderControls(orderId, true) }).catch(() => undefined);
      await interaction.followUp({ ephemeral: true, content: "Pedido entregue." }).catch(() => undefined);
      return;
    }

    if (action === "cancel") {
      await interaction.update({ components: orderControls(orderId, true) }).catch(() => undefined);
      await interaction.followUp({ ephemeral: true, content: "Pedido cancelado." }).catch(() => undefined);
      return;
    }

    await interaction.reply({ content: "Pedido marcado como conferido." });
  }

  async handleVoiceState(oldState, newState) {
    const config = await this.db.getConfig();
    const movcall = config.modules && config.modules["movcall-temp"];
    if (!movcall || !movcall.enabled || !movcall.creatorChannelId) {
      return;
    }

    if (newState.channelId === movcall.creatorChannelId && newState.member) {
      const guild = newState.guild;
      const name = String(movcall.channelNameTemplate || "Call de {user}")
        .replaceAll("{user}", newState.member.displayName || newState.member.user.username);
      const channel = await guild.channels.create({
        name: name.slice(0, 90),
        type: ChannelType.GuildVoice,
        parent: movcall.categoryId || newState.channel.parentId || undefined,
        userLimit: Number(movcall.defaultUserLimit || 0) || undefined
      });
      this.tempVoiceChannels.set(channel.id, newState.member.id);
      await newState.setChannel(channel).catch(() => undefined);
      await this.db.addEvent("temp_voice_created", { channelId: channel.id, ownerId: newState.member.id });
    }

    if (oldState.channelId && this.tempVoiceChannels.has(oldState.channelId)) {
      const channel = oldState.guild.channels.cache.get(oldState.channelId);
      if (channel && channel.members.size === 0) {
        this.tempVoiceChannels.delete(oldState.channelId);
        await channel.delete("Call temporaria vazia").catch(() => undefined);
        await this.db.addEvent("temp_voice_deleted", { channelId: oldState.channelId });
      }
    }
  }

  async deliverProduct(interaction, order, product, config) {
    const guild = interaction.guild || await this.fetchGuild();
    if (product.roleId) {
      const member = await guild.members.fetch(order.userId).catch(() => null);
      if (member) {
        await member.roles.add(product.roleId).catch(async (error) => {
          await this.db.addEvent("role_delivery_error", { orderId: order.id, message: error.message });
        });
      }
    }

    const message = product.deliveryText || `Seu pedido ${product.name} foi entregue.`;
    await interaction.channel.send({
      content: `<@${order.userId}> ${message}`
    }).catch(() => undefined);

    const logChannel = await this.fetchChannel(config.store.orderLogChannelId);
    if (logChannel) {
      await logChannel.send({
        embeds: [
          brandEmbed(config)
            .setTitle("Pedido entregue")
            .addFields(
              { name: "Pedido", value: order.id, inline: true },
              { name: "Produto", value: order.productName, inline: true },
              { name: "Cliente", value: `<@${order.userId}>`, inline: true }
            )
        ]
      }).catch(() => undefined);
    }
  }

  async buildTranscript(channel, ticket) {
    if (!channel || !channel.messages) {
      return Buffer.from("Transcript indisponivel.", "utf8");
    }

    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages) {
      return Buffer.from("Nao foi possivel buscar mensagens do ticket.", "utf8");
    }

    const lines = [...messages.values()]
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map((message) => {
        const content = message.content || "[sem texto]";
        return `[${formatDate(message.createdAt)}] ${message.author.tag}: ${content}`;
      });

    const header = [
      `Ticket: ${ticket.id}`,
      `Usuario: ${ticket.userTag} (${ticket.userId})`,
      `Canal: ${channel.name} (${channel.id})`,
      ""
    ];
    return Buffer.from([...header, ...lines].join("\n"), "utf8");
  }

  async sendTicketLog(config, ticket, transcript, closedBy) {
    const channel = await this.fetchChannel(config.ticket.transcriptChannelId || config.ticket.logChannelId);
    if (!channel) {
      return;
    }

    const file = new AttachmentBuilder(transcript, {
      name: `${ticket.id}.txt`
    });
    await channel.send({
      embeds: [
        brandEmbed(config)
          .setTitle("Ticket fechado")
          .addFields(
            { name: "Ticket", value: ticket.id, inline: true },
            { name: "Usuario", value: `<@${ticket.userId}>`, inline: true },
            { name: "Fechado por", value: `<@${closedBy}>`, inline: true }
          )
      ],
      files: [file]
    }).catch(() => undefined);
  }

  async handleWelcome(member) {
    const config = await this.db.getConfig();
    if (!config.welcome.enabled) {
      return;
    }

    if (config.welcome.autoRoleId) {
      await member.roles.add(config.welcome.autoRoleId).catch(async (error) => {
        await this.db.addEvent("autorole_error", { message: error.message, userId: member.id });
      });
    }

    if (config.welcome.channelId) {
      const channel = await this.fetchChannel(config.welcome.channelId);
      if (channel) {
        const message = String(config.welcome.message || "")
          .replaceAll("{user}", `<@${member.id}>`)
          .replaceAll("{server}", member.guild.name);
        await channel.send({ content: message }).catch(() => undefined);
      }
    }
  }

  isStaff(member, config) {
    if (!member) {
      return false;
    }
    if (member.permissions && member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return true;
    }
    const ids = new Set([
      ...(config.staffRoleIds || []),
      ...((config.ticket && config.ticket.supportRoleIds) || [])
    ]);
    return member.roles.cache.some((role) => ids.has(role.id));
  }

  async fetchGuild() {
    const config = await this.db.getConfig();
    const guildId = process.env.GUILD_ID || config.guildId;
    if (!guildId) {
      throw new Error("GUILD_ID nao configurado.");
    }
    return this.client.guilds.fetch(guildId);
  }

  async fetchChannel(channelId) {
    if (!channelId || !this.ready) {
      return null;
    }
    return this.client.channels.fetch(channelId).catch(() => null);
  }

  async safeReply(interaction, content) {
    if (!interaction || !interaction.isRepliable()) {
      return;
    }
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ ephemeral: true, content }).catch(() => undefined);
    } else {
      await interaction.reply({ ephemeral: true, content }).catch(() => undefined);
    }
  }
}

module.exports = { DiscordBot };

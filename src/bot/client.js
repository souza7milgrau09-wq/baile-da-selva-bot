const {
  ActionRowBuilder,
  AuditLogEvent,
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
const { MusicService } = require("./music");
const { PrefixCommandManager } = require("./prefix/manager");
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
const { escapeHtml } = require("./prefix/utils");

class DiscordBot {
  constructor(db) {
    this.db = db;
    this.ready = false;
    this.started = false;
    this.lastError = "";
    this.tempVoiceChannels = new Map();
    this.spamTracker = new Map();
    this.joinTracker = new Map();
    this.securityActions = new Map();
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
      ],
      partials: [Partials.Channel, Partials.Message]
    });
    this.music = new MusicService(this.client, this.db);
    this.prefixCommands = new PrefixCommandManager(this);
    this.prefixLoadPromise = this.prefixCommands.load().catch((error) => {
      this.lastError = error.message;
      console.error("[COMANDOS] Falha ao carregar:", error);
      return 0;
    });

    this.client.once(Events.ClientReady, async () => {
      this.ready = true;
      const prefixCount = await this.prefixLoadPromise;
      this.prefixCommands.startReminderScheduler();
      await this.db.addEvent("bot_ready", { user: this.client.user.tag });
      await this.registerCommands().catch(async (error) => {
        this.lastError = error.message;
        await this.db.addEvent("command_register_error", { message: error.message });
      });
      console.log(`[BOT] Online como ${this.client.user.tag} | ${prefixCount} comandos por prefixo`);
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
      Promise.all([this.handleWelcome(member), this.handleSecurityJoin(member)]).catch(async (error) => {
        this.lastError = error.message;
        await this.db.addEvent("welcome_error", { message: error.message });
      });
    });

    this.client.on(Events.GuildMemberRemove, (member) => {
      this.handleMemberRemove(member).catch((error) => this.recordHandlerError("member_remove_error", error));
    });

    this.client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
      this.handleMemberUpdate(oldMember, newMember).catch((error) => this.recordHandlerError("member_update_error", error));
    });

    this.client.on(Events.GuildBanAdd, (ban) => {
      this.handleGuildBanAdd(ban).catch((error) => this.recordHandlerError("ban_log_error", error));
    });

    this.client.on(Events.ChannelCreate, (channel) => {
      this.handleStructureCreate(channel, "channel").catch((error) => this.recordHandlerError("channel_create_security_error", error));
    });

    this.client.on(Events.ChannelDelete, (channel) => {
      this.handleStructureDelete(channel, "channel").catch((error) => this.recordHandlerError("channel_delete_security_error", error));
    });

    this.client.on(Events.GuildRoleCreate, (role) => {
      this.handleStructureCreate(role, "role").catch((error) => this.recordHandlerError("role_create_security_error", error));
    });

    this.client.on(Events.GuildRoleDelete, (role) => {
      this.handleStructureDelete(role, "role").catch((error) => this.recordHandlerError("role_delete_security_error", error));
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
      this.handleMessageUpdate(oldMessage, newMessage).catch(async (error) => {
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
    if (await this.prefixCommands.handleInteraction(interaction)) {
      return;
    }

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
      const prefix = (config.botIdentity && config.botIdentity.prefix) || "!";
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
    await this.prefixCommands.observeMessage(message, config);
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
    const whitelist = enabled ? await this.db.read("whitelist") : [];
    if (!enabled || this.isStaff(message.member, config) || whitelist.some((entry) => (entry.userId || entry) === message.author.id)) {
      return false;
    }

    const content = String(message.content || "");
    const lower = content.toLowerCase();
    const blockedWords = wordFilter && wordFilter.enabled ? (wordFilter.blockedWords || []) : [];
    const hasBlockedWord = blockedWords.some((word) => word && lower.includes(String(word).toLowerCase()));
    const allowedDomains = new Set(((antiLink && antiLink.allowedDomains) || []).map((domain) => String(domain).toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "")));
    const urls = content.match(/(?:https?:\/\/|www\.)[^\s]+/gi) || [];
    const hasBlockedUrl = urls.some((rawUrl) => {
      try {
        const parsed = new URL(rawUrl.startsWith("www.") ? `https://${rawUrl}` : rawUrl);
        return ![...allowedDomains].some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
      } catch {
        return true;
      }
    });
    const hasInvite = antiLink && antiLink.enabled && antiLink.blockInvites && /discord(?:\.gg|\.com\/invite)\//i.test(content);
    const hasLink = antiLink && antiLink.enabled && antiLink.blockLinks && hasBlockedUrl;
    const capsLetters = content.replace(/[^a-zA-Z]/g, "");
    const capsRatio = capsLetters.length ? capsLetters.replace(/[^A-Z]/g, "").length / capsLetters.length : 0;
    const hasCaps = antiSpam && antiSpam.enabled && antiSpam.blockCaps && capsLetters.length >= 14 && capsRatio >= 0.75;
    const attachments = [...message.attachments.values()];
    const hasImage = wordFilter && wordFilter.enabled && wordFilter.blockImages && attachments.some((item) => String(item.contentType || "").startsWith("image/"));
    const hasFile = wordFilter && wordFilter.enabled && wordFilter.blockFiles && attachments.length > 0;
    let hasSpam = false;
    if (antiSpam && antiSpam.enabled) {
      const key = `${message.guild.id}:${message.author.id}`;
      const windowMs = Math.max(3, Number(antiSpam.secondsWindow || 8)) * 1000;
      const limit = Math.max(3, Number(antiSpam.messageLimit || 6));
      const recent = (this.spamTracker.get(key) || []).filter((item) => item.at > Date.now() - windowMs);
      recent.push({ at: Date.now(), content: lower.trim() });
      this.spamTracker.set(key, recent);
      const repeated = recent.filter((item) => item.content && item.content === lower.trim()).length;
      hasSpam = recent.length >= limit || repeated >= Math.min(4, limit);
    }

    if (!hasBlockedWord && !hasInvite && !hasLink && !hasCaps && !hasImage && !hasFile && !hasSpam) {
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
              : hasFile
                ? "arquivo bloqueado"
                : "spam ou flood";

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
    await this.prefixLoadPromise;
    return this.prefixCommands.handleMessage(message, config);
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
    if (message && message.guild && message.author && !message.author.bot) {
      await this.db.update("snipes", async (records) => ({
        ...records,
        [message.channelId]: {
          authorId: message.author.id,
          content: message.content || "",
          attachmentUrl: message.attachments && message.attachments.first() ? message.attachments.first().url : "",
          deletedAt: new Date().toISOString()
        }
      }));
      await this.sendConfiguredLog(message.guild, "Mensagem apagada", [
        { name: "Autor", value: `<@${message.author.id}>`, inline: true },
        { name: "Canal", value: `<#${message.channelId}>`, inline: true },
        { name: "Conteudo", value: truncate(message.content || "[sem texto]", 1000), inline: false }
      ]);
      await this.db.addEvent("message_deleted", { userId: message.author.id, channelId: message.channelId });
    }

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

  async handleMessageUpdate(oldMessage, message) {
    if (
      oldMessage && message && message.guild && message.author && !message.author.bot &&
      oldMessage.content !== message.content
    ) {
      await this.db.update("editsnipes", async (records) => ({
        ...records,
        [message.channelId]: {
          authorId: message.author.id,
          before: oldMessage.content || "",
          after: message.content || "",
          editedAt: new Date().toISOString()
        }
      }));
      await this.sendConfiguredLog(message.guild, "Mensagem editada", [
        { name: "Autor", value: `<@${message.author.id}>`, inline: true },
        { name: "Canal", value: `<#${message.channelId}>`, inline: true },
        { name: "Antes", value: truncate(oldMessage.content || "[sem texto]", 900), inline: false },
        { name: "Depois", value: truncate(message.content || "[sem texto]", 900), inline: false }
      ]);
      await this.db.addEvent("message_edited", { userId: message.author.id, channelId: message.channelId });
    }

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
      guildId: guild.id,
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
    if (oldState.channelId !== newState.channelId && newState.guild) {
      await this.sendConfiguredLog(newState.guild, "Atualizacao de voz", [
        { name: "Membro", value: `<@${newState.id}>`, inline: true },
        { name: "Saiu de", value: oldState.channelId ? `<#${oldState.channelId}>` : "Nenhum", inline: true },
        { name: "Entrou em", value: newState.channelId ? `<#${newState.channelId}>` : "Nenhum", inline: true }
      ]);
      await this.db.addEvent("voice_update", { userId: newState.id, oldChannelId: oldState.channelId, newChannelId: newState.channelId });
    }
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
      return Buffer.from("<!doctype html><meta charset=\"utf-8\"><p>Transcript indisponivel.</p>", "utf8");
    }

    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages) {
      return Buffer.from("<!doctype html><meta charset=\"utf-8\"><p>Nao foi possivel buscar mensagens do ticket.</p>", "utf8");
    }

    const lines = [...messages.values()]
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map((message) => {
        const content = escapeHtml(message.content || "[sem texto]").replaceAll("\n", "<br>");
        const attachments = [...message.attachments.values()].map((item) => `<a href="${escapeHtml(item.url)}">${escapeHtml(item.name || "anexo")}</a>`).join(" ");
        const embeds = message.embeds.length ? `<span class="tag">${message.embeds.length} embed(s)</span>` : "";
        return `<article><img src="${escapeHtml(message.author.displayAvatarURL({ size: 64 }))}" alt=""><div><header><strong>${escapeHtml(message.author.tag)}</strong><time>${escapeHtml(formatDate(message.createdAt))}</time></header><p>${content}</p>${attachments ? `<p>${attachments}</p>` : ""}${embeds}</div></article>`;
      });
    const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Transcript ${escapeHtml(ticket.id)}</title>
<style>body{margin:0;background:#101211;color:#eef2ef;font:15px Arial,sans-serif}main{max-width:900px;margin:auto;padding:32px 20px}h1{margin:0 0 8px;color:#24c46b}.meta{color:#aeb8b1;margin-bottom:28px}article{display:flex;gap:12px;padding:14px 0;border-top:1px solid #29302b}img{width:42px;height:42px;border-radius:50%}header{display:flex;gap:10px;align-items:baseline}time{color:#89948c;font-size:12px}p{margin:6px 0;line-height:1.45;overflow-wrap:anywhere}a{color:#58d68d}.tag{display:inline-block;padding:3px 7px;background:#29302b;border-radius:4px;color:#bfc9c2}</style></head>
<body><main><h1>Transcript do ticket</h1><div class="meta">Ticket: ${escapeHtml(ticket.id)}<br>Usuario: ${escapeHtml(ticket.userTag)} (${escapeHtml(ticket.userId)})<br>Canal: ${escapeHtml(channel.name)} (${escapeHtml(channel.id)})</div>${lines.join("")}<div class="meta">Gerado em ${escapeHtml(formatDate(new Date()))} pelo Baile da Selva.</div></main></body></html>`;
    return Buffer.from(html, "utf8");
  }

  async sendTicketLog(config, ticket, transcript, closedBy) {
    const channel = await this.fetchChannel(config.ticket.transcriptChannelId || config.ticket.logChannelId);
    if (!channel) {
      return;
    }

    const file = new AttachmentBuilder(transcript, {
      name: `${ticket.id}.html`
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

  async recordHandlerError(type, error) {
    this.lastError = error.message;
    console.error(`[BOT] ${type}:`, error);
    await this.db.addEvent(type, { message: error.message }).catch(() => undefined);
  }

  async sendConfiguredLog(guild, title, fields, preferredChannelId = "") {
    const config = await this.db.getConfig();
    const moduleLogs = config.modules && config.modules["server-logs"];
    if (!config.logs.enabled && !(moduleLogs && moduleLogs.enabled)) return;
    const channelId = preferredChannelId || config.logs.channelId || moduleLogs.logChannelId || moduleLogs.channelId || config.modLogChannelId;
    const channel = channelId ? await guild.channels.fetch(channelId).catch(() => null) : null;
    if (!channel || !channel.isTextBased()) return;
    await channel.send({ embeds: [brandEmbed(config).setTitle(title).addFields(fields)] }).catch(() => undefined);
  }

  async handleMemberRemove(member) {
    const config = await this.db.getConfig();
    if (config.leave.enabled && config.leave.channelId) {
      const channel = await member.guild.channels.fetch(config.leave.channelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        const content = String(config.leave.message || "{user} saiu do {server}.")
          .replaceAll("{user}", member.user.tag)
          .replaceAll("{server}", member.guild.name);
        await channel.send({ content, allowedMentions: { parse: [] } }).catch(() => undefined);
      }
    }
    await this.sendConfiguredLog(member.guild, "Membro saiu", [
      { name: "Usuario", value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
      { name: "Entrou", value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Desconhecido", inline: true }
    ]);
    await this.db.addEvent("member_leave", { userId: member.id, userTag: member.user.tag });
  }

  async handleMemberUpdate(oldMember, newMember) {
    const fields = [{ name: "Membro", value: `<@${newMember.id}>`, inline: true }];
    let title = "Membro atualizado";
    if (oldMember.nickname !== newMember.nickname) {
      title = "Apelido alterado";
      fields.push(
        { name: "Antes", value: oldMember.nickname || oldMember.user.username, inline: true },
        { name: "Depois", value: newMember.nickname || newMember.user.username, inline: true }
      );
      await this.db.addEvent("nickname_changed", { userId: newMember.id, before: oldMember.nickname, after: newMember.nickname });
    } else {
      const added = newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id));
      const removed = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id));
      if (added.size || removed.size) {
        title = "Cargos alterados";
        fields.push(
          { name: "Adicionados", value: added.size ? added.map((role) => role.toString()).join(" ") : "Nenhum", inline: false },
          { name: "Removidos", value: removed.size ? removed.map((role) => role.toString()).join(" ") : "Nenhum", inline: false }
        );
        await this.db.addEvent("member_roles_changed", { userId: newMember.id, added: [...added.keys()], removed: [...removed.keys()] });
      } else if (oldMember.communicationDisabledUntilTimestamp !== newMember.communicationDisabledUntilTimestamp) {
        title = newMember.communicationDisabledUntilTimestamp ? "Timeout aplicado" : "Timeout removido";
        fields.push({ name: "Ate", value: newMember.communicationDisabledUntilTimestamp ? `<t:${Math.floor(newMember.communicationDisabledUntilTimestamp / 1000)}:F>` : "Removido", inline: true });
        await this.db.addEvent("timeout_changed", { userId: newMember.id, until: newMember.communicationDisabledUntilTimestamp });
      } else {
        return;
      }
    }
    await this.sendConfiguredLog(newMember.guild, title, fields, (await this.db.getConfig()).logs.moderationChannelId);
  }

  async handleGuildBanAdd(ban) {
    await this.sendConfiguredLog(ban.guild, "Membro banido", [
      { name: "Usuario", value: `${ban.user.tag} (\`${ban.user.id}\`)`, inline: true },
      { name: "Motivo", value: ban.reason || "Nao informado", inline: false }
    ]);
    await this.db.addEvent("guild_ban_add", { userId: ban.user.id, reason: ban.reason || "" });
  }

  async handleSecurityJoin(member) {
    const config = await this.db.getConfig();
    const antiBot = config.modules && config.modules["security-anti-bot"];
    const antiFake = config.modules && config.modules["security-anti-fake"];
    const antiRaid = config.modules && config.modules["security-anti-raid"];
    const whitelist = await this.db.read("whitelist");
    const trusted = whitelist.some((entry) => (entry.userId || entry) === member.id);

    if (!trusted && member.user.bot && antiBot && antiBot.enabled && antiBot.kickUnknownBots && member.kickable) {
      await member.kick("Anti Bot: bot nao autorizado").catch(() => undefined);
      await this.db.addEvent("anti_bot_kick", { userId: member.id });
      return;
    }
    if (!trusted && !member.user.bot && antiFake && antiFake.enabled) {
      const ageHours = (Date.now() - member.user.createdTimestamp) / 3600000;
      if (ageHours < Number(antiFake.minimumAccountAgeHours || 0) && member.kickable) {
        await member.kick(`Anti Fake: conta com ${Math.floor(ageHours)} horas`).catch(() => undefined);
        await this.db.addEvent("anti_fake_kick", { userId: member.id, ageHours: Math.floor(ageHours) });
        return;
      }
      if (antiFake.quarantineRoleId) await member.roles.add(antiFake.quarantineRoleId).catch(() => undefined);
    }
    if (!antiRaid || !antiRaid.enabled) {
      await this.sendConfiguredLog(member.guild, "Membro entrou", [{ name: "Usuario", value: `${member} (\`${member.id}\`)`, inline: true }, { name: "Conta criada", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }]);
      await this.db.addEvent("member_join", { userId: member.id });
      return;
    }
    const windowMs = Math.max(5, Number(antiRaid.secondsWindow || 15)) * 1000;
    const joins = (this.joinTracker.get(member.guild.id) || []).filter((timestamp) => timestamp > Date.now() - windowMs);
    joins.push(Date.now());
    this.joinTracker.set(member.guild.id, joins);
    if (joins.length >= Math.max(3, Number(antiRaid.joinLimit || 8))) {
      if (antiRaid.lockServer) await this.setGuildLockdown(member.guild, true, "Anti-raid acionado");
      await this.sendConfiguredLog(member.guild, "Anti-raid acionado", [{ name: "Entradas", value: String(joins.length), inline: true }, { name: "Janela", value: `${windowMs / 1000}s`, inline: true }], antiRaid.logChannelId);
      await this.db.addEvent("raid_detected", { guildId: member.guild.id, joins: joins.length });
    }
    await this.sendConfiguredLog(member.guild, "Membro entrou", [{ name: "Usuario", value: `${member} (\`${member.id}\`)`, inline: true }, { name: "Conta criada", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true }]);
    await this.db.addEvent("member_join", { userId: member.id });
  }

  async setGuildLockdown(guild, locked, reason) {
    const channels = guild.channels.cache.filter((channel) => [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum].includes(channel.type));
    for (const channel of channels.values()) {
      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        SendMessages: locked ? false : null,
        SendMessagesInThreads: locked ? false : null
      }, { reason }).catch(() => undefined);
    }
  }

  async auditActor(guild, action, targetId) {
    await new Promise((resolve) => setTimeout(resolve, 750));
    const logs = await guild.fetchAuditLogs({ type: action, limit: 5 }).catch(() => null);
    const entry = logs && logs.entries.find((item) => item.target && item.target.id === targetId);
    if (!entry || !entry.executor) return null;
    return entry.executor;
  }

  recordSecurityAction(guildId, userId, kind, windowMs) {
    const key = `${guildId}:${userId}:${kind}`;
    const actions = (this.securityActions.get(key) || []).filter((timestamp) => timestamp > Date.now() - windowMs);
    actions.push(Date.now());
    this.securityActions.set(key, actions);
    return actions.length;
  }

  async trustedSecurityActor(guild, user) {
    if (!user || user.id === this.client.user.id || user.id === guild.ownerId) return true;
    const whitelist = await this.db.read("whitelist");
    return whitelist.some((entry) => (entry.userId || entry) === user.id);
  }

  async punishSecurityActor(guild, user, reason) {
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member || !member.moderatable) return;
    const dangerous = member.roles.cache.filter((role) => role.editable && role.permissions.any([
      PermissionFlagsBits.Administrator,
      PermissionFlagsBits.ManageGuild,
      PermissionFlagsBits.ManageChannels,
      PermissionFlagsBits.ManageRoles,
      PermissionFlagsBits.BanMembers
    ]));
    if (dangerous.size) await member.roles.remove(dangerous, reason).catch(() => undefined);
  }

  async handleStructureCreate(item, kind) {
    const config = await this.db.getConfig();
    const protection = config.modules && config.modules["security-role-protection"];
    if (!protection || !protection.enabled) return;
    const action = kind === "channel" ? AuditLogEvent.ChannelCreate : AuditLogEvent.RoleCreate;
    const actor = await this.auditActor(item.guild, action, item.id);
    if (await this.trustedSecurityActor(item.guild, actor)) return;
    const antiNuke = config.modules["security-anti-ban"] || {};
    const count = this.recordSecurityAction(item.guild.id, actor.id, `${kind}-create`, Math.max(1, Number(antiNuke.minutesWindow || 2)) * 60000);
    const limit = Math.max(1, Number(antiNuke.banLimit || 3));
    await this.db.addEvent(`${kind}_created`, { id: item.id, actorId: actor.id, count });
    if (count < limit) return;
    await item.delete(`Anti-nuke: limite excedido por ${actor.tag}`).catch(() => undefined);
    if (antiNuke.removeRolesFromActor) await this.punishSecurityActor(item.guild, actor, "Anti-nuke: criacoes em massa");
    await this.sendConfiguredLog(item.guild, "Anti-nuke bloqueou criacao", [{ name: "Responsavel", value: `<@${actor.id}>`, inline: true }, { name: "Tipo", value: kind, inline: true }, { name: "Quantidade", value: String(count), inline: true }]);
  }

  async handleStructureDelete(item, kind) {
    const config = await this.db.getConfig();
    const protection = config.modules && config.modules["security-role-protection"];
    if (!protection || !protection.enabled) return;
    const action = kind === "channel" ? AuditLogEvent.ChannelDelete : AuditLogEvent.RoleDelete;
    const actor = await this.auditActor(item.guild, action, item.id);
    if (await this.trustedSecurityActor(item.guild, actor)) return;
    const antiNuke = config.modules["security-anti-ban"] || {};
    const count = this.recordSecurityAction(item.guild.id, actor.id, `${kind}-delete`, Math.max(1, Number(antiNuke.minutesWindow || 2)) * 60000);
    const limit = Math.max(1, Number(antiNuke.banLimit || 3));
    await this.db.addEvent(`${kind}_deleted`, { id: item.id, actorId: actor.id, count });
    if (count < limit) return;

    if (kind === "role") {
      await item.guild.roles.create({
        name: item.name,
        color: item.color,
        hoist: item.hoist,
        mentionable: item.mentionable,
        permissions: item.permissions,
        reason: `Restaurado pelo anti-nuke apos exclusao de ${actor.tag}`
      }).catch(() => undefined);
    } else {
      await item.guild.channels.create({
        name: item.name,
        type: item.type,
        topic: item.topic || undefined,
        nsfw: Boolean(item.nsfw),
        rateLimitPerUser: item.rateLimitPerUser || 0,
        bitrate: item.bitrate || undefined,
        userLimit: item.userLimit || undefined,
        parent: item.parentId || undefined,
        permissionOverwrites: item.permissionOverwrites ? [...item.permissionOverwrites.cache.values()].map((overwrite) => ({ id: overwrite.id, allow: overwrite.allow, deny: overwrite.deny, type: overwrite.type })) : [],
        reason: `Restaurado pelo anti-nuke apos exclusao de ${actor.tag}`
      }).catch(() => undefined);
    }
    if (antiNuke.removeRolesFromActor) await this.punishSecurityActor(item.guild, actor, "Anti-nuke: exclusoes em massa");
    await this.sendConfiguredLog(item.guild, "Anti-nuke restaurou estrutura", [{ name: "Responsavel", value: `<@${actor.id}>`, inline: true }, { name: "Tipo", value: kind, inline: true }, { name: "Nome", value: item.name, inline: true }]);
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

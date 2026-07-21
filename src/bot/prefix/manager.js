const fs = require("node:fs/promises");
const path = require("node:path");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");
const { CommandContext } = require("./context");
const { levelFromXp, parseArguments, xpForLevel } = require("./utils");

const categoryOrder = [
  "Usuario",
  "Moderacao",
  "Administracao",
  "Tickets",
  "Economia",
  "Diversao",
  "Musica",
  "Niveis",
  "Utilidades",
  "Seguranca",
  "Logs",
  "Dono"
];

class PrefixCommandManager {
  constructor(bot) {
    this.bot = bot;
    this.commands = new Map();
    this.aliases = new Map();
    this.cooldowns = new Map();
    this.xpCooldowns = new Map();
    this.reminderInterval = null;
    this.loaded = false;
  }

  async load() {
    this.commands.clear();
    this.aliases.clear();
    const root = path.resolve(__dirname, "..", "..", "commands");
    const files = await this.walk(root);

    for (const file of files.filter((item) => item.endsWith(".js"))) {
      delete require.cache[require.resolve(file)];
      const exported = require(file);
      const commands = Array.isArray(exported) ? exported : (exported.commands || [exported]);
      for (const command of commands) this.register(command, file);
    }

    this.loaded = true;
    return this.commands.size;
  }

  async walk(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
    const nested = await Promise.all(entries.map((entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? this.walk(fullPath) : [fullPath];
    }));
    return nested.flat();
  }

  register(command, source) {
    if (!command || !command.name || typeof command.execute !== "function") {
      throw new Error(`Comando invalido em ${source}.`);
    }
    if (this.commands.has(command.name) || this.aliases.has(command.name)) {
      throw new Error(`Comando duplicado: ${command.name}.`);
    }
    this.commands.set(command.name, command);
    for (const alias of command.aliases || []) {
      if (this.commands.has(alias) || this.aliases.has(alias)) {
        throw new Error(`Alias duplicado: ${alias}.`);
      }
      this.aliases.set(alias, command.name);
    }
  }

  get(name) {
    const normalized = String(name || "").toLowerCase();
    return this.commands.get(normalized) || this.commands.get(this.aliases.get(normalized));
  }

  list() {
    return [...this.commands.values()];
  }

  owners(config) {
    const envOwners = String(process.env.OWNER_IDS || "").split(",").map((id) => id.trim()).filter(Boolean);
    return new Set([...(config.ownerIds || []), ...envOwners]);
  }

  isOwner(userId, config) {
    return this.owners(config).has(userId);
  }

  commandsEnabled(config) {
    const moduleConfig = config.modules && config.modules["bot-commands"];
    return Boolean(moduleConfig && moduleConfig.enabled && moduleConfig.prefixCommands);
  }

  async handleMessage(message, config) {
    const prefix = String((config.botIdentity && config.botIdentity.prefix) || "!");
    if (!prefix || !message.content.startsWith(prefix)) return false;
    if (!this.commandsEnabled(config)) return false;

    const input = message.content.slice(prefix.length).trim();
    if (!input) return false;
    const parsed = parseArguments(input);
    const commandName = String(parsed.shift() || "").toLowerCase();
    const command = this.get(commandName);
    const moduleConfig = config.modules["bot-commands"] || {};

    if (!command) {
      if (moduleConfig.deleteUnknownCommands) await message.delete().catch(() => undefined);
      return false;
    }

    const accessError = await this.checkAccess(message, command, config);
    const context = new CommandContext({
      bot: this.bot,
      manager: this,
      message,
      config,
      command,
      args: parsed,
      rawArgs: input.slice(commandName.length).trim(),
      prefix
    });

    if (accessError) {
      await context.error(accessError, "Comando bloqueado").catch(() => undefined);
      return true;
    }

    const remaining = this.cooldownRemaining(command, message.author.id, config);
    if (remaining > 0 && !this.isOwner(message.author.id, config)) {
      await context.error(`Espere ${Math.ceil(remaining / 1000)} segundo(s) para usar este comando novamente.`, "Cooldown");
      return true;
    }

    this.setCooldown(command, message.author.id, config);
    try {
      await command.execute(context);
      await this.bot.db.incrementCommand(command.name);
      await this.bot.db.addEvent("prefix_command", {
        command: command.name,
        userId: message.author.id,
        channelId: message.channelId
      });
    } catch (error) {
      console.error(`[COMANDO] ${command.name}:`, error);
      this.bot.lastError = error.message;
      await this.bot.db.addEvent("prefix_command_error", {
        command: command.name,
        userId: message.author.id,
        message: error.message
      });
      await context.error("O comando encontrou um erro. Confira se meus cargos e permissoes estao corretos.").catch(() => undefined);
    }
    return true;
  }

  async checkAccess(message, command, config) {
    const owner = this.isOwner(message.author.id, config);
    const access = config.commandPermissions || {};
    const commandAccess = (config.commandAccess && config.commandAccess[command.name]) || {};
    const moduleConfig = config.modules["bot-commands"] || {};
    const blockedCommands = new Set(moduleConfig.blockedCommands || []);

    if (command.guildOnly && !message.guild) return "Este comando so funciona dentro de um servidor.";
    if (!commandAccess.enabled) return "Este comando ainda esta desativado no painel.";
    if (command.ownerOnly && !owner) return "Este comando e exclusivo dos donos configurados.";
    if (access.maintenance && !owner) return access.maintenanceMessage || "O bot esta em manutencao.";
    if ((access.blockedUserIds || []).includes(message.author.id) && !owner) return "Voce esta bloqueado de usar comandos.";
    if (blockedCommands.has(command.name) && !owner) return "Este comando foi desativado no painel.";

    const blacklist = await this.bot.db.read("blacklist");
    if (blacklist.some((entry) => (entry.userId || entry) === message.author.id) && !owner) {
      return "Voce esta na blacklist do bot.";
    }

    const channelIds = [
      ...(access.allowedChannelIds || []),
      ...(command.allowedChannelIds || []),
      ...(commandAccess.allowedChannelIds || [])
    ];
    if (moduleConfig.channelId) channelIds.push(moduleConfig.channelId);
    if (channelIds.length && !channelIds.includes(message.channelId) && !owner) {
      return `Use este comando em ${channelIds.map((id) => `<#${id}>`).join(", ")}.`;
    }

    const roleIds = [
      ...(access.allowedRoleIds || []),
      ...(moduleConfig.allowedRoleIds || []),
      ...(command.allowedRoleIds || []),
      ...(commandAccess.allowedRoleIds || [])
    ];
    if (roleIds.length && !message.member.roles.cache.some((role) => roleIds.includes(role.id)) && !owner) {
      return "Seu cargo nao esta autorizado a usar este comando.";
    }

    if (!owner && command.userPermissions.length && !message.member.permissions.has(command.userPermissions)) {
      return "Voce nao possui as permissoes necessarias para este comando.";
    }

    const botMember = message.guild.members.me;
    if (command.botPermissions.length && (!botMember || !botMember.permissions.has(command.botPermissions))) {
      return "Eu nao possuo as permissoes necessarias para executar este comando.";
    }
    return "";
  }

  cooldownRemaining(command, userId, config) {
    const expiresAt = this.cooldowns.get(`${command.name}:${userId}`) || 0;
    return Math.max(0, expiresAt - Date.now());
  }

  setCooldown(command, userId, config) {
    const access = (config.commandAccess && config.commandAccess[command.name]) || {};
    const seconds = access.cooldownSeconds === undefined ? command.cooldown : Math.max(0, Number(access.cooldownSeconds));
    this.cooldowns.set(`${command.name}:${userId}`, Date.now() + seconds * 1000);
  }

  categories() {
    const names = [...new Set(this.list().filter((command) => !command.hidden).map((command) => command.category))];
    return names.sort((a, b) => {
      const left = categoryOrder.indexOf(a);
      const right = categoryOrder.indexOf(b);
      return (left === -1 ? 99 : left) - (right === -1 ? 99 : right) || a.localeCompare(b);
    });
  }

  helpPayload(context, category = "", query = "") {
    let commands = this.list().filter((command) => !command.hidden);
    let title = `Central de comandos - ${context.config.brandName}`;
    let description = `Prefixo atual: \`${context.prefix}\`\nUse \`${context.prefix}help nome\` para pesquisar um comando.`;

    if (query) {
      const search = query.toLowerCase();
      commands = commands.filter((command) =>
        command.name.includes(search) ||
        command.description.toLowerCase().includes(search) ||
        command.aliases.some((alias) => alias.includes(search))
      );
      title = `Pesquisa: ${query}`;
    } else if (category) {
      commands = commands.filter((command) => command.category === category);
      title = `Comandos de ${category}`;
    } else {
      description += `\n\n${this.categories().map((name) => {
        const total = commands.filter((command) => command.category === name).length;
        return `**${name}** - ${total} comando(s)`;
      }).join("\n")}`;
      commands = [];
    }

    const embed = context.embed(title, description);
    if (commands.length) {
      embed.addFields(commands.slice(0, 25).map((command) => ({
        name: `${context.prefix}${command.name}${command.usage ? ` ${command.usage}` : ""}`,
        value: `${command.description}${command.aliases.length ? `\nAliases: ${command.aliases.join(", ")}` : ""}`,
        inline: false
      })));
      if (commands.length > 25) embed.setFooter({ text: `${commands.length} comandos encontrados. Mostrando os primeiros 25.` });
    } else if (query) {
      embed.setDescription(`Nenhum comando encontrado para \`${query}\`.`);
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`prefix-help-select:${context.author.id}`)
      .setPlaceholder("Escolha uma categoria")
      .addOptions(this.categories().map((name) => ({ label: name, value: name })));
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`prefix-help-home:${context.author.id}`).setLabel("Inicio").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`prefix-help-close:${context.author.id}`).setLabel("Fechar").setStyle(ButtonStyle.Secondary)
    );
    return { embeds: [embed], components: [new ActionRowBuilder().addComponents(select), buttons] };
  }

  async handleInteraction(interaction) {
    if (!interaction.customId || !interaction.customId.startsWith("prefix-help-")) return false;
    const [action, ownerId] = interaction.customId.replace("prefix-help-", "").split(":");
    if (interaction.user.id !== ownerId) {
      await interaction.reply({ ephemeral: true, content: "Este menu de ajuda pertence a outra pessoa." });
      return true;
    }
    if (action === "close") {
      await interaction.update({ content: "Menu de ajuda fechado.", embeds: [], components: [] });
      return true;
    }
    const config = await this.bot.db.getConfig();
    const command = this.get("help");
    const fakeContext = new CommandContext({
      bot: this.bot,
      manager: this,
      message: interaction.message,
      config,
      command,
      args: [],
      rawArgs: "",
      prefix: (config.botIdentity && config.botIdentity.prefix) || "!"
    });
    fakeContext.author = interaction.user;
    const category = action === "select" ? interaction.values[0] : "";
    await interaction.update(this.helpPayload(fakeContext, category));
    return true;
  }

  async observeMessage(message, config) {
    const afk = await this.bot.db.read("afk");
    const authorKey = this.bot.db.scopeKey(message.guild.id, message.author.id);
    if (afk[authorKey] && !message.content.startsWith(`${config.botIdentity.prefix || "!"}afk`)) {
      await this.bot.db.update("afk", async (records) => {
        const next = { ...records };
        delete next[authorKey];
        return next;
      });
      await message.reply({ content: "Seu status AFK foi removido. Bem-vindo(a) de volta!", allowedMentions: { repliedUser: false } }).catch(() => undefined);
    }

    for (const user of message.mentions.users.values()) {
      const record = afk[this.bot.db.scopeKey(message.guild.id, user.id)];
      if (record) {
        await message.reply({
          content: `${user.username} esta AFK: ${record.reason || "Sem motivo"}`,
          allowedMentions: { repliedUser: false, users: [] }
        }).catch(() => undefined);
        break;
      }
    }

    const moduleLeveling = config.modules && config.modules["community-leveling"];
    const levelingEnabled = config.leveling.enabled || (moduleLeveling && moduleLeveling.enabled);
    if (!levelingEnabled || message.content.startsWith(config.botIdentity.prefix || "!")) return;

    const cooldownSeconds = Number(config.leveling.cooldownSeconds || moduleLeveling.cooldownSeconds || 60);
    const cooldownKey = `${message.guild.id}:${message.author.id}`;
    if ((this.xpCooldowns.get(cooldownKey) || 0) > Date.now()) return;
    this.xpCooldowns.set(cooldownKey, Date.now() + cooldownSeconds * 1000);

    const oldRecord = await this.bot.db.getScoped("xp", message.guild.id, message.author.id, { xp: 0, messages: 0 });
    const oldLevel = levelFromXp(oldRecord.xp);
    const xpGain = Number(config.leveling.xpPerMessage || moduleLeveling.xpPerMessage || 15);
    const record = await this.bot.db.updateScoped("xp", message.guild.id, message.author.id, { xp: 0, messages: 0 }, async (current) => ({
      ...current,
      xp: Number(current.xp || 0) + xpGain,
      messages: Number(current.messages || 0) + 1,
      updatedAt: new Date().toISOString()
    }));
    const newLevel = levelFromXp(record.xp);
    if (newLevel > oldLevel) {
      await message.channel.send({
        content: `<@${message.author.id}> subiu para o nivel **${newLevel}**! Proximo nivel em ${xpForLevel(newLevel + 1)} XP.`,
        allowedMentions: { users: [message.author.id] }
      }).catch(() => undefined);
      await this.bot.db.addEvent("level_up", { userId: message.author.id, level: newLevel });
    }
  }

  startReminderScheduler() {
    if (this.reminderInterval) return;
    const check = () => this.deliverDueReminders().catch((error) => {
      this.bot.db.addEvent("reminder_error", { message: error.message }).catch(() => undefined);
    });
    check();
    this.reminderInterval = setInterval(check, 30000);
    if (this.reminderInterval.unref) this.reminderInterval.unref();
  }

  async deliverDueReminders() {
    if (!this.bot.ready) return;
    const items = await this.bot.db.read("reminders");
    const due = items.filter((item) => !item.sentAt && new Date(item.dueAt).getTime() <= Date.now()).slice(0, 25);
    for (const reminder of due) {
      const channel = await this.bot.client.channels.fetch(reminder.channelId).catch(() => null);
      if (channel && channel.isTextBased()) {
        await channel.send({
          content: `<@${reminder.userId}> lembrete: ${reminder.text}`,
          allowedMentions: { users: [reminder.userId] }
        }).catch(() => undefined);
      }
    }
    if (due.length) {
      const delivered = new Set(due.map((item) => item.id));
      await this.bot.db.update("reminders", async (current) => current.map((item) => delivered.has(item.id) ? { ...item, sentAt: new Date().toISOString() } : item));
    }
  }
}

module.exports = { PrefixCommandManager };

const { EmbedBuilder } = require("discord.js");
const { hexToInt, truncate } = require("../../utils/text");
const { snowflake } = require("./utils");

class CommandContext {
  constructor({ bot, manager, message, config, command, args, rawArgs, prefix }) {
    this.bot = bot;
    this.client = bot.client;
    this.db = bot.db;
    this.manager = manager;
    this.message = message;
    this.config = config;
    this.command = command;
    this.args = args;
    this.rawArgs = rawArgs;
    this.prefix = prefix;
    this.guild = message.guild;
    this.member = message.member;
    this.author = message.author;
    this.channel = message.channel;
  }

  embed(title, description, color) {
    return new EmbedBuilder()
      .setColor(hexToInt(color || this.config.accentColor || "#24c46b"))
      .setTitle(truncate(title || this.config.brandName, 256))
      .setDescription(truncate(description || "", 4000))
      .setFooter({ text: this.config.brandName || "Baile da Selva" })
      .setTimestamp();
  }

  async send(payload) {
    const normalized = typeof payload === "string" ? { content: payload } : payload;
    return this.channel.send({
      allowedMentions: { repliedUser: false, parse: [] },
      ...normalized
    });
  }

  async reply(payload) {
    const normalized = typeof payload === "string" ? { content: payload } : payload;
    return this.message.reply({
      allowedMentions: { repliedUser: false, parse: [] },
      ...normalized
    });
  }

  async info(title, description, fields = []) {
    const embed = this.embed(title, description);
    if (fields.length) embed.addFields(fields);
    return this.reply({ embeds: [embed] });
  }

  async success(description, title = "Tudo certo") {
    return this.reply({ embeds: [this.embed(title, description, "#24c46b")] });
  }

  async error(description, title = "Nao foi possivel") {
    return this.reply({ embeds: [this.embed(title, description, "#f04452")] });
  }

  async getUser(value = this.args[0]) {
    const mentioned = this.message.mentions.users.first();
    if (mentioned) return mentioned;
    const id = snowflake(value);
    if (id) return this.client.users.fetch(id).catch(() => null);
    return null;
  }

  async getMember(value = this.args[0]) {
    const mentioned = this.message.mentions.members.first();
    if (mentioned) return mentioned;
    const id = snowflake(value);
    if (id) return this.guild.members.fetch(id).catch(() => null);
    return null;
  }

  async getRole(value = this.args[0]) {
    const mentioned = this.message.mentions.roles.first();
    if (mentioned) return mentioned;
    const id = snowflake(value);
    return id ? this.guild.roles.fetch(id).catch(() => null) : null;
  }

  async getChannel(value = this.args[0]) {
    const mentioned = this.message.mentions.channels.first();
    if (mentioned) return mentioned;
    const id = snowflake(value);
    return id ? this.guild.channels.fetch(id).catch(() => null) : null;
  }

  usage(extra = "") {
    const syntax = [this.prefix + this.command.name, this.command.usage].filter(Boolean).join(" ");
    return this.error([`Uso correto: \`${syntax}\``, extra].filter(Boolean).join("\n"), "Como usar");
  }
}

module.exports = { CommandContext };

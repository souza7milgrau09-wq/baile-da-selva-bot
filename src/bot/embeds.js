const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");
const { hexToInt, truncate } = require("../utils/text");

const buttonStyles = {
  Primary: ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success: ButtonStyle.Success,
  Danger: ButtonStyle.Danger
};

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function brandEmbed(config) {
  return new EmbedBuilder()
    .setColor(hexToInt(config.accentColor))
    .setFooter({ text: config.brandName || "Baile da Selva" })
    .setTimestamp();
}

function ticketPanel(config) {
  const ticket = config.ticket || {};
  const embed = brandEmbed(config)
    .setColor(hexToInt(ticket.panelColor || config.accentColor))
    .setTitle(truncate(ticket.panelTitle || "Atendimento", 256))
    .setDescription(truncate(ticket.panelDescription || "Abra um ticket com a equipe.", 4000));

  if (ticket.panelSubtitle) {
    embed.setAuthor({ name: truncate(ticket.panelSubtitle, 256) });
  }
  if (ticket.panelThumbnailUrl && isHttpUrl(ticket.panelThumbnailUrl)) {
    embed.setThumbnail(ticket.panelThumbnailUrl);
  }
  if (ticket.panelImageUrl && isHttpUrl(ticket.panelImageUrl)) {
    embed.setImage(ticket.panelImageUrl);
  }
  if (ticket.panelFooter) {
    embed.setFooter({ text: truncate(ticket.panelFooter, 2048) });
  }

  const fields = (ticket.panelFields || []).slice(0, 8).map((field) => ({
    name: truncate(field.name, 256),
    value: truncate(field.value, 1024),
    inline: false
  }));
  if (fields.length) {
    embed.addFields(fields);
  }

  const button = new ButtonBuilder()
    .setCustomId("ticket:open")
    .setLabel(truncate(ticket.buttonLabel || "Abrir ticket", 80))
    .setStyle(buttonStyles[ticket.buttonStyle] || ButtonStyle.Primary);

  if (ticket.buttonEmoji) {
    button.setEmoji(ticket.buttonEmoji);
  }

  const row = new ActionRowBuilder().addComponents(
    button
  );

  return { embeds: [embed], components: [row] };
}

function ticketControls(ticketId, closed = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket:claim:${ticketId}`)
      .setLabel("Assumir")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(closed),
    new ButtonBuilder()
      .setCustomId(`ticket:close:${ticketId}`)
      .setLabel("Fechar")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(closed),
    new ButtonBuilder()
      .setCustomId(`ticket:delete:${ticketId}`)
      .setLabel("Apagar")
      .setStyle(ButtonStyle.Secondary)
  );
  return [row];
}

function formPanel(config, form) {
  const embed = brandEmbed(config)
    .setTitle(form.title || form.name)
    .setDescription(form.description || "Envie seu formulario para a equipe.");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`form:open:${form.id}`)
      .setLabel(form.buttonLabel || "Enviar formulario")
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

function formReviewControls(submissionId, disabled = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`form:approve:${submissionId}`)
      .setLabel("Aprovar")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`form:reject:${submissionId}`)
      .setLabel("Reprovar")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
  return [row];
}

function storePanel(config) {
  const embed = brandEmbed(config)
    .setTitle(config.store.panelTitle || "Loja interna")
    .setDescription(config.store.panelDescription || "Escolha um item abaixo.");

  const rows = [];
  const products = (config.store.products || []).filter((product) => product.enabled).slice(0, 25);
  const fields = products.map((product) => ({
    name: [product.name, [config.store.currency, product.price].filter(Boolean).join(" ")].filter(Boolean).join(" - "),
    value: truncate(product.description || "Sem descricao.", 250),
    inline: false
  }));

  embed.addFields(fields.length ? fields : [{ name: "Nenhum item ativo", value: "Cadastre itens no painel." }]);

  for (let index = 0; index < products.length; index += 5) {
    const row = new ActionRowBuilder();
    for (const product of products.slice(index, index + 5)) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`store:buy:${product.id}`)
          .setLabel(product.name.slice(0, 80))
          .setStyle(ButtonStyle.Success)
      );
    }
    rows.push(row);
  }

  return { embeds: [embed], components: rows };
}

function orderControls(orderId, disabled = false) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`order:paid:${orderId}`)
      .setLabel("Conferido")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`order:deliver:${orderId}`)
      .setLabel("Entregar")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`order:cancel:${orderId}`)
      .setLabel("Cancelar")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled)
  );
  return [row];
}

module.exports = {
  brandEmbed,
  formPanel,
  formReviewControls,
  orderControls,
  storePanel,
  ticketControls,
  ticketPanel
};

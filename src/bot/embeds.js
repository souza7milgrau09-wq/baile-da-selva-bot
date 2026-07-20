const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require("discord.js");
const { hexToInt, truncate } = require("../utils/text");

function brandEmbed(config) {
  return new EmbedBuilder()
    .setColor(hexToInt(config.accentColor))
    .setFooter({ text: config.brandName || "Baile da Selva" })
    .setTimestamp();
}

function ticketPanel(config) {
  const embed = brandEmbed(config)
    .setTitle(config.ticket.panelTitle)
    .setDescription(config.ticket.panelDescription);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ticket:open")
      .setLabel(config.ticket.buttonLabel || "Abrir ticket")
      .setStyle(ButtonStyle.Success)
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
    .setTitle(config.store.panelTitle || "Loja")
    .setDescription(config.store.panelDescription || "Escolha um produto abaixo.");

  const rows = [];
  const products = (config.store.products || []).filter((product) => product.enabled).slice(0, 25);
  const fields = products.map((product) => ({
    name: `${product.name} - ${config.store.currency} ${product.price}`,
    value: truncate(product.description || "Sem descricao.", 250),
    inline: false
  }));

  embed.addFields(fields.length ? fields : [{ name: "Nenhum produto ativo", value: "Cadastre produtos no painel." }]);

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
      .setLabel("Pago")
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

const { PermissionFlagsBits } = require("discord.js");
const { defineCommand } = require("../../bot/prefix/command");
const { formatMoney, parseAmount, randomInt } = require("../../bot/prefix/utils");

const defaults = { wallet: 0, bank: 0, inventory: [], cooldowns: {}, totalEarned: 0 };

function currency(ctx) {
  return ctx.config.economy.currencyName || ctx.config.modules["entertainment-economy"].currencyName || "Folhas";
}

function enabled(ctx) {
  return ctx.config.economy.enabled || (ctx.config.modules["entertainment-economy"] && ctx.config.modules["entertainment-economy"].enabled);
}

async function requireEnabled(ctx) {
  if (enabled(ctx)) return true;
  await ctx.error("A economia esta desativada. Ative no painel ou use `seteconomy` futuramente.");
  return false;
}

async function record(ctx, userId = ctx.author.id) {
  return ctx.db.getScoped("economy", ctx.guild.id, userId, defaults);
}

async function update(ctx, userId, updater) {
  return ctx.db.updateScoped("economy", ctx.guild.id, userId, defaults, updater);
}

async function reward(ctx, key, amount, cooldownMs, label) {
  if (!await requireEnabled(ctx)) return;
  const current = await record(ctx);
  const remaining = Number(current.cooldowns[key] || 0) - Date.now();
  if (remaining > 0) return ctx.error(`Voce podera receber novamente <t:${Math.ceil((Date.now() + remaining) / 1000)}:R>.`, "Recompensa em cooldown");
  await update(ctx, ctx.author.id, async (data) => ({
    ...data,
    wallet: data.wallet + amount,
    totalEarned: data.totalEarned + amount,
    cooldowns: { ...data.cooldowns, [key]: Date.now() + cooldownMs }
  }));
  await ctx.success(`Voce recebeu **${formatMoney(amount, currency(ctx))}**.`, label);
  await ctx.db.addEvent("economy_reward", { userId: ctx.author.id, type: key, amount });
}

const commands = [
  defineCommand({
    name: "balance", aliases: ["bal", "saldo"], description: "Mostra carteira e banco.", category: "Economia", usage: "[@usuario]",
    async execute(ctx) {
      if (!await requireEnabled(ctx)) return;
      const user = await ctx.getUser() || ctx.author;
      const data = await record(ctx, user.id);
      await ctx.info(`Saldo de ${user.username}`, "Sua economia interna no Baile da Selva.", [
        { name: "Carteira", value: formatMoney(data.wallet, currency(ctx)), inline: true },
        { name: "Banco", value: formatMoney(data.bank, currency(ctx)), inline: true },
        { name: "Total", value: formatMoney(data.wallet + data.bank, currency(ctx)), inline: true }
      ]);
    }
  }),
  defineCommand({ name: "daily", aliases: ["diario"], description: "Recebe a recompensa diaria.", category: "Economia", cooldown: 5, execute: (ctx) => reward(ctx, "daily", Number(ctx.config.economy.dailyReward || 250), 86400000, "Recompensa diaria") }),
  defineCommand({ name: "weekly", aliases: ["semanal"], description: "Recebe a recompensa semanal.", category: "Economia", cooldown: 5, execute: (ctx) => reward(ctx, "weekly", Number(ctx.config.economy.weeklyReward || 1250), 604800000, "Recompensa semanal") }),
  defineCommand({ name: "monthly", aliases: ["mensal"], description: "Recebe a recompensa mensal.", category: "Economia", cooldown: 5, execute: (ctx) => reward(ctx, "monthly", Number(ctx.config.economy.monthlyReward || 5000), 2592000000, "Recompensa mensal") }),
  defineCommand({
    name: "work", aliases: ["trabalhar"], description: "Trabalha para ganhar moedas.", category: "Economia", cooldown: 5,
    async execute(ctx) {
      const amount = randomInt(Number(ctx.config.economy.workMin || 80), Number(ctx.config.economy.workMax || 260));
      await reward(ctx, "work", amount, 3600000, "Trabalho concluido");
    }
  }),
  defineCommand({
    name: "crime", aliases: ["roubarcidade"], description: "Arrisca moedas em uma atividade criminosa ficticia.", category: "Economia", cooldown: 5,
    async execute(ctx) {
      if (!await requireEnabled(ctx)) return;
      const data = await record(ctx);
      const remaining = Number(data.cooldowns.crime || 0) - Date.now();
      if (remaining > 0) return ctx.error(`Tente novamente <t:${Math.ceil((Date.now() + remaining) / 1000)}:R>.`);
      const won = Math.random() < 0.55;
      const amount = won ? randomInt(150, 600) : Math.min(data.wallet, randomInt(50, 300));
      await update(ctx, ctx.author.id, async (current) => ({
        ...current,
        wallet: current.wallet + (won ? amount : -amount),
        totalEarned: current.totalEarned + (won ? amount : 0),
        cooldowns: { ...current.cooldowns, crime: Date.now() + 7200000 }
      }));
      await (won ? ctx.success(`Deu certo e voce ganhou **${formatMoney(amount, currency(ctx))}**.`, "Crime bem-sucedido") : ctx.error(`Voce foi pego e perdeu **${formatMoney(amount, currency(ctx))}**.`, "Crime falhou"));
    }
  }),
  defineCommand({
    name: "beg", aliases: ["mendigar", "pedir"], description: "Pede algumas moedas pela comunidade.", category: "Economia", cooldown: 5,
    async execute(ctx) {
      await reward(ctx, "beg", randomInt(10, 80), 900000, "Ajuda recebida");
    }
  }),
  defineCommand({
    name: "deposit", aliases: ["dep", "depositar"], description: "Deposita moedas no banco.", category: "Economia", usage: "quantidade | tudo",
    async execute(ctx) {
      if (!await requireEnabled(ctx)) return;
      const data = await record(ctx);
      const amount = parseAmount(ctx.args[0], data.wallet);
      if (!amount || amount > data.wallet) return ctx.error("Quantidade invalida ou saldo insuficiente.");
      await update(ctx, ctx.author.id, async (current) => ({ ...current, wallet: current.wallet - amount, bank: current.bank + amount }));
      await ctx.success(`Depositados **${formatMoney(amount, currency(ctx))}**.`, "Deposito concluido");
    }
  }),
  defineCommand({
    name: "withdraw", aliases: ["sacar", "saque"], description: "Retira moedas do banco.", category: "Economia", usage: "quantidade | tudo",
    async execute(ctx) {
      if (!await requireEnabled(ctx)) return;
      const data = await record(ctx);
      const amount = parseAmount(ctx.args[0], data.bank);
      if (!amount || amount > data.bank) return ctx.error("Quantidade invalida ou saldo insuficiente no banco.");
      await update(ctx, ctx.author.id, async (current) => ({ ...current, wallet: current.wallet + amount, bank: current.bank - amount }));
      await ctx.success(`Sacados **${formatMoney(amount, currency(ctx))}**.`, "Saque concluido");
    }
  }),
  defineCommand({
    name: "pay", aliases: ["pagar", "transferir"], description: "Transfere moedas para outro membro.", category: "Economia", usage: "@usuario quantidade", cooldown: 5,
    async execute(ctx) {
      if (!await requireEnabled(ctx)) return;
      const target = await ctx.getUser();
      if (!target || target.bot || target.id === ctx.author.id) return ctx.usage("Escolha outra pessoa que nao seja um bot.");
      const data = await record(ctx);
      const amount = parseAmount(ctx.args[1], data.wallet);
      if (!amount || amount > data.wallet) return ctx.error("Quantidade invalida ou saldo insuficiente.");
      await update(ctx, ctx.author.id, async (current) => ({ ...current, wallet: current.wallet - amount }));
      await update(ctx, target.id, async (current) => ({ ...current, wallet: current.wallet + amount, totalEarned: current.totalEarned + amount }));
      await ctx.success(`Voce enviou **${formatMoney(amount, currency(ctx))}** para ${target}.`, "Transferencia concluida");
      await ctx.db.addEvent("economy_transfer", { from: ctx.author.id, to: target.id, amount });
    }
  }),
  defineCommand({
    name: "leaderboard", aliases: ["moneytop", "topmoney"], description: "Mostra o ranking de economia.", category: "Economia",
    async execute(ctx) {
      if (!await requireEnabled(ctx)) return;
      const records = await ctx.db.read("economy");
      const prefix = `${ctx.guild.id}:`;
      const ranking = Object.entries(records).filter(([key]) => key.startsWith(prefix)).map(([key, data]) => ({ id: key.slice(prefix.length), total: Number(data.wallet || 0) + Number(data.bank || 0) })).sort((a, b) => b.total - a.total).slice(0, 10);
      await ctx.info("Ranking de economia", ranking.length ? ranking.map((item, index) => `**${index + 1}.** <@${item.id}> - ${formatMoney(item.total, currency(ctx))}`).join("\n") : "Ainda nao ha dados.");
    }
  }),
  defineCommand({
    name: "shop", aliases: ["loja"], description: "Mostra os itens da loja de economia.", category: "Economia",
    async execute(ctx) {
      if (!await requireEnabled(ctx)) return;
      const items = ctx.config.economy.shop || [];
      await ctx.info("Loja de economia", items.length ? items.map((item) => `**${item.name}** (\`${item.id}\`)\n${item.description}\nCompra: ${formatMoney(item.price, currency(ctx))} | Venda: ${formatMoney(item.sellPrice, currency(ctx))}`).join("\n\n") : "A loja ainda nao possui itens.");
    }
  }),
  defineCommand({
    name: "buy", aliases: ["comprar"], description: "Compra um item da loja.", category: "Economia", usage: "ID_do_item [quantidade]", cooldown: 3,
    async execute(ctx) {
      if (!await requireEnabled(ctx)) return;
      const item = (ctx.config.economy.shop || []).find((entry) => entry.id === ctx.args[0]);
      const quantity = Math.min(100, Math.max(1, Number(ctx.args[1] || 1)));
      if (!item) return ctx.error("Item nao encontrado. Use o comando `shop`.");
      const data = await record(ctx);
      const total = Number(item.price) * quantity;
      if (data.wallet < total) return ctx.error(`Voce precisa de **${formatMoney(total, currency(ctx))}** na carteira.`);
      await update(ctx, ctx.author.id, async (current) => {
        const inventory = [...current.inventory];
        const owned = inventory.find((entry) => entry.id === item.id);
        if (owned) owned.quantity += quantity;
        else inventory.push({ id: item.id, quantity });
        return { ...current, wallet: current.wallet - total, inventory };
      });
      await ctx.success(`Voce comprou **${quantity}x ${item.name}** por ${formatMoney(total, currency(ctx))}.`, "Compra concluida");
    }
  }),
  defineCommand({
    name: "sell", aliases: ["vender"], description: "Vende um item do inventario.", category: "Economia", usage: "ID_do_item [quantidade]",
    async execute(ctx) {
      if (!await requireEnabled(ctx)) return;
      const item = (ctx.config.economy.shop || []).find((entry) => entry.id === ctx.args[0]);
      const quantity = Math.min(100, Math.max(1, Number(ctx.args[1] || 1)));
      const data = await record(ctx);
      const owned = data.inventory.find((entry) => entry.id === ctx.args[0]);
      if (!item || !owned || owned.quantity < quantity) return ctx.error("Voce nao possui essa quantidade do item.");
      const total = Number(item.sellPrice || 0) * quantity;
      await update(ctx, ctx.author.id, async (current) => ({
        ...current,
        wallet: current.wallet + total,
        inventory: current.inventory.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity - quantity } : entry).filter((entry) => entry.quantity > 0)
      }));
      await ctx.success(`Voce vendeu **${quantity}x ${item.name}** por ${formatMoney(total, currency(ctx))}.`, "Venda concluida");
    }
  }),
  defineCommand({
    name: "inventory", aliases: ["inv", "inventario"], description: "Mostra os itens de um membro.", category: "Economia", usage: "[@usuario]",
    async execute(ctx) {
      if (!await requireEnabled(ctx)) return;
      const user = await ctx.getUser() || ctx.author;
      const data = await record(ctx, user.id);
      const lines = data.inventory.map((owned) => {
        const item = (ctx.config.economy.shop || []).find((entry) => entry.id === owned.id);
        return `**${item ? item.name : owned.id}** - ${owned.quantity}x`;
      });
      await ctx.info(`Inventario de ${user.username}`, lines.join("\n") || "Inventario vazio.");
    }
  }),
  defineCommand({
    name: "use", aliases: ["usar"], description: "Usa um item do inventario.", category: "Economia", usage: "ID_do_item", botPermissions: [PermissionFlagsBits.ManageRoles],
    async execute(ctx) {
      if (!await requireEnabled(ctx)) return;
      const item = (ctx.config.economy.shop || []).find((entry) => entry.id === ctx.args[0]);
      const data = await record(ctx);
      const owned = data.inventory.find((entry) => entry.id === ctx.args[0]);
      if (!item || !owned || owned.quantity < 1) return ctx.error("Voce nao possui esse item.");
      if (!item.usable && !item.roleId) return ctx.error("Este item e apenas colecionavel.");
      if (item.roleId) await ctx.member.roles.add(item.roleId, `Item usado: ${item.name}`);
      await update(ctx, ctx.author.id, async (current) => ({
        ...current,
        inventory: current.inventory.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity - 1 } : entry).filter((entry) => entry.quantity > 0)
      }));
      await ctx.success(`Voce usou **${item.name}**.`, "Item utilizado");
    }
  })
];

module.exports = { commands };

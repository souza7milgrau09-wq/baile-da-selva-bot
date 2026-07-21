const { PermissionFlagsBits } = require("discord.js");
const { defineCommand } = require("../../bot/prefix/command");
const { levelFromXp, xpForLevel } = require("../../bot/prefix/utils");

const defaults = { xp: 0, messages: 0 };

function isEnabled(ctx) {
  return ctx.config.leveling.enabled || (ctx.config.modules["community-leveling"] && ctx.config.modules["community-leveling"].enabled);
}

async function requireEnabled(ctx) {
  if (isEnabled(ctx)) return true;
  await ctx.error("O sistema de niveis esta desativado no painel.");
  return false;
}

async function xpRecord(ctx, userId) {
  return ctx.db.getScoped("xp", ctx.guild.id, userId, defaults);
}

async function showRank(ctx, target) {
  if (!await requireEnabled(ctx)) return;
  const data = await xpRecord(ctx, target.id);
  const level = levelFromXp(data.xp);
  const currentBase = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const progress = next === currentBase ? 0 : Math.round(((data.xp - currentBase) / (next - currentBase)) * 10);
  const records = await ctx.db.read("xp");
  const prefix = `${ctx.guild.id}:`;
  const ranking = Object.entries(records).filter(([key]) => key.startsWith(prefix)).sort((a, b) => Number(b[1].xp || 0) - Number(a[1].xp || 0));
  const position = ranking.findIndex(([key]) => key === `${prefix}${target.id}`) + 1;
  await ctx.reply({ embeds: [ctx.embed(`Rank de ${target.user.username}`, `${"█".repeat(progress)}${"░".repeat(10 - progress)} **${data.xp - currentBase}/${next - currentBase} XP**`)
    .setThumbnail(target.displayAvatarURL({ size: 512 }))
    .addFields(
      { name: "Nivel", value: String(level), inline: true },
      { name: "Posicao", value: position ? `#${position}` : "Sem rank", inline: true },
      { name: "XP total", value: String(data.xp), inline: true },
      { name: "Mensagens", value: String(data.messages || 0), inline: true }
    )] });
}

const commands = [
  defineCommand({
    name: "rank", aliases: ["nivelperfil"], description: "Mostra o cartao de nivel de um membro.", category: "Niveis", usage: "[@usuario]",
    async execute(ctx) { await showRank(ctx, await ctx.getMember() || ctx.member); }
  }),
  defineCommand({
    name: "xpleaderboard", aliases: ["xptop", "ranktop"], description: "Mostra o ranking de XP do servidor.", category: "Niveis",
    async execute(ctx) {
      if (!await requireEnabled(ctx)) return;
      const records = await ctx.db.read("xp");
      const prefix = `${ctx.guild.id}:`;
      const ranking = Object.entries(records).filter(([key]) => key.startsWith(prefix)).map(([key, data]) => ({ id: key.slice(prefix.length), xp: Number(data.xp || 0) })).sort((a, b) => b.xp - a.xp).slice(0, 10);
      await ctx.info("Ranking de XP", ranking.length ? ranking.map((item, index) => `**${index + 1}.** <@${item.id}> - Nivel ${levelFromXp(item.xp)} (${item.xp} XP)`).join("\n") : "Ainda nao ha dados de XP.");
    }
  }),
  defineCommand({
    name: "level", aliases: ["nivel", "xp"], description: "Mostra o nivel e o XP necessario para evoluir.", category: "Niveis", usage: "[@usuario]",
    async execute(ctx) { await showRank(ctx, await ctx.getMember() || ctx.member); }
  }),
  defineCommand({
    name: "resetxp", aliases: ["zerarxp"], description: "Zera o XP de um membro.", category: "Niveis", usage: "@usuario confirmar", userPermissions: [PermissionFlagsBits.ManageGuild],
    async execute(ctx) {
      const target = await ctx.getMember();
      if (!target || ctx.args[1] !== "confirmar") return ctx.usage();
      await ctx.db.updateScoped("xp", ctx.guild.id, target.id, defaults, async () => ({ ...defaults, resetAt: new Date().toISOString(), resetBy: ctx.author.id }));
      await ctx.success(`O XP de ${target} foi zerado.`, "XP redefinido");
    }
  }),
  defineCommand({
    name: "givexp", aliases: ["darxp"], description: "Adiciona XP a um membro.", category: "Niveis", usage: "@usuario quantidade", userPermissions: [PermissionFlagsBits.ManageGuild],
    async execute(ctx) {
      const target = await ctx.getMember();
      const amount = Math.floor(Number(ctx.args[1]));
      if (!target || !amount || amount < 1 || amount > 10000000) return ctx.usage();
      const data = await ctx.db.updateScoped("xp", ctx.guild.id, target.id, defaults, async (current) => ({ ...current, xp: current.xp + amount, updatedAt: new Date().toISOString() }));
      await ctx.success(`${target} recebeu **${amount} XP** e agora esta no nivel **${levelFromXp(data.xp)}**.`, "XP adicionado");
    }
  }),
  defineCommand({
    name: "removexp", aliases: ["tirarxp"], description: "Remove XP de um membro.", category: "Niveis", usage: "@usuario quantidade", userPermissions: [PermissionFlagsBits.ManageGuild],
    async execute(ctx) {
      const target = await ctx.getMember();
      const amount = Math.floor(Number(ctx.args[1]));
      if (!target || !amount || amount < 1) return ctx.usage();
      const data = await ctx.db.updateScoped("xp", ctx.guild.id, target.id, defaults, async (current) => ({ ...current, xp: Math.max(0, current.xp - amount), updatedAt: new Date().toISOString() }));
      await ctx.success(`Foram removidos **${amount} XP** de ${target}. Total atual: **${data.xp} XP**.`, "XP removido");
    }
  })
];

module.exports = { commands };

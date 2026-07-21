const { defineCommand } = require("../../bot/prefix/command");
const { randomInt } = require("../../bot/prefix/utils");

function scoreFor(value) {
  let hash = 0;
  for (const character of String(value)) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
  return Math.abs(hash) % 101;
}

async function targetOrAuthor(ctx) {
  return await ctx.getUser() || ctx.author;
}

function actionCommand(name, aliases, verb, description) {
  return defineCommand({
    name, aliases, description, category: "Diversao", usage: "[@usuario]", cooldown: 3,
    async execute(ctx) {
      const target = await targetOrAuthor(ctx);
      const text = target.id === ctx.author.id ? `${ctx.author} ${verb} a si mesmo(a).` : `${ctx.author} ${verb} ${target}.`;
      await ctx.reply({ embeds: [ctx.embed(description, text).setThumbnail(target.displayAvatarURL({ size: 256 }))], allowedMentions: { users: [ctx.author.id, target.id] } });
    }
  });
}

const commands = [
  defineCommand({
    name: "8ball", aliases: ["bola8"], description: "Responde uma pergunta misteriosa.", category: "Diversao", usage: "pergunta", cooldown: 3,
    async execute(ctx) {
      if (!ctx.rawArgs) return ctx.usage();
      const answers = ["Sim, sem duvida.", "Tudo indica que sim.", "Talvez.", "Pergunte novamente mais tarde.", "As chances sao pequenas.", "Nao conte com isso.", "Definitivamente nao."];
      await ctx.info("Bola 8", `**Pergunta:** ${ctx.rawArgs}\n**Resposta:** ${answers[randomInt(0, answers.length - 1)]}`);
    }
  }),
  defineCommand({
    name: "coinflip", aliases: ["caraoucoroa", "moeda"], description: "Joga cara ou coroa.", category: "Diversao",
    async execute(ctx) { await ctx.info("Cara ou coroa", Math.random() < 0.5 ? "Deu **cara**." : "Deu **coroa**."); }
  }),
  defineCommand({
    name: "dice", aliases: ["dado", "roll"], description: "Rola um dado configuravel.", category: "Diversao", usage: "[lados]",
    async execute(ctx) {
      const sides = Math.min(1000000, Math.max(2, Number(ctx.args[0] || 6)));
      await ctx.info(`Dado de ${sides} lados`, `Resultado: **${randomInt(1, sides)}**.`);
    }
  }),
  defineCommand({
    name: "slot", aliases: ["cassino"], description: "Gira uma maquina de premios ficticia.", category: "Diversao", cooldown: 5,
    async execute(ctx) {
      const symbols = ["FOLHA", "COROA", "SELVA", "ROBLOX", "BDS"];
      const result = [0, 1, 2].map(() => symbols[randomInt(0, symbols.length - 1)]);
      const win = new Set(result).size === 1;
      await ctx.info("Maquina da Selva", `\`[ ${result.join(" | ")} ]\`\n${win ? "**Jackpot!**" : "Quase. Tente novamente!"}`);
    }
  }),
  defineCommand({
    name: "ship", aliases: ["casal"], description: "Calcula a combinacao divertida entre duas pessoas.", category: "Diversao", usage: "@usuario1 [@usuario2]",
    async execute(ctx) {
      const users = [...ctx.message.mentions.users.values()];
      const first = users[0] || ctx.author;
      const second = users[1] || (first.id === ctx.author.id ? null : ctx.author);
      if (!second || first.id === second.id) return ctx.usage("Mencione uma pessoa diferente de voce.");
      const score = scoreFor([first.id, second.id].sort().join(":"));
      await ctx.info("Ship da Selva", `${first} + ${second}\nCompatibilidade: **${score}%**\n${"█".repeat(Math.round(score / 10))}${"░".repeat(10 - Math.round(score / 10))}`);
    }
  }),
  defineCommand({
    name: "gay", aliases: ["orgulho"], description: "Medidor divertido de orgulho, sem julgamento.", category: "Diversao", usage: "[@usuario]",
    async execute(ctx) {
      const user = await targetOrAuthor(ctx);
      await ctx.info("Medidor de orgulho", `${user} esta com **${scoreFor(`${user.id}:orgulho`)}%** de energia arco-iris hoje.`);
    }
  }),
  defineCommand({
    name: "iq", aliases: ["inteligencia"], description: "Gera um numero de QI apenas por brincadeira.", category: "Diversao", usage: "[@usuario]",
    async execute(ctx) {
      const user = await targetOrAuthor(ctx);
      await ctx.info("Medidor ficticio de QI", `${user}: **${60 + scoreFor(`${user.id}:iq`)}** pontos.\n*Isto e somente uma brincadeira, nao um teste real.*`);
    }
  }),
  defineCommand({
    name: "rate", aliases: ["nota"], description: "Da uma nota divertida para algo.", category: "Diversao", usage: "texto",
    async execute(ctx) {
      if (!ctx.rawArgs) return ctx.usage();
      await ctx.info("Avaliacao da Selva", `Dou **${scoreFor(ctx.rawArgs.toLowerCase())}/100** para **${ctx.rawArgs.slice(0, 500)}**.`);
    }
  }),
  defineCommand({
    name: "meme", aliases: ["memes"], description: "Busca um meme aleatorio apropriado.", category: "Diversao", cooldown: 8,
    async execute(ctx) {
      const response = await fetch("https://meme-api.com/gimme/wholesomememes").then((result) => result.ok ? result.json() : null).catch(() => null);
      if (!response || !response.url) return ctx.error("Nao consegui buscar um meme agora. Tente novamente depois.");
      await ctx.reply({ embeds: [ctx.embed(response.title || "Meme", `Fonte: r/${response.subreddit || "memes"}`).setImage(response.url)] });
    }
  }),
  defineCommand({
    name: "cat", aliases: ["gato"], description: "Mostra uma imagem aleatoria de gato.", category: "Diversao", cooldown: 5,
    async execute(ctx) { await ctx.reply({ embeds: [ctx.embed("Gato aleatorio", "Uma pausa felina na selva.").setImage(`https://cataas.com/cat?width=700&height=500&t=${Date.now()}`)] }); }
  }),
  defineCommand({
    name: "dog", aliases: ["cachorro"], description: "Mostra uma imagem aleatoria de cachorro.", category: "Diversao", cooldown: 5,
    async execute(ctx) { await ctx.reply({ embeds: [ctx.embed("Cachorro aleatorio", "Direto para alegrar o chat.").setImage(`https://placedog.net/700/500?id=${randomInt(1, 200)}`)] }); }
  }),
  defineCommand({
    name: "joke", aliases: ["piada"], description: "Conta uma piada curta.", category: "Diversao",
    async execute(ctx) {
      const jokes = ["Por que o computador foi ao medico? Porque ele pegou um virus.", "Qual e o cafe mais perigoso? O ex-presso.", "O que o zero disse para o oito? Belo cinto!", "Por que o livro de matematica ficou triste? Porque tinha muitos problemas."];
      await ctx.info("Piada da vez", jokes[randomInt(0, jokes.length - 1)]);
    }
  }),
  defineCommand({
    name: "hack", aliases: ["hackear"], description: "Faz uma simulacao claramente ficticia de hacker.", category: "Diversao", usage: "@usuario", cooldown: 10,
    async execute(ctx) {
      const user = await ctx.getUser();
      if (!user) return ctx.usage();
      await ctx.info("Simulacao concluida", `Alvo: ${user}\nSenha encontrada: \`baile-${scoreFor(user.id)}-selva\`\nArquivos secretos: **0**\n\n*Isto e apenas uma brincadeira e nenhum dado foi acessado.*`);
    }
  }),
  actionCommand("kiss", ["beijar"], "deu um beijo em", "Beijo"),
  actionCommand("hug", ["abracar"], "deu um abraco em", "Abraco"),
  actionCommand("slap", ["tapa"], "deu um tapa cenico em", "Tapa de brincadeira"),
  actionCommand("poke", ["cutucar"], "cutucou", "Cutucada"),
  actionCommand("love", ["amar"], "mandou muito carinho para", "Carinho")
];

module.exports = { commands };

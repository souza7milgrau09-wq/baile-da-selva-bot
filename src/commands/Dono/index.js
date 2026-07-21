const vm = require("node:vm");
const { defineCommand } = require("../../bot/prefix/command");

function ownerCommand(definition) {
  return defineCommand({ category: "Dono", ownerOnly: true, hidden: false, cooldown: 3, ...definition });
}

const commands = [
  ownerCommand({
    name: "eval", aliases: ["avaliar"], description: "Executa JavaScript em um ambiente isolado e limitado.", usage: "expressao",
    async execute(ctx) {
      if (!ctx.rawArgs) return ctx.usage();
      const sandbox = {
        Math,
        JSON,
        Date,
        bot: ctx.bot.getStatus(),
        guild: { id: ctx.guild.id, name: ctx.guild.name, memberCount: ctx.guild.memberCount },
        args: ctx.args
      };
      let result;
      try {
        result = vm.runInNewContext(ctx.rawArgs, sandbox, { timeout: 1500, displayErrors: false });
        if (result && typeof result.then === "function") result = await Promise.race([result, new Promise((_, reject) => setTimeout(() => reject(new Error("Tempo excedido")), 2000))]);
      } catch (error) {
        return ctx.error(`\`${String(error.message).slice(0, 1500)}\``, "Erro no avaliador");
      }
      const output = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      await ctx.info("Resultado isolado", `\`\`\`json\n${String(output).slice(0, 3500)}\n\`\`\``);
    }
  }),
  ownerCommand({
    name: "reload", aliases: ["recarregar"], description: "Recarrega todos os arquivos de comandos.",
    async execute(ctx) {
      const total = await ctx.manager.load();
      await ctx.success(`**${total} comandos** foram recarregados.`, "Comandos recarregados");
    }
  }),
  ownerCommand({
    name: "restart", aliases: ["reiniciar"], description: "Reinicia o processo quando o host possui reinicio automatico.", usage: "confirmar", cooldown: 10,
    async execute(ctx) {
      if (ctx.args[0] !== "confirmar") return ctx.usage("No Render, o servico deve iniciar novamente automaticamente.");
      await ctx.success("Reiniciando o processo...", "Reinicio solicitado");
      setTimeout(() => process.exit(0), 1000);
    }
  }),
  ownerCommand({
    name: "shutdown", aliases: ["desligar"], description: "Desliga o processo atual do bot.", usage: "confirmar", cooldown: 10,
    async execute(ctx) {
      if (ctx.args[0] !== "confirmar") return ctx.usage("O host pode ligar o bot novamente automaticamente.");
      await ctx.success("Desligando o processo...", "Desligamento solicitado");
      setTimeout(() => process.exit(0), 1000);
    }
  }),
  ownerCommand({
    name: "sync", aliases: ["sincronizar"], description: "Registra novamente os comandos slash.", cooldown: 15,
    async execute(ctx) {
      await ctx.bot.registerCommands();
      await ctx.success("Comandos slash sincronizados com o servidor.", "Sincronizacao concluida");
    }
  }),
  ownerCommand({
    name: "deploy", aliases: ["implantar"], description: "Aciona o deploy hook configurado do Render.", cooldown: 60,
    async execute(ctx) {
      const hook = process.env.RENDER_DEPLOY_HOOK;
      if (!hook) return ctx.error("Configure `RENDER_DEPLOY_HOOK` nas variaveis do Render para usar este comando.");
      const response = await fetch(hook, { method: "POST" }).catch(() => null);
      if (!response || !response.ok) return ctx.error("O Render nao aceitou a solicitacao de deploy.");
      await ctx.success("O Render recebeu a solicitacao. O bot reiniciara quando a nova versao ficar pronta.", "Deploy iniciado");
    }
  }),
  ownerCommand({
    name: "servers", aliases: ["servidores"], description: "Lista os servidores onde o bot esta.",
    async execute(ctx) {
      const guilds = ctx.client.guilds.cache.sort((a, b) => b.memberCount - a.memberCount);
      await ctx.info("Servidores conectados", guilds.first(30).map((guild) => `**${guild.name}** - ${guild.memberCount} membros - \`${guild.id}\``).join("\n") || "Nenhum servidor.");
    }
  }),
  ownerCommand({
    name: "leave", aliases: ["sairservidor"], description: "Remove o bot de um servidor.", usage: "ID_do_servidor confirmar", cooldown: 10,
    async execute(ctx) {
      if (ctx.args[1] !== "confirmar") return ctx.usage();
      const guild = ctx.client.guilds.cache.get(ctx.args[0]);
      if (!guild) return ctx.error("Servidor nao encontrado.");
      await ctx.success(`Saindo de **${guild.name}**.`, "Saida confirmada");
      await guild.leave();
    }
  }),
  ownerCommand({
    name: "announce", aliases: ["anunciar"], description: "Envia um anuncio em um canal.", usage: "#canal titulo | mensagem", cooldown: 5,
    async execute(ctx) {
      const channel = await ctx.getChannel();
      const text = ctx.rawArgs.replace(/<#\d+>/, "").trim();
      const [title, ...description] = text.split("|").map((value) => value.trim());
      if (!channel || !title || !description.join(" | ")) return ctx.usage();
      await channel.send({ embeds: [ctx.embed(title, description.join(" | "))] });
      await ctx.success(`Anuncio enviado em ${channel}.`, "Anuncio publicado");
    }
  }),
  ownerCommand({
    name: "maintenance", aliases: ["manutencao"], description: "Liga ou desliga a manutencao dos comandos.", usage: "on [mensagem] | off",
    async execute(ctx) {
      const enabled = ["on", "ativar"].includes(String(ctx.args[0]).toLowerCase());
      if (!enabled && ctx.args[0] !== "off") return ctx.usage();
      const message = ctx.args.slice(1).join(" ") || ctx.config.commandPermissions.maintenanceMessage;
      await ctx.db.setConfig({ commandPermissions: { maintenance: enabled, maintenanceMessage: message } });
      await ctx.success(enabled ? `Manutencao ativada.\nMensagem: ${message}` : "Manutencao desativada.", "Manutencao atualizada");
    }
  })
];

module.exports = { commands };

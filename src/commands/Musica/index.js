const { defineCommand } = require("../../bot/prefix/command");

function parseSeconds(value) {
  const parts = String(value || "").split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part) || part < 0)) return -1;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return -1;
}

async function musicReady(ctx, needsQueue = true) {
  const moduleConfig = ctx.config.modules["entertainment-music"] || {};
  if (!ctx.config.music.enabled && !moduleConfig.enabled) {
    await ctx.error("O modulo de musica esta desativado no painel.");
    return null;
  }
  if (!ctx.bot.music || !ctx.bot.music.available()) {
    await ctx.error("O DisTube nao foi carregado neste host. Instale as dependencias de audio e reinicie o bot.");
    return null;
  }
  const voice = ctx.member.voice.channel;
  if (!voice) {
    await ctx.error("Entre em um canal de voz primeiro.");
    return null;
  }
  const queue = ctx.bot.music.queue(ctx.guild);
  if (queue && queue.voiceChannel && queue.voiceChannel.id !== voice.id) {
    await ctx.error(`Entre no canal ${queue.voiceChannel} para controlar a musica.`);
    return null;
  }
  if (needsQueue && !queue) {
    await ctx.error("Nao ha nenhuma musica tocando neste servidor.");
    return null;
  }
  return { voice, queue };
}

const commands = [
  defineCommand({
    name: "play", aliases: ["p", "tocar"], description: "Toca uma musica ou adiciona a fila.", category: "Musica", usage: "nome ou link", cooldown: 3,
    async execute(ctx) {
      const state = await musicReady(ctx, false);
      if (!state || !ctx.rawArgs) return state ? ctx.usage() : undefined;
      await ctx.bot.music.distube.play(state.voice, ctx.rawArgs, { message: ctx.message, textChannel: ctx.channel, member: ctx.member });
    }
  }),
  defineCommand({ name: "pause", aliases: ["pausar"], description: "Pausa a musica atual.", category: "Musica", async execute(ctx) { const state = await musicReady(ctx); if (state) { await state.queue.pause(); await ctx.success("Reproducao pausada.", "Musica pausada"); } } }),
  defineCommand({ name: "resume", aliases: ["continuar"], description: "Continua a musica pausada.", category: "Musica", async execute(ctx) { const state = await musicReady(ctx); if (state) { await state.queue.resume(); await ctx.success("Reproducao retomada.", "Musica continuando"); } } }),
  defineCommand({ name: "stop", aliases: ["parar"], description: "Para a musica e limpa a fila.", category: "Musica", async execute(ctx) { const state = await musicReady(ctx); if (state) { await state.queue.stop(); await ctx.success("Fila encerrada e canal de voz liberado.", "Musica parada"); } } }),
  defineCommand({ name: "skip", aliases: ["pular", "next"], description: "Pula para a proxima musica.", category: "Musica", async execute(ctx) { const state = await musicReady(ctx); if (state) { const song = await state.queue.skip(); await ctx.success(`Pulando para **${song.name}**.`, "Musica pulada"); } } }),
  defineCommand({
    name: "queue", aliases: ["fila", "q"], description: "Mostra a fila de reproducao.", category: "Musica",
    async execute(ctx) {
      const state = await musicReady(ctx);
      if (!state) return;
      const lines = state.queue.songs.slice(0, 20).map((song, index) => `${index === 0 ? "Tocando" : `${index}.`} **${song.name}** - ${song.formattedDuration || "ao vivo"}`);
      await ctx.info("Fila de musica", lines.join("\n"));
    }
  }),
  defineCommand({
    name: "loop", aliases: ["repetir"], description: "Alterna repeticao desligada, musica e fila.", category: "Musica", usage: "[off|song|queue]",
    async execute(ctx) {
      const state = await musicReady(ctx);
      if (!state) return;
      const modes = { off: 0, song: 1, musica: 1, queue: 2, fila: 2 };
      const mode = ctx.args[0] ? modes[String(ctx.args[0]).toLowerCase()] : undefined;
      if (ctx.args[0] && mode === undefined) return ctx.usage();
      const selected = state.queue.setRepeatMode(mode);
      await ctx.success(`Modo de repeticao: **${["Desligado", "Musica atual", "Fila inteira"][selected]}**.`, "Repeticao atualizada");
    }
  }),
  defineCommand({ name: "shuffle", aliases: ["embaralhar"], description: "Embaralha as proximas musicas.", category: "Musica", async execute(ctx) { const state = await musicReady(ctx); if (state) { await state.queue.shuffle(); await ctx.success("A fila foi embaralhada.", "Fila atualizada"); } } }),
  defineCommand({
    name: "removetrack", aliases: ["removermusica"], description: "Remove uma musica da fila pela posicao.", category: "Musica", usage: "posicao",
    async execute(ctx) {
      const state = await musicReady(ctx);
      if (!state) return;
      const position = Number(ctx.args[0]);
      if (!Number.isInteger(position) || position < 1 || position >= state.queue.songs.length) return ctx.usage();
      const [song] = state.queue.songs.splice(position, 1);
      await ctx.success(`**${song.name}** foi removida da fila.`, "Musica removida");
    }
  }),
  defineCommand({
    name: "volume", aliases: ["vol"], description: "Altera o volume da reproducao.", category: "Musica", usage: "0-150",
    async execute(ctx) {
      const state = await musicReady(ctx);
      if (!state) return;
      const max = Number(ctx.config.music.maxVolume || 150);
      const volume = Number(ctx.args[0]);
      if (!Number.isInteger(volume) || volume < 0 || volume > max) return ctx.usage(`O maximo configurado e ${max}.`);
      state.queue.setVolume(volume);
      await ctx.success(`Volume definido em **${volume}%**.`, "Volume atualizado");
    }
  }),
  defineCommand({
    name: "seek", aliases: ["avancar"], description: "Pula para um tempo da musica atual.", category: "Musica", usage: "segundos ou mm:ss",
    async execute(ctx) {
      const state = await musicReady(ctx);
      if (!state) return;
      const seconds = parseSeconds(ctx.args[0]);
      if (seconds < 0 || seconds >= state.queue.songs[0].duration) return ctx.usage();
      await state.queue.seek(seconds);
      await ctx.success(`Reproducao movida para **${ctx.args[0]}**.`, "Tempo alterado");
    }
  }),
  defineCommand({
    name: "nowplaying", aliases: ["np", "tocando"], description: "Mostra a musica que esta tocando.", category: "Musica",
    async execute(ctx) {
      const state = await musicReady(ctx);
      if (!state) return;
      const song = state.queue.songs[0];
      const embed = ctx.embed("Tocando agora", `[${song.name}](${song.url})`)
        .addFields(
          { name: "Progresso", value: `${state.queue.formattedCurrentTime} / ${song.formattedDuration || "ao vivo"}`, inline: true },
          { name: "Volume", value: `${state.queue.volume}%`, inline: true },
          { name: "Pedido por", value: song.user ? `<@${song.user.id}>` : "Desconhecido", inline: true }
        );
      if (song.thumbnail) embed.setThumbnail(song.thumbnail);
      await ctx.reply({ embeds: [embed] });
    }
  }),
  defineCommand({
    name: "lyrics", aliases: ["letra"], description: "Busca a letra da musica atual ou informada.", category: "Musica", usage: "[artista - musica]", cooldown: 10,
    async execute(ctx) {
      let query = ctx.rawArgs;
      if (!query && ctx.bot.music && ctx.bot.music.queue(ctx.guild)) query = ctx.bot.music.queue(ctx.guild).songs[0].name;
      const [artist, title] = String(query || "").split("-").map((value) => value.trim());
      if (!artist || !title) return ctx.usage("Use o formato `artista - musica`.");
      const data = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`).then((response) => response.ok ? response.json() : null).catch(() => null);
      if (!data || !data.lyrics) return ctx.error("Letra nao encontrada.");
      await ctx.info(`Letra: ${artist} - ${title}`, data.lyrics.slice(0, 3900));
    }
  })
];

module.exports = { commands };

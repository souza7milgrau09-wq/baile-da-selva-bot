class MusicService {
  constructor(client, db) {
    this.client = client;
    this.db = db;
    this.distube = null;
    this.loadError = "";
    this.initialize();
  }

  initialize() {
    try {
      const { DisTube } = require("distube");
      this.distube = new DisTube(this.client, { emitNewSongOnly: true });
      this.distube.on("playSong", (queue, song) => {
        if (!queue.textChannel) return;
        queue.textChannel.send({
          embeds: [{
            color: 0x24c46b,
            title: "Tocando agora",
            description: `[${song.name}](${song.url})`,
            fields: [
              { name: "Duracao", value: song.formattedDuration || "Ao vivo", inline: true },
              { name: "Pedido por", value: song.user ? `<@${song.user.id}>` : "Desconhecido", inline: true }
            ]
          }]
        }).catch(() => undefined);
      });
      this.distube.on("addSong", (queue, song) => {
        if (!queue.textChannel) return;
        queue.textChannel.send({ content: `Adicionado a fila: **${song.name}** (${song.formattedDuration || "ao vivo"}).` }).catch(() => undefined);
      });
      this.distube.on("error", (error, queue) => {
        const channel = queue && queue.textChannel;
        if (channel) channel.send({ content: `Nao consegui reproduzir essa musica: ${error.message}` }).catch(() => undefined);
        this.db.addEvent("music_error", { message: error.message }).catch(() => undefined);
      });
    } catch (error) {
      this.loadError = error.message;
    }
  }

  available() {
    return Boolean(this.distube);
  }

  queue(guild) {
    return this.distube ? this.distube.getQueue(guild) : null;
  }
}

module.exports = { MusicService };

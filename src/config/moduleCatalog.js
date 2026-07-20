const moduleCatalog = [
  {
    key: "security",
    title: "Seguranca",
    group: "Controle",
    icon: "S",
    description: "Automod, anti-link, anti-convite, palavras bloqueadas e logs de protecao.",
    fields: [
      { name: "enabled", label: "Modulo ativo", type: "checkbox" },
      { name: "automodEnabled", label: "Automod ativo", type: "checkbox" },
      { name: "blockInvites", label: "Bloquear convites de Discord", type: "checkbox" },
      { name: "blockLinks", label: "Bloquear links externos", type: "checkbox" },
      { name: "blockCaps", label: "Bloquear mensagens em caps lock", type: "checkbox" },
      { name: "blockedWords", label: "Palavras bloqueadas", type: "textarea", placeholder: "Uma palavra por linha" },
      { name: "timeoutMinutes", label: "Timeout automatico em minutos", type: "number", min: 0 },
      { name: "logChannelId", label: "Canal de logs de seguranca", type: "text", placeholder: "ID do canal" }
    ]
  },
  {
    key: "server",
    title: "Servidor",
    group: "Controle",
    icon: "SV",
    description: "Canais principais, logs, regras, anuncios e estatisticas do servidor.",
    fields: [
      { name: "enabled", label: "Modulo ativo", type: "checkbox" },
      { name: "rulesChannelId", label: "Canal de regras", type: "text", placeholder: "ID do canal" },
      { name: "announcementsChannelId", label: "Canal de anuncios", type: "text", placeholder: "ID do canal" },
      { name: "memberLogChannelId", label: "Canal de entrada/saida", type: "text", placeholder: "ID do canal" },
      { name: "statsEnabled", label: "Estatisticas ativas", type: "checkbox" },
      { name: "statsChannelId", label: "Canal de estatisticas", type: "text", placeholder: "ID do canal" },
      { name: "slowmodeSeconds", label: "Slowmode padrao em segundos", type: "number", min: 0 }
    ]
  },
  {
    key: "community",
    title: "Comunidade",
    group: "Comunidade",
    icon: "C",
    description: "Level, sugestoes, sorteios, cargos por reacao e respostas automaticas.",
    fields: [
      { name: "enabled", label: "Modulo ativo", type: "checkbox" },
      { name: "levelingEnabled", label: "Sistema de level ativo", type: "checkbox" },
      { name: "xpPerMessage", label: "XP por mensagem", type: "number", min: 0 },
      { name: "suggestionsChannelId", label: "Canal de sugestoes", type: "text", placeholder: "ID do canal" },
      { name: "giveawaysChannelId", label: "Canal de sorteios", type: "text", placeholder: "ID do canal" },
      { name: "reactionRolesNote", label: "Painel de cargos por reacao", type: "textarea", placeholder: "Anote cargos, emojis e canais aqui" },
      { name: "autoResponderRules", label: "Respostas automaticas", type: "textarea", placeholder: "oi => Bem-vindo ao Baile da Selva" }
    ]
  },
  {
    key: "entertainment",
    title: "Entretenimento",
    group: "Comunidade",
    icon: "E",
    description: "Comandos de diversao, respostas rapidas, jogos simples e interacoes.",
    fields: [
      { name: "enabled", label: "Modulo ativo", type: "checkbox" },
      { name: "funCommandsEnabled", label: "Comandos de diversao ativos", type: "checkbox" },
      { name: "coinflipEnabled", label: "Cara ou coroa ativo", type: "checkbox" },
      { name: "eightBallEnabled", label: "Perguntas 8ball ativas", type: "checkbox" },
      { name: "commandChannelId", label: "Canal de comandos", type: "text", placeholder: "ID do canal opcional" },
      { name: "blockedChannels", label: "Canais bloqueados para diversao", type: "textarea", placeholder: "Um ID por linha" }
    ]
  },
  {
    key: "vips",
    title: "VIPs",
    group: "Atendimento",
    icon: "V",
    description: "Cargo VIP, beneficios, canal VIP e entrega manual pela equipe.",
    fields: [
      { name: "enabled", label: "Modulo ativo", type: "checkbox" },
      { name: "vipRoleId", label: "Cargo VIP", type: "text", placeholder: "ID do cargo" },
      { name: "vipChannelId", label: "Canal VIP", type: "text", placeholder: "ID do canal" },
      { name: "syncWithStore", label: "Usar produtos da loja interna para VIP", type: "checkbox" },
      { name: "benefits", label: "Beneficios do VIP", type: "textarea", placeholder: "Um beneficio por linha" },
      { name: "welcomeVipMessage", label: "Mensagem ao entregar VIP", type: "textarea" }
    ]
  },
  {
    key: "movcall",
    title: "Mov.Call",
    group: "Atendimento",
    icon: "MC",
    description: "Canais de voz temporarios, limite padrao e modelo de nome.",
    fields: [
      { name: "enabled", label: "Modulo ativo", type: "checkbox" },
      { name: "creatorChannelId", label: "Canal criador de call", type: "text", placeholder: "ID do canal de voz" },
      { name: "categoryId", label: "Categoria das calls", type: "text", placeholder: "ID da categoria" },
      { name: "defaultUserLimit", label: "Limite padrao de usuarios", type: "number", min: 0 },
      { name: "channelNameTemplate", label: "Modelo do nome", type: "text", placeholder: "Call de {user}" },
      { name: "allowOwnerLock", label: "Permitir dono trancar call", type: "checkbox" }
    ]
  },
  {
    key: "checkers",
    title: "Damas",
    group: "Entretenimento",
    icon: "D",
    description: "Area para organizar partidas de damas, ranking e canal do jogo.",
    fields: [
      { name: "enabled", label: "Modulo ativo", type: "checkbox" },
      { name: "channelId", label: "Canal de damas", type: "text", placeholder: "ID do canal" },
      { name: "rankingEnabled", label: "Ranking ativo", type: "checkbox" },
      { name: "allowSpectators", label: "Permitir espectadores", type: "checkbox" },
      { name: "winRoleId", label: "Cargo de vencedor", type: "text", placeholder: "ID do cargo opcional" },
      { name: "rulesText", label: "Regras do jogo", type: "textarea" }
    ]
  },
  {
    key: "tools",
    title: "Ferramentas",
    group: "Ferramentas",
    icon: "F",
    description: "Embeds, mensagens fixas, limpeza automatica, lembretes e backups.",
    fields: [
      { name: "enabled", label: "Modulo ativo", type: "checkbox" },
      { name: "embedBuilderEnabled", label: "Criador de embeds ativo", type: "checkbox" },
      { name: "scheduledMessagesEnabled", label: "Mensagens agendadas ativas", type: "checkbox" },
      { name: "stickyMessagesEnabled", label: "Mensagens fixas ativas", type: "checkbox" },
      { name: "autoPurgeEnabled", label: "Limpeza automatica ativa", type: "checkbox" },
      { name: "purgeChannelIds", label: "Canais de limpeza", type: "textarea", placeholder: "Um ID por linha" },
      { name: "backupNote", label: "Anotacoes de backup", type: "textarea" }
    ]
  },
  {
    key: "conversions",
    title: "Conversoes",
    group: "Ferramentas",
    icon: "CV",
    description: "Calculadora de conversao para Roblox/Robux e loja interna sem assinatura do painel.",
    fields: [
      { name: "enabled", label: "Modulo ativo", type: "checkbox" },
      { name: "calculatorEnabled", label: "Calculadora ativa", type: "checkbox" },
      { name: "robuxRate", label: "Cotacao base", type: "text", placeholder: "Ex: 1000 Robux = R$ 35" },
      { name: "taxPercent", label: "Taxa Roblox em porcentagem", type: "number", min: 0 },
      { name: "resultChannelId", label: "Canal para resultados", type: "text", placeholder: "ID do canal opcional" },
      { name: "notes", label: "Notas da conversao", type: "textarea" }
    ]
  }
];

function findModule(key) {
  return moduleCatalog.find((module) => module.key === key);
}

module.exports = { findModule, moduleCatalog };

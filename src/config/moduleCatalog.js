function statusCard(description) {
  return {
    title: "Status do Sistema",
    icon: "ON",
    description,
    fields: [
      { name: "enabled", label: "Ativar esta funcao", type: "checkbox" },
      { name: "silentMode", label: "Modo silencioso", type: "checkbox" }
    ]
  };
}

function permissionCard() {
  return {
    title: "Cargos Permitidos",
    icon: "RL",
    description: "Cargos que podem usar ou controlar esta funcao.",
    fields: [
      { name: "allowedRoleIds", label: "Cargos permitidos", type: "textarea", list: true, placeholder: "Um ID por linha" },
      { name: "blockedRoleIds", label: "Cargos bloqueados", type: "textarea", list: true, placeholder: "Um ID por linha" }
    ]
  };
}

function channelCard() {
  return {
    title: "Canais e Logs",
    icon: "#",
    description: "Escolha onde a funcao trabalha e onde os registros aparecem.",
    fields: [
      { name: "channelId", label: "Canal principal", type: "text", placeholder: "ID do canal" },
      { name: "logChannelId", label: "Canal de logs", type: "text", placeholder: "ID do canal" }
    ]
  };
}

function rulesCard(fields = []) {
  return {
    title: "Regras da Funcao",
    icon: "CF",
    description: "Ajustes principais desta area.",
    fields
  };
}

function textCard(title, name, label, placeholder = "") {
  return {
    title,
    icon: "TX",
    description: "Texto configuravel do painel ou do bot.",
    fields: [
      { name, label, type: "textarea", placeholder }
    ]
  };
}

const categoryCatalog = [
  {
    key: "bot",
    title: "Bot",
    icon: "BT",
    items: [
      {
        key: "bot-profile",
        title: "Perfil do Bot",
        description: "Nome, prefixo, idioma, avatar e banner do Baile da Selva.",
        cards: [
          statusCard("Quando ativado, o painel usa estes dados como identidade principal."),
          rulesCard([
            { name: "botName", label: "Nome do bot", type: "text", placeholder: "Baile da Selva" },
            { name: "prefix", label: "Prefixo", type: "text", placeholder: "bs!" },
            { name: "language", label: "Idioma", type: "text", placeholder: "pt-BR" }
          ]),
          rulesCard([
            { name: "avatarUrl", label: "Avatar por URL", type: "text", placeholder: "https://..." },
            { name: "bannerUrl", label: "Banner por URL", type: "text", placeholder: "https://..." }
          ]),
          textCard("Descricao do Painel", "tagline", "Texto curto", "Painel privado do Baile da Selva")
        ]
      },
      {
        key: "bot-commands",
        title: "Comandos",
        description: "Controle de comandos por prefixo e slash commands.",
        cards: [
          statusCard("Liga ou desliga a area de comandos configuraveis."),
          permissionCard(),
          channelCard(),
          rulesCard([
            { name: "prefixCommands", label: "Comandos por prefixo", type: "checkbox" },
            { name: "slashCommands", label: "Slash commands", type: "checkbox" },
            { name: "deleteUnknownCommands", label: "Apagar comandos desconhecidos", type: "checkbox" }
          ]),
          textCard("Comandos Bloqueados", "blockedCommands", "Lista de comandos bloqueados", "Um comando por linha")
        ]
      },
      {
        key: "bot-presence",
        title: "Status / Presence",
        description: "Status customizado do bot no Discord.",
        cards: [
          statusCard("Mostra uma atividade customizada no perfil do bot."),
          rulesCard([
            { name: "activityType", label: "Tipo de status", type: "text", placeholder: "Playing, Watching, Listening" },
            { name: "activityText", label: "Texto do status", type: "text", placeholder: "Baile da Selva" },
            { name: "rotateStatus", label: "Alternar status automaticamente", type: "checkbox" }
          ]),
          textCard("Status Alternativos", "statusList", "Lista de status", "Um status por linha")
        ]
      },
      {
        key: "bot-permissions",
        title: "Permissoes",
        description: "Bloqueios de permissao para proteger o servidor.",
        cards: [statusCard("Controla permissoes usadas pelo bot."), permissionCard(), channelCard()]
      }
    ]
  },
  {
    key: "security",
    title: "Seguranca",
    icon: "S",
    items: [
      {
        key: "security-anti-raid",
        title: "Anti-Raid (Principal)",
        description: "Detecta entrada rapida de membros e aciona medidas de protecao.",
        cards: [
          statusCard("Quando ativo, monitora entradas em massa."),
          rulesCard([
            { name: "joinLimit", label: "Limite de entradas", type: "number", min: 0 },
            { name: "secondsWindow", label: "Janela em segundos", type: "number", min: 0 },
            { name: "lockServer", label: "Trancar servidor ao detectar raid", type: "checkbox" }
          ]),
          channelCard()
        ]
      },
      {
        key: "security-anti-bot",
        title: "Anti Bot",
        description: "Controla entrada de bots nao autorizados.",
        cards: [
          statusCard("Bloqueia bots adicionados sem permissao."),
          rulesCard([
            { name: "kickUnknownBots", label: "Expulsar bots desconhecidos", type: "checkbox" },
            { name: "requireApproval", label: "Exigir aprovacao da equipe", type: "checkbox" }
          ]),
          permissionCard(),
          channelCard()
        ]
      },
      {
        key: "security-anti-fake",
        title: "Anti Fake",
        description: "Filtra contas novas ou suspeitas.",
        cards: [
          statusCard("Verifica idade e padroes basicos da conta."),
          rulesCard([
            { name: "minimumAccountAgeHours", label: "Idade minima da conta em horas", type: "number", min: 0 },
            { name: "requireAvatar", label: "Exigir avatar", type: "checkbox" },
            { name: "quarantineRoleId", label: "Cargo de quarentena", type: "text", placeholder: "ID do cargo" }
          ]),
          channelCard()
        ]
      },
      {
        key: "security-anti-ban",
        title: "Anti Ban",
        description: "Acompanha banimentos em massa e protege cargos importantes.",
        cards: [
          statusCard("Detecta excesso de banimentos por moderadores."),
          rulesCard([
            { name: "banLimit", label: "Limite de banimentos", type: "number", min: 0 },
            { name: "minutesWindow", label: "Janela em minutos", type: "number", min: 0 },
            { name: "removeRolesFromActor", label: "Remover cargos de quem exceder", type: "checkbox" }
          ]),
          permissionCard(),
          channelCard()
        ]
      },
      {
        key: "security-anti-link-invite",
        title: "Anti Link/Convite",
        description: "Bloqueia links externos e convites de Discord.",
        cards: [
          statusCard("Quando ativo, remove mensagens com links ou convites proibidos."),
          rulesCard([
            { name: "blockInvites", label: "Bloquear convites Discord", type: "checkbox" },
            { name: "blockLinks", label: "Bloquear links externos", type: "checkbox" },
            { name: "timeoutMinutes", label: "Timeout em minutos", type: "number", min: 0 }
          ]),
          textCard("Links Liberados", "allowedDomains", "Dominios permitidos", "discord.gg/seuservidor\nroblox.com"),
          permissionCard(),
          channelCard()
        ]
      },
      {
        key: "security-warns",
        title: "Avisos (Warns)",
        description: "Sistema de avisos e punicao progressiva.",
        cards: [
          statusCard("Controla avisos aplicados pela equipe."),
          rulesCard([
            { name: "maxWarns", label: "Maximo de warns antes de acao", type: "number", min: 0 },
            { name: "autoTimeout", label: "Timeout automatico ao atingir limite", type: "checkbox" },
            { name: "dmUser", label: "Enviar aviso no privado", type: "checkbox" }
          ]),
          permissionCard(),
          channelCard()
        ]
      },
      {
        key: "security-advertencias",
        title: "Advertencias",
        description: "Advertencias manuais para staff e membros.",
        cards: [statusCard("Organiza advertencias manuais."), permissionCard(), channelCard(), textCard("Motivos Padrao", "defaultReasons", "Motivos", "Um motivo por linha")]
      },
      {
        key: "security-anti-spam",
        title: "Anti Spam",
        description: "Detecta flood, caps lock e repeticao de mensagens.",
        cards: [
          statusCard("Remove mensagens repetidas ou agressivas."),
          rulesCard([
            { name: "blockCaps", label: "Bloquear caps lock", type: "checkbox" },
            { name: "messageLimit", label: "Mensagens permitidas", type: "number", min: 0 },
            { name: "secondsWindow", label: "Janela em segundos", type: "number", min: 0 },
            { name: "timeoutMinutes", label: "Timeout em minutos", type: "number", min: 0 }
          ]),
          channelCard()
        ]
      },
      {
        key: "security-auto-backup",
        title: "Backup Automatico",
        description: "Anota rotina de backup dos canais e cargos.",
        cards: [
          statusCard("Guarda uma rotina configurada para backup."),
          rulesCard([
            { name: "intervalHours", label: "Intervalo em horas", type: "number", min: 0 },
            { name: "keepLast", label: "Quantidade para guardar", type: "number", min: 0 }
          ]),
          textCard("Anotacoes", "backupNotes", "Notas de backup")
        ]
      },
      {
        key: "security-punishment-block",
        title: "Bloqueio de Castigos",
        description: "Controle quem pode aplicar castigos e bloqueie castigos manuais.",
        cards: [
          statusCard("Quando ativo, controla quem pode aplicar castigos por comandos."),
          rulesCard([
            { name: "blockManualPunishments", label: "Bloquear castigos manuais", type: "checkbox" },
            { name: "blockCommandPunishments", label: "Bloquear castigos por comandos", type: "checkbox" }
          ]),
          permissionCard(),
          channelCard()
        ]
      },
      {
        key: "security-blacklist",
        title: "Blacklist",
        description: "Lista de usuarios proibidos ou monitorados.",
        cards: [statusCard("Ativa blacklist do servidor."), textCard("Usuarios", "userIds", "IDs dos usuarios", "Um ID por linha"), channelCard()]
      },
      {
        key: "security-command-block",
        title: "Bloqueio de Comandos",
        description: "Bloqueia comandos por canal, cargo ou usuario.",
        cards: [statusCard("Controla comandos bloqueados."), textCard("Comandos", "blockedCommands", "Comandos bloqueados"), permissionCard(), channelCard()]
      },
      {
        key: "security-permission-block",
        title: "Bloqueio de Permissoes",
        description: "Evita uso indevido de permissoes sensiveis.",
        cards: [statusCard("Monitora permissoes sensiveis."), permissionCard(), channelCard(), textCard("Permissoes", "blockedPermissions", "Permissoes bloqueadas")]
      },
      {
        key: "security-ban-limit",
        title: "Limite de Banimentos",
        description: "Define limite de banimentos por periodo.",
        cards: [statusCard("Controla excesso de banimentos."), rulesCard([{ name: "limit", label: "Limite", type: "number", min: 0 }, { name: "minutesWindow", label: "Janela em minutos", type: "number", min: 0 }]), permissionCard(), channelCard()]
      },
      {
        key: "security-role-protection",
        title: "Protecao de Cargos",
        description: "Protege cargos contra exclusao e alteracoes.",
        cards: [statusCard("Monitora alteracoes em cargos."), textCard("Cargos Protegidos", "protectedRoleIds", "IDs dos cargos", "Um ID por linha"), permissionCard(), channelCard()]
      },
      {
        key: "security-url-protection",
        title: "Protecao de URL",
        description: "Protege URL personalizada e convites oficiais.",
        cards: [statusCard("Monitora alteracoes de URL/convite."), rulesCard([{ name: "officialInvite", label: "Convite oficial", type: "text", placeholder: "discord.gg/..." }]), channelCard()]
      },
      {
        key: "security-approval-ban",
        title: "Banimento por Aprovacao",
        description: "Banimentos passam por aprovacao da equipe.",
        cards: [statusCard("Exige aprovacao para banir."), permissionCard(), channelCard()]
      },
      {
        key: "security-block-words-images",
        title: "Bloquear Palavras e Imagens",
        description: "Bloqueia palavras, termos e anexos indesejados.",
        cards: [
          statusCard("Remove conteudo proibido automaticamente."),
          rulesCard([
            { name: "blockImages", label: "Bloquear imagens", type: "checkbox" },
            { name: "blockFiles", label: "Bloquear arquivos", type: "checkbox" },
            { name: "timeoutMinutes", label: "Timeout em minutos", type: "number", min: 0 }
          ]),
          { title: "Palavras Bloqueadas", icon: "PW", description: "Termos que o bot deve bloquear.", fields: [{ name: "blockedWords", label: "Palavras", type: "textarea", list: true, placeholder: "Uma palavra por linha" }] },
          permissionCard(),
          channelCard()
        ]
      }
    ]
  },
  {
    key: "server",
    title: "Servidor",
    icon: "SV",
    items: [
      { key: "server-welcome", title: "Boas-vindas", description: "Mensagem de entrada e cargo automatico.", cards: [statusCard("Ativa mensagem de boas-vindas."), channelCard(), rulesCard([{ name: "autoRoleId", label: "Cargo automatico", type: "text", placeholder: "ID do cargo" }]), textCard("Mensagem", "message", "Mensagem", "Bem-vindo {user} ao Baile da Selva")] },
      { key: "server-logs", title: "Logs Gerais", description: "Registros de mensagens, cargos, canais e membros.", cards: [statusCard("Ativa logs gerais."), channelCard(), rulesCard([{ name: "messageLogs", label: "Logs de mensagens", type: "checkbox" }, { name: "memberLogs", label: "Logs de membros", type: "checkbox" }, { name: "roleLogs", label: "Logs de cargos", type: "checkbox" }, { name: "voiceLogs", label: "Logs de voz", type: "checkbox" }])] },
      { key: "server-rules", title: "Regras", description: "Painel de regras do servidor.", cards: [statusCard("Ativa painel de regras."), channelCard(), textCard("Texto das Regras", "rulesText", "Regras")] },
      { key: "server-announcements", title: "Anuncios", description: "Mensagens e avisos da equipe.", cards: [statusCard("Ativa anuncios pelo painel."), channelCard(), permissionCard(), textCard("Modelo", "template", "Modelo de anuncio")] },
      { key: "server-verification", title: "Verificacao", description: "Gate de verificacao para novos membros.", cards: [statusCard("Ativa verificacao."), channelCard(), rulesCard([{ name: "verifiedRoleId", label: "Cargo verificado", type: "text", placeholder: "ID do cargo" }, { name: "buttonLabel", label: "Texto do botao", type: "text", placeholder: "Verificar" }])] },
      { key: "server-counters", title: "Contadores", description: "Canais de contagem de membros e status.", cards: [statusCard("Ativa contadores."), rulesCard([{ name: "membersChannelId", label: "Canal total de membros", type: "text", placeholder: "ID do canal" }, { name: "botsChannelId", label: "Canal total de bots", type: "text", placeholder: "ID do canal" }, { name: "updateMinutes", label: "Atualizar a cada minutos", type: "number", min: 0 }])] }
    ]
  },
  {
    key: "community",
    title: "Comunidade",
    icon: "C",
    items: [
      { key: "community-leveling", title: "Level", description: "XP, ranking e recompensas por atividade.", cards: [statusCard("Ativa sistema de level."), channelCard(), rulesCard([{ name: "xpPerMessage", label: "XP por mensagem", type: "number", min: 0 }, { name: "cooldownSeconds", label: "Cooldown em segundos", type: "number", min: 0 }]), textCard("Recompensas", "rewardRoles", "Cargos por level", "10 => ID do cargo")] },
      { key: "community-suggestions", title: "Sugestoes", description: "Canal de sugestoes com aprovacao.", cards: [statusCard("Ativa sugestoes."), channelCard(), permissionCard()] },
      { key: "community-giveaways", title: "Sorteios", description: "Sorteios com tempo e vencedores.", cards: [statusCard("Ativa sorteios."), channelCard(), permissionCard(), rulesCard([{ name: "maxWinners", label: "Maximo de vencedores", type: "number", min: 0 }])] },
      { key: "community-polls", title: "Enquetes", description: "Enquetes com botoes.", cards: [statusCard("Ativa enquetes."), channelCard(), permissionCard()] },
      { key: "community-reaction-roles", title: "Cargos por Reacao", description: "Painel de cargos por botao, menu ou reacao.", cards: [statusCard("Ativa cargos por reacao."), channelCard(), textCard("Cargos", "rolePanel", "Cargos e emojis", "emoji | cargo ID | nome")] },
      { key: "community-auto-responder", title: "Auto Responder", description: "Respostas automaticas por palavra-chave.", cards: [statusCard("Ativa respostas automaticas."), channelCard(), textCard("Regras", "autoResponderRules", "Gatilhos", "oi => Bem-vindo {user}")] },
      { key: "community-events", title: "Eventos", description: "Eventos, lembretes e RSVP.", cards: [statusCard("Ativa eventos."), channelCard(), rulesCard([{ name: "reminderMinutes", label: "Lembrete em minutos", type: "number", min: 0 }, { name: "rolePingId", label: "Cargo para avisar", type: "text", placeholder: "ID do cargo" }])] },
      { key: "community-afk", title: "AFK", description: "Respostas quando membros ficam ausentes.", cards: [statusCard("Ativa AFK."), channelCard(), rulesCard([{ name: "deleteAfterSeconds", label: "Apagar resposta em segundos", type: "number", min: 0 }])] }
    ]
  },
  {
    key: "entertainment",
    title: "Entretenimento",
    icon: "E",
    items: [
      { key: "entertainment-commands", title: "Comandos Fun", description: "Cara ou coroa, 8ball e respostas simples.", cards: [statusCard("Ativa comandos de diversao."), channelCard(), rulesCard([{ name: "coinflipEnabled", label: "Cara ou coroa", type: "checkbox" }, { name: "eightBallEnabled", label: "8ball", type: "checkbox" }, { name: "memesEnabled", label: "Memes", type: "checkbox" }])] },
      { key: "entertainment-economy", title: "Economia", description: "Moedas internas e ranking sem pagamentos.", cards: [statusCard("Ativa economia interna."), channelCard(), rulesCard([{ name: "dailyReward", label: "Recompensa diaria", type: "number", min: 0 }, { name: "currencyName", label: "Nome da moeda", type: "text", placeholder: "Folhas" }])] },
      { key: "entertainment-music", title: "Musica", description: "Area para organizar comandos de musica.", cards: [statusCard("Ativa painel de musica."), channelCard(), permissionCard()] },
      { key: "entertainment-ranking", title: "Ranking", description: "Rankings internos do servidor.", cards: [statusCard("Ativa rankings."), channelCard(), rulesCard([{ name: "weeklyReset", label: "Reset semanal", type: "checkbox" }])] }
    ]
  },
  {
    key: "ticket",
    title: "Ticket",
    icon: "TK",
    items: [
      { key: "ticket-panel", title: "Painel de Tickets", description: "Botao para membros abrirem atendimento.", cards: [statusCard("Ativa abertura de tickets."), channelCard(), permissionCard(), textCard("Texto do Painel", "panelText", "Texto")] },
      { key: "ticket-categories", title: "Categorias", description: "Categorias por tipo de atendimento.", cards: [statusCard("Ativa categorias de ticket."), rulesCard([{ name: "categoryId", label: "Categoria padrao", type: "text", placeholder: "ID da categoria" }]), textCard("Opcoes", "ticketTypes", "Tipos de ticket", "Suporte\nParceria\nDenuncia")] },
      { key: "ticket-transcripts", title: "Transcripts", description: "Registro ao fechar tickets.", cards: [statusCard("Ativa transcripts."), channelCard(), rulesCard([{ name: "sendToUser", label: "Enviar transcript ao membro", type: "checkbox" }, { name: "deleteClosedTicket", label: "Apagar canal fechado", type: "checkbox" }])] },
      { key: "ticket-forms", title: "Formularios", description: "Perguntas antes de abrir ticket.", cards: [statusCard("Ativa formulario de ticket."), channelCard(), textCard("Perguntas", "questions", "Perguntas", "Uma pergunta por linha")] },
      { key: "ticket-rating", title: "Avaliacao", description: "Avaliacao do atendimento.", cards: [statusCard("Ativa avaliacao ao fechar."), channelCard()] }
    ]
  },
  {
    key: "vips",
    title: "VIPs",
    icon: "V",
    items: [
      { key: "vips-roles", title: "Cargos VIP", description: "Cargos e beneficios VIP internos.", cards: [statusCard("Ativa controle de VIPs."), channelCard(), rulesCard([{ name: "vipRoleId", label: "Cargo VIP", type: "text", placeholder: "ID do cargo" }]), textCard("Beneficios", "benefits", "Beneficios", "Um beneficio por linha")] },
      { key: "vips-delivery", title: "Entrega VIP", description: "Entrega manual de cargo VIP pela equipe.", cards: [statusCard("Ativa entrega VIP."), permissionCard(), channelCard(), textCard("Mensagem", "deliveryMessage", "Mensagem de entrega", "VIP liberado para {user}")] },
      { key: "vips-area", title: "Area VIP", description: "Canal e anuncios da area VIP.", cards: [statusCard("Ativa area VIP."), channelCard(), textCard("Mensagem Fixa", "stickyText", "Texto fixo")] }
    ]
  },
  {
    key: "movcall",
    title: "Mov.Call",
    icon: "MC",
    items: [
      { key: "movcall-temp", title: "Call Temporaria", description: "Entrou no canal criador, nasce uma call temporaria.", cards: [statusCard("Ativa criacao de calls temporarias."), rulesCard([{ name: "creatorChannelId", label: "Canal criador", type: "text", placeholder: "ID do canal de voz" }, { name: "categoryId", label: "Categoria", type: "text", placeholder: "ID da categoria" }, { name: "defaultUserLimit", label: "Limite padrao", type: "number", min: 0 }, { name: "channelNameTemplate", label: "Modelo do nome", type: "text", placeholder: "Call de {user}" }]), channelCard()] },
      { key: "movcall-permissions", title: "Permissoes da Call", description: "Dono da call e poderes permitidos.", cards: [statusCard("Ativa permissoes de call."), permissionCard(), rulesCard([{ name: "allowOwnerLock", label: "Dono pode trancar", type: "checkbox" }, { name: "allowOwnerRename", label: "Dono pode renomear", type: "checkbox" }])] },
      { key: "movcall-logs", title: "Logs de Call", description: "Registros de criacao e encerramento.", cards: [statusCard("Ativa logs de call."), channelCard()] }
    ]
  },
  {
    key: "checkers",
    title: "Damas",
    icon: "D",
    items: [
      { key: "checkers-game", title: "Jogo de Damas", description: "Organizacao de partidas de damas.", cards: [statusCard("Ativa area de damas."), channelCard(), rulesCard([{ name: "allowSpectators", label: "Permitir espectadores", type: "checkbox" }])] },
      { key: "checkers-ranking", title: "Ranking de Damas", description: "Pontuacao dos jogadores.", cards: [statusCard("Ativa ranking."), channelCard(), rulesCard([{ name: "winPoints", label: "Pontos por vitoria", type: "number", min: 0 }, { name: "losePoints", label: "Pontos por derrota", type: "number", min: 0 }])] },
      { key: "checkers-rules", title: "Regras de Damas", description: "Regras exibidas para jogadores.", cards: [statusCard("Ativa painel de regras."), channelCard(), textCard("Regras", "rulesText", "Regras")] }
    ]
  },
  {
    key: "tools",
    title: "Ferramentas",
    icon: "F",
    items: [
      { key: "tools-embed", title: "Embed Builder", description: "Criador de embeds do Baile da Selva.", cards: [statusCard("Ativa criador de embeds."), channelCard(), permissionCard(), textCard("Modelo", "embedTemplate", "Modelo")] },
      { key: "tools-scheduled", title: "Mensagens Agendadas", description: "Agenda mensagens automaticas.", cards: [statusCard("Ativa agenda."), channelCard(), permissionCard(), textCard("Agendamentos", "scheduleList", "Lista de agendamentos")] },
      { key: "tools-sticky", title: "Sticky Messages", description: "Mensagem que fica no final do canal.", cards: [statusCard("Ativa mensagens fixas."), channelCard(), textCard("Mensagem", "stickyText", "Mensagem fixa")] },
      { key: "tools-auto-purge", title: "Limpeza Automatica", description: "Apaga mensagens em canais configurados.", cards: [statusCard("Ativa limpeza automatica."), rulesCard([{ name: "intervalMinutes", label: "Intervalo em minutos", type: "number", min: 0 }, { name: "messageAgeMinutes", label: "Idade minima da mensagem", type: "number", min: 0 }]), channelCard()] },
      { key: "tools-reminders", title: "Lembretes", description: "Lembretes para a equipe.", cards: [statusCard("Ativa lembretes."), channelCard(), textCard("Lembretes", "reminderList", "Lista")] },
      { key: "tools-backups", title: "Backups", description: "Area para backups de estrutura.", cards: [statusCard("Ativa backups."), rulesCard([{ name: "intervalHours", label: "Intervalo em horas", type: "number", min: 0 }]), textCard("Notas", "backupNote", "Notas")] }
    ]
  },
  {
    key: "conversions",
    title: "Conversoes (Loja)",
    icon: "CV",
    items: [
      { key: "conversions-store", title: "Loja Interna", description: "Pedidos internos do servidor, sem pagamentos no painel.", cards: [statusCard("Ativa loja interna."), channelCard(), textCard("Texto", "storeText", "Texto da loja")] },
      { key: "conversions-robux", title: "Conversor Robux", description: "Calculadora interna para Robux/beneficios.", cards: [statusCard("Ativa conversor."), rulesCard([{ name: "robuxRate", label: "Cotacao base", type: "text", placeholder: "1000 Robux = R$ 35" }, { name: "taxPercent", label: "Taxa em porcentagem", type: "number", min: 0 }]), channelCard()] },
      { key: "conversions-products", title: "Produtos Internos", description: "Catalogo de itens e cargos internos.", cards: [statusCard("Ativa produtos internos."), textCard("Produtos", "productsNote", "Produtos", "Nome | detalhe | cargo ID")] },
      { key: "conversions-orders", title: "Pedidos", description: "Fila de pedidos internos.", cards: [statusCard("Ativa fila de pedidos."), channelCard(), permissionCard()] }
    ]
  }
];

function flattenFields(panelModule) {
  return (panelModule.cards || []).flatMap((card) => card.fields || []);
}

const moduleCatalog = categoryCatalog.flatMap((category) =>
  category.items.map((item) => ({
    ...item,
    group: category.title,
    categoryKey: category.key,
    categoryIcon: category.icon,
    icon: item.icon || category.icon,
    fields: flattenFields(item)
  }))
);

function defaultForField(field) {
  if (field.type === "checkbox") {
    return false;
  }
  if (field.type === "number") {
    return Number(field.defaultValue || 0);
  }
  if (field.list) {
    return [];
  }
  return field.defaultValue || "";
}

function buildDefaultModules() {
  return Object.fromEntries(moduleCatalog.map((panelModule) => {
    const values = {};
    for (const field of panelModule.fields) {
      if (values[field.name] === undefined) {
        values[field.name] = defaultForField(field);
      }
    }
    values.enabled = false;
    return [panelModule.key, values];
  }));
}

function findModule(key) {
  return moduleCatalog.find((module) => module.key === key);
}

module.exports = {
  buildDefaultModules,
  categoryCatalog,
  findModule,
  flattenFields,
  moduleCatalog
};

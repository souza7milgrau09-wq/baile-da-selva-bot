const defaultConfig = {
  guildId: "",
  clientId: "",
  brandName: "Baile da Selva",
  panelBaseUrl: "http://127.0.0.1:3000",
  accentColor: "#24c46b",
  botIdentity: {
    name: "Baile da Selva",
    prefix: "bs!",
    language: "pt-BR",
    tagline: "Painel privado do bot do Baile da Selva",
    avatarUrl: "",
    bannerUrl: ""
  },
  staffRoleIds: [],
  modLogChannelId: "",
  modules: {
    security: {
      enabled: true,
      automodEnabled: true,
      blockInvites: true,
      blockLinks: false,
      blockCaps: false,
      blockedWords: [],
      timeoutMinutes: 0,
      logChannelId: ""
    },
    server: {
      enabled: true,
      rulesChannelId: "",
      announcementsChannelId: "",
      memberLogChannelId: "",
      statsEnabled: false,
      statsChannelId: "",
      slowmodeSeconds: 0
    },
    community: {
      enabled: true,
      levelingEnabled: false,
      xpPerMessage: 10,
      suggestionsChannelId: "",
      giveawaysChannelId: "",
      reactionRolesNote: "",
      autoResponderRules: ""
    },
    entertainment: {
      enabled: true,
      funCommandsEnabled: true,
      coinflipEnabled: true,
      eightBallEnabled: true,
      commandChannelId: "",
      blockedChannels: []
    },
    vips: {
      enabled: true,
      vipRoleId: "",
      vipChannelId: "",
      syncWithStore: true,
      benefits: [
        "Cargo VIP no Discord",
        "Atendimento prioritario",
        "Acesso a areas especiais"
      ],
      welcomeVipMessage: "VIP liberado para {user}. Aproveite os beneficios do Baile da Selva!"
    },
    movcall: {
      enabled: false,
      creatorChannelId: "",
      categoryId: "",
      defaultUserLimit: 0,
      channelNameTemplate: "Call de {user}",
      allowOwnerLock: true
    },
    checkers: {
      enabled: false,
      channelId: "",
      rankingEnabled: true,
      allowSpectators: true,
      winRoleId: "",
      rulesText: "Partidas organizadas pela equipe do Baile da Selva."
    },
    tools: {
      enabled: true,
      embedBuilderEnabled: true,
      scheduledMessagesEnabled: false,
      stickyMessagesEnabled: false,
      autoPurgeEnabled: false,
      purgeChannelIds: [],
      backupNote: "Use esta area para anotar rotinas de backup e limpeza."
    },
    conversions: {
      enabled: true,
      calculatorEnabled: true,
      robuxRate: "1000 Robux = R$ 35",
      taxPercent: 30,
      resultChannelId: "",
      notes: "Modulo interno. Sem assinatura ou cobranca para usar o painel."
    }
  },
  ticket: {
    enabled: true,
    panelChannelId: "",
    categoryId: "",
    logChannelId: "",
    transcriptChannelId: "",
    supportRoleIds: [],
    allowMultipleTickets: false,
    deleteClosedTickets: false,
    panelTitle: "Atendimento Baile da Selva",
    panelDescription: "Abra um ticket para suporte, parceria, denuncia ou duvida.",
    buttonLabel: "Abrir ticket",
    openedMessage: "Obrigado por chamar a equipe. Descreva seu problema com detalhes."
  },
  forms: {
    enabled: true,
    panelChannelId: "",
    reviewChannelId: "",
    activeFormId: "staff",
    items: [
      {
        id: "staff",
        name: "Formulario de staff",
        title: "Inscricao para equipe",
        description: "Responda com calma. A equipe vai analisar sua inscricao.",
        buttonLabel: "Enviar formulario",
        questions: [
          "Qual e seu nick no Roblox?",
          "Qual e sua idade?",
          "Por que voce quer entrar na equipe?",
          "Qual sua experiencia com comunidades?",
          "Qual horario voce costuma ficar online?"
        ],
        enabled: true
      }
    ]
  },
  store: {
    enabled: true,
    panelChannelId: "",
    orderCategoryId: "",
    orderLogChannelId: "",
    currency: "",
    paymentInstructions: "A equipe vai orientar o pedido neste canal.",
    panelTitle: "Loja Baile da Selva",
    panelDescription: "Escolha um item interno e abra um pedido com a equipe.",
    products: [
      {
        id: "vip",
        name: "VIP Selva",
        price: "Beneficio interno",
        description: "Cargo VIP no Discord e beneficios combinados com a equipe.",
        deliveryText: "Seu VIP foi entregue. Obrigado por apoiar o Baile da Selva!",
        roleId: "",
        enabled: true
      }
    ]
  },
  welcome: {
    enabled: false,
    channelId: "",
    autoRoleId: "",
    message: "Bem-vindo(a), {user}, ao Baile da Selva!"
  }
};

module.exports = { defaultConfig };

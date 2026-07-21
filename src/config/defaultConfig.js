const { buildDefaultModules } = require("./moduleCatalog");

const defaultConfig = {
  panelModeVersion: 3,
  guildId: "",
  clientId: "",
  brandName: "Baile da Selva",
  panelBaseUrl: "http://127.0.0.1:3000",
  accentColor: "#24c46b",
  botIdentity: {
    name: "Baile da Selva",
    prefix: "!",
    language: "pt-BR",
    tagline: "Painel privado do bot do Baile da Selva",
    avatarUrl: "",
    bannerUrl: ""
  },
  ownerIds: [],
  commandPermissions: {
    allowedRoleIds: [],
    allowedChannelIds: [],
    blockedUserIds: [],
    maintenance: false,
    maintenanceMessage: "O bot esta em manutencao. Tente novamente em alguns minutos."
  },
  commandAccess: {},
  staffRoleIds: [],
  modLogChannelId: "",
  leave: {
    enabled: false,
    channelId: "",
    message: "{user} saiu do {server}."
  },
  logs: {
    enabled: false,
    channelId: "",
    moderationChannelId: "",
    ticketsChannelId: "",
    economyChannelId: "",
    xpChannelId: ""
  },
  verification: {
    enabled: false,
    channelId: "",
    roleId: ""
  },
  economy: {
    enabled: false,
    currencyName: "Folhas",
    dailyReward: 250,
    weeklyReward: 1250,
    monthlyReward: 5000,
    workMin: 80,
    workMax: 260,
    shop: [
      {
        id: "folha-dourada",
        name: "Folha Dourada",
        price: 1500,
        sellPrice: 750,
        description: "Item colecionavel do Baile da Selva.",
        usable: false,
        roleId: ""
      }
    ]
  },
  leveling: {
    enabled: false,
    xpPerMessage: 15,
    cooldownSeconds: 60,
    rewardRoles: []
  },
  music: {
    enabled: false,
    defaultVolume: 50,
    maxVolume: 150,
    djRoleIds: []
  },
  modules: buildDefaultModules(),
  ticket: {
    enabled: false,
    panelChannelId: "",
    categoryId: "",
    logChannelId: "",
    transcriptChannelId: "",
    supportRoleIds: [],
    allowMultipleTickets: false,
    deleteClosedTickets: false,
    panelTitle: "Atendimento Baile da Selva",
    panelSubtitle: "Central de atendimento",
    panelDescription: "Precisa de ajuda? Abra um ticket e fale com a equipe do Baile da Selva.",
    panelColor: "#f04452",
    panelThumbnailUrl: "",
    panelImageUrl: "",
    panelFooter: "Baile da Selva - Atendimento",
    panelFields: [
      {
        name: "Como funciona",
        value: "Clique no botao abaixo, explique sua situacao e aguarde um membro da equipe."
      },
      {
        name: "Atendimentos",
        value: "Suporte, denuncia, parceria, loja interna e duvidas gerais."
      }
    ],
    buttonLabel: "Abrir ticket",
    buttonEmoji: "",
    buttonStyle: "Primary",
    openedTitle: "Ticket aberto",
    openedMessage: "Obrigado por chamar a equipe. Descreva seu problema com detalhes, envie prints se precisar e aguarde atendimento.",
    openedFooter: "Use os botoes abaixo para assumir, fechar ou apagar o ticket.",
    ticketNamePattern: "ticket-{user}-{id}",
    mentionSupport: true,
    protectPanelMessage: true,
    panelMessageId: "",
    panelMessageChannelId: "",
    panelLastSentAt: ""
  },
  forms: {
    enabled: false,
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
        enabled: false
      }
    ]
  },
  store: {
    enabled: false,
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
        enabled: false
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

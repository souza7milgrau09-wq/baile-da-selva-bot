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
    prefix: "bs!",
    language: "pt-BR",
    tagline: "Painel privado do bot do Baile da Selva",
    avatarUrl: "",
    bannerUrl: ""
  },
  staffRoleIds: [],
  modLogChannelId: "",
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
    panelDescription: "Abra um ticket para suporte, parceria, denuncia ou duvida.",
    buttonLabel: "Abrir ticket",
    openedMessage: "Obrigado por chamar a equipe. Descreva seu problema com detalhes."
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

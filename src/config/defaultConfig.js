const defaultConfig = {
  guildId: "",
  clientId: "",
  brandName: "Baile da Selva",
  panelBaseUrl: "http://127.0.0.1:3000",
  accentColor: "#24c46b",
  staffRoleIds: [],
  modLogChannelId: "",
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
    currency: "R$",
    paymentInstructions: "A equipe vai passar as instrucoes de pagamento neste pedido.",
    panelTitle: "Loja Baile da Selva",
    panelDescription: "Escolha um item e abra um pedido com a equipe.",
    products: [
      {
        id: "vip",
        name: "VIP Selva",
        price: "9,90",
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

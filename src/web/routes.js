const express = require("express");
const { findModule, moduleCatalog } = require("../config/moduleCatalog");
const { setFlash } = require("./middleware/auth");
const { boolFromForm, lines, parseIdList, shortId } = require("../utils/text");

function parseModuleForm(moduleConfig, panelModule, body) {
  const nextConfig = {};
  for (const field of panelModule.fields) {
    const currentValue = moduleConfig[field.name];
    if (field.type === "checkbox") {
      nextConfig[field.name] = boolFromForm(body[field.name]);
      continue;
    }
    if (field.type === "number") {
      const value = Number(body[field.name] || 0);
      nextConfig[field.name] = Number.isFinite(value) ? Math.max(Number(field.min || 0), value) : 0;
      continue;
    }
    if (field.type === "textarea" && Array.isArray(currentValue)) {
      nextConfig[field.name] = lines(body[field.name], 200);
      continue;
    }
    nextConfig[field.name] = String(body[field.name] || "").trim();
  }
  return nextConfig;
}

function createRoutes({ db, bot }) {
  const router = express.Router();

  router.use(async (req, res, next) => {
    res.locals.config = await db.getConfig();
    res.locals.botStatus = bot.getStatus();
    res.locals.moduleCatalog = moduleCatalog;
    next();
  });

  router.get("/", async (req, res) => {
    const [tickets, orders, submissions, events] = await Promise.all([
      db.read("tickets"),
      db.read("orders"),
      db.read("submissions"),
      db.read("events")
    ]);
    res.render("dashboard", {
      title: "Dashboard",
      active: "dashboard",
      stats: {
        ticketsOpen: tickets.filter((item) => item.status === "open").length,
        ticketsClosed: tickets.filter((item) => item.status === "closed").length,
        ordersOpen: orders.filter((item) => ["open", "paid", "checked"].includes(item.status)).length,
        formsPending: submissions.filter((item) => item.status === "pending").length,
        modulesActive: moduleCatalog.filter((item) => {
          const moduleConfig = res.locals.config.modules && res.locals.config.modules[item.key];
          return moduleConfig && moduleConfig.enabled;
        }).length
      },
      tickets: tickets.slice(0, 5),
      orders: orders.slice(0, 5),
      events: events.slice(0, 8)
    });
  });

  router.get("/settings", (req, res) => {
    res.render("settings", { title: "Geral", active: "settings" });
  });

  router.post("/settings", async (req, res) => {
    await db.setConfig({
      guildId: String(req.body.guildId || "").trim(),
      clientId: String(req.body.clientId || "").trim(),
      brandName: String(req.body.brandName || "Baile da Selva").trim(),
      panelBaseUrl: String(req.body.panelBaseUrl || "").trim(),
      accentColor: String(req.body.accentColor || "#24c46b").trim(),
      botIdentity: {
        name: String(req.body.botName || req.body.brandName || "Baile da Selva").trim(),
        prefix: String(req.body.prefix || "bs!").trim().slice(0, 8),
        language: String(req.body.language || "pt-BR").trim(),
        tagline: String(req.body.tagline || "").trim(),
        avatarUrl: String(req.body.avatarUrl || "").trim(),
        bannerUrl: String(req.body.bannerUrl || "").trim()
      },
      staffRoleIds: parseIdList(req.body.staffRoleIds),
      modLogChannelId: String(req.body.modLogChannelId || "").trim()
    });
    setFlash(req, "success", "Configuracao geral salva.");
    res.redirect("/settings");
  });

  router.post("/bot/register", async (req, res) => {
    try {
      await bot.registerCommands();
      setFlash(req, "success", "Comandos registrados no servidor.");
    } catch (error) {
      setFlash(req, "error", error.message);
    }
    res.redirect("/");
  });

  router.get("/modules/:moduleKey", (req, res, next) => {
    const panelModule = findModule(req.params.moduleKey);
    if (!panelModule) {
      next();
      return;
    }
    res.render("modules", {
      title: panelModule.title,
      active: panelModule.key,
      panelModule,
      moduleConfig: (res.locals.config.modules && res.locals.config.modules[panelModule.key]) || {}
    });
  });

  router.post("/modules/:moduleKey", async (req, res, next) => {
    const panelModule = findModule(req.params.moduleKey);
    if (!panelModule) {
      next();
      return;
    }
    const config = await db.getConfig();
    const currentModuleConfig = (config.modules && config.modules[panelModule.key]) || {};
    await db.setConfig({
      modules: {
        [panelModule.key]: parseModuleForm(currentModuleConfig, panelModule, req.body)
      }
    });
    setFlash(req, "success", `${panelModule.title} salvo.`);
    res.redirect(`/modules/${panelModule.key}`);
  });

  router.get("/tickets", async (req, res) => {
    const tickets = await db.read("tickets");
    res.render("tickets", {
      title: "Tickets",
      active: "tickets",
      tickets: tickets.slice(0, 60)
    });
  });

  router.post("/tickets", async (req, res) => {
    await db.setConfig({
      ticket: {
        enabled: boolFromForm(req.body.enabled),
        panelChannelId: String(req.body.panelChannelId || "").trim(),
        categoryId: String(req.body.categoryId || "").trim(),
        logChannelId: String(req.body.logChannelId || "").trim(),
        transcriptChannelId: String(req.body.transcriptChannelId || "").trim(),
        supportRoleIds: parseIdList(req.body.supportRoleIds),
        allowMultipleTickets: boolFromForm(req.body.allowMultipleTickets),
        deleteClosedTickets: boolFromForm(req.body.deleteClosedTickets),
        panelTitle: String(req.body.panelTitle || "").trim(),
        panelDescription: String(req.body.panelDescription || "").trim(),
        buttonLabel: String(req.body.buttonLabel || "Abrir ticket").trim(),
        openedMessage: String(req.body.openedMessage || "").trim()
      }
    });
    setFlash(req, "success", "Tickets atualizados.");
    res.redirect("/tickets");
  });

  router.post("/tickets/send", async (req, res) => {
    try {
      await bot.sendTicketPanel(String(req.body.channelId || "").trim() || undefined);
      setFlash(req, "success", "Painel de ticket enviado.");
    } catch (error) {
      setFlash(req, "error", error.message);
    }
    res.redirect("/tickets");
  });

  router.get("/forms", async (req, res) => {
    const submissions = await db.read("submissions");
    res.render("forms", {
      title: "Formularios",
      active: "forms",
      submissions: submissions.slice(0, 50)
    });
  });

  router.post("/forms", async (req, res) => {
    const config = await db.getConfig();
    const formId = config.forms.activeFormId || "staff";
    const form = {
      id: formId,
      name: String(req.body.name || "Formulario").trim(),
      title: String(req.body.title || "Formulario").trim(),
      description: String(req.body.description || "").trim(),
      buttonLabel: String(req.body.buttonLabel || "Enviar formulario").trim(),
      questions: lines(req.body.questions, 5),
      enabled: boolFromForm(req.body.enabled)
    };

    await db.setConfig({
      forms: {
        enabled: boolFromForm(req.body.formsEnabled),
        panelChannelId: String(req.body.panelChannelId || "").trim(),
        reviewChannelId: String(req.body.reviewChannelId || "").trim(),
        activeFormId: formId,
        items: [form]
      }
    });
    setFlash(req, "success", "Formulario salvo.");
    res.redirect("/forms");
  });

  router.post("/forms/send", async (req, res) => {
    try {
      const config = await db.getConfig();
      await bot.sendFormPanel(config.forms.activeFormId, String(req.body.channelId || "").trim() || undefined);
      setFlash(req, "success", "Painel de formulario enviado.");
    } catch (error) {
      setFlash(req, "error", error.message);
    }
    res.redirect("/forms");
  });

  router.post("/forms/submissions/:id/status", async (req, res) => {
    await db.update("submissions", async (items) => items.map((item) => (
      item.id === req.params.id
        ? {
            ...item,
            status: req.body.status,
            reviewedAt: new Date().toISOString(),
            reviewedBy: "dashboard"
          }
        : item
    )));
    setFlash(req, "success", "Status do formulario atualizado.");
    res.redirect("/forms");
  });

  router.get("/store", async (req, res) => {
    const orders = await db.read("orders");
    res.render("store", {
      title: "Loja interna",
      active: "store",
      orders: orders.slice(0, 50)
    });
  });

  router.post("/store/settings", async (req, res) => {
    const config = await db.getConfig();
    await db.setConfig({
      store: {
        ...config.store,
        enabled: boolFromForm(req.body.enabled),
        panelChannelId: String(req.body.panelChannelId || "").trim(),
        orderCategoryId: String(req.body.orderCategoryId || "").trim(),
        orderLogChannelId: String(req.body.orderLogChannelId || "").trim(),
        currency: String(req.body.currency || "R$").trim(),
        paymentInstructions: String(req.body.paymentInstructions || "").trim(),
        panelTitle: String(req.body.panelTitle || "").trim(),
        panelDescription: String(req.body.panelDescription || "").trim()
      }
    });
    setFlash(req, "success", "Loja interna atualizada.");
    res.redirect("/store");
  });

  router.post("/store/products", async (req, res) => {
    const config = await db.getConfig();
    const product = {
      id: shortId("prod"),
      name: String(req.body.name || "Produto").trim(),
      price: String(req.body.price || "Beneficio interno").trim(),
      description: String(req.body.description || "").trim(),
      deliveryText: String(req.body.deliveryText || "").trim(),
      roleId: String(req.body.roleId || "").trim(),
      enabled: boolFromForm(req.body.enabled)
    };

    await db.setConfig({
      store: {
        ...config.store,
        products: [product, ...(config.store.products || [])]
      }
    });
    setFlash(req, "success", "Produto cadastrado.");
    res.redirect("/store");
  });

  router.post("/store/products/:id", async (req, res) => {
    const config = await db.getConfig();
    const products = (config.store.products || []).map((product) => (
      product.id === req.params.id
        ? {
            ...product,
            name: String(req.body.name || product.name).trim(),
            price: String(req.body.price || product.price).trim(),
            description: String(req.body.description || "").trim(),
            deliveryText: String(req.body.deliveryText || "").trim(),
            roleId: String(req.body.roleId || "").trim(),
            enabled: boolFromForm(req.body.enabled)
          }
        : product
    ));
    await db.setConfig({ store: { ...config.store, products } });
    setFlash(req, "success", "Produto salvo.");
    res.redirect("/store");
  });

  router.post("/store/products/:id/delete", async (req, res) => {
    const config = await db.getConfig();
    await db.setConfig({
      store: {
        ...config.store,
        products: (config.store.products || []).filter((product) => product.id !== req.params.id)
      }
    });
    setFlash(req, "success", "Produto removido.");
    res.redirect("/store");
  });

  router.post("/store/send", async (req, res) => {
    try {
      await bot.sendStorePanel(String(req.body.channelId || "").trim() || undefined);
      setFlash(req, "success", "Painel da loja enviado.");
    } catch (error) {
      setFlash(req, "error", error.message);
    }
    res.redirect("/store");
  });

  router.get("/welcome", (req, res) => {
    res.render("welcome", { title: "Boas-vindas", active: "welcome" });
  });

  router.post("/welcome", async (req, res) => {
    await db.setConfig({
      welcome: {
        enabled: boolFromForm(req.body.enabled),
        channelId: String(req.body.channelId || "").trim(),
        autoRoleId: String(req.body.autoRoleId || "").trim(),
        message: String(req.body.message || "").trim()
      }
    });
    setFlash(req, "success", "Boas-vindas salvas.");
    res.redirect("/welcome");
  });

  router.get("/activity", async (req, res) => {
    const [tickets, orders, submissions, events] = await Promise.all([
      db.read("tickets"),
      db.read("orders"),
      db.read("submissions"),
      db.read("events")
    ]);
    res.render("activity", {
      title: "Registros",
      active: "activity",
      tickets,
      orders,
      submissions,
      events
    });
  });

  router.get("/api/status", (req, res) => {
    res.json(bot.getStatus());
  });

  return router;
}

module.exports = { createRoutes };

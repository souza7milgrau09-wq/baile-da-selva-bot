const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const session = require("express-session");
const morgan = require("morgan");
const { attachLocals, requireAuth, setFlash, verifyCsrf } = require("./middleware/auth");
const { createRoutes } = require("./routes");
const { formatDate, safeCompare } = require("../utils/text");

function createWebApp({ db, bot }) {
  const app = express();
  const viewsDir = path.join(__dirname, "views");
  const publicDir = path.join(__dirname, "public");

  app.set("view engine", "ejs");
  app.set("views", viewsDir);
  app.disable("x-powered-by");

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        "script-src": ["'self'"]
      }
    }
  }));
  app.use(morgan("tiny"));
  app.use(express.urlencoded({ extended: true, limit: "300kb" }));
  app.use(express.json({ limit: "300kb" }));
  app.use(session({
    name: "baile.sid",
    secret: process.env.SESSION_SECRET || "troque-esse-segredo-grande",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    }
  }));
  app.use((req, res, next) => {
    res.locals.formatDate = formatDate;
    next();
  });
  app.use(attachLocals);
  app.use(verifyCsrf);
  app.use(express.static(publicDir));

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false
  });

  app.get("/login", (req, res) => {
    if (req.session.authenticated) {
      res.redirect("/");
      return;
    }
    res.render("login", { title: "Entrar" });
  });

  app.get("/healthz", (req, res) => {
    res.status(200).json({
      ok: true,
      bot: bot.getStatus().ready ? "online" : "offline"
    });
  });

  app.post("/login", loginLimiter, (req, res) => {
    const expected = process.env.DASHBOARD_PASSWORD || "troque-essa-senha";
    if (!safeCompare(req.body.password, expected)) {
      setFlash(req, "error", "Senha incorreta.");
      res.redirect("/login");
      return;
    }

    req.session.authenticated = true;
    setFlash(req, "success", "Painel liberado.");
    res.redirect("/");
  });

  app.post("/logout", requireAuth, (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
  });

  app.use(requireAuth);
  app.use(createRoutes({ db, bot }));

  app.use((req, res) => {
    res.status(404).render("not-found", { title: "Nao encontrado", active: "" });
  });

  app.use(async (error, req, res, next) => {
    console.error("[WEB] Erro:", error);
    if (res.headersSent) {
      next(error);
      return;
    }
    res.locals.config = res.locals.config || await db.getConfig().catch(() => ({ brandName: "Baile da Selva" }));
    res.locals.botStatus = res.locals.botStatus || bot.getStatus();
    res.status(500).render("error", {
      title: "Erro",
      active: "",
      message: error.message || "Erro inesperado."
    });
  });

  return app;
}

module.exports = { createWebApp };

const { randomBytes } = require("node:crypto");
const { safeCompare } = require("../../utils/text");

function attachLocals(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(24).toString("hex");
  }
  res.locals.csrfToken = req.session.csrfToken;
  res.locals.userLoggedIn = Boolean(req.session.authenticated);
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
}

function verifyCsrf(req, res, next) {
  if (req.method !== "POST") {
    next();
    return;
  }

  if (!safeCompare(req.body._csrf, req.session.csrfToken)) {
    res.status(403).send("Token de seguranca invalido. Volte e tente novamente.");
    return;
  }
  next();
}

function requireAuth(req, res, next) {
  if (req.session.authenticated) {
    next();
    return;
  }
  res.redirect("/login");
}

function setFlash(req, type, message) {
  req.session.flash = { type, message };
}

module.exports = {
  attachLocals,
  requireAuth,
  setFlash,
  verifyCsrf
};

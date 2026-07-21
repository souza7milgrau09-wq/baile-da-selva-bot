function parseArguments(input) {
  const values = [];
  const expression = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
  let match;
  while ((match = expression.exec(String(input || "")))) {
    values.push(match[1] ?? match[2] ?? match[3]);
  }
  return values;
}

function snowflake(value) {
  const match = String(value || "").match(/\d{16,22}/);
  return match ? match[0] : "";
}

function parseDuration(value) {
  const match = String(value || "").toLowerCase().match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 0;
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return Number(match[1]) * multipliers[match[2]];
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`, `${seconds}s`]
    .filter(Boolean)
    .join(" ");
}

function parseAmount(value, maximum = Infinity) {
  if (String(value || "").toLowerCase() === "tudo") return Math.max(0, Math.floor(maximum));
  const amount = Math.floor(Number(value));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function formatMoney(value, currency = "Folhas") {
  return `${Number(value || 0).toLocaleString("pt-BR")} ${currency}`;
}

function levelFromXp(xp) {
  return Math.floor(Math.sqrt(Math.max(0, Number(xp || 0)) / 100));
}

function xpForLevel(level) {
  return Math.max(0, Number(level || 0)) ** 2 * 100;
}

function randomInt(min, max) {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

module.exports = {
  escapeHtml,
  formatDuration,
  formatMoney,
  levelFromXp,
  parseAmount,
  parseArguments,
  parseDuration,
  randomInt,
  snowflake,
  xpForLevel
};

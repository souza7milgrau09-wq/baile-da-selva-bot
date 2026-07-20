const { randomBytes } = require("node:crypto");

function shortId(prefix = "") {
  const value = randomBytes(4).toString("hex");
  return prefix ? `${prefix}_${value}` : value;
}

function cleanChannelName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 80) || "canal";
}

function parseIdList(value) {
  if (Array.isArray(value)) {
    return value.flatMap(parseIdList);
  }
  return String(value || "")
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function lines(value, max = 50) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, max);
}

function boolFromForm(value) {
  return value === "on" || value === "true" || value === true;
}

function truncate(value, max = 1024) {
  const text = String(value || "");
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function hexToInt(hex, fallback = 0x24c46b) {
  const clean = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return fallback;
  }
  return Number.parseInt(clean, 16);
}

function safeCompare(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  if (left.length !== right.length) {
    return false;
  }
  return require("node:crypto").timingSafeEqual(left, right);
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(new Date(date));
}

module.exports = {
  boolFromForm,
  cleanChannelName,
  formatDate,
  hexToInt,
  lines,
  parseIdList,
  safeCompare,
  shortId,
  truncate
};

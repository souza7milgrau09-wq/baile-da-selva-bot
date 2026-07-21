const fs = require("node:fs/promises");
const path = require("node:path");
const { defaultConfig } = require("../config/defaultConfig");

const files = {
  config: "config.json",
  tickets: "tickets.json",
  orders: "orders.json",
  submissions: "submissions.json",
  events: "events.json",
  economy: "economy.json",
  xp: "xp.json",
  warns: "warns.json",
  afk: "afk.json",
  snipes: "snipes.json",
  editsnipes: "editsnipes.json",
  backups: "backups.json",
  reminders: "reminders.json",
  blacklist: "blacklist.json",
  whitelist: "whitelist.json",
  commandStats: "command-stats.json"
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deepMerge(base, patch) {
  const output = clone(base);
  for (const [key, value] of Object.entries(patch || {})) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      output[key] &&
      typeof output[key] === "object" &&
      !Array.isArray(output[key])
    ) {
      output[key] = deepMerge(output[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
}

function disableAllFeatureSwitches(config) {
  const output = normalizeKnownModules(deepMerge(defaultConfig, config));
  output.panelModeVersion = defaultConfig.panelModeVersion;

  for (const [key, moduleDefaults] of Object.entries(defaultConfig.modules || {})) {
    output.modules[key] = deepMerge(moduleDefaults, output.modules[key] || {});
    for (const [fieldName, defaultValue] of Object.entries(moduleDefaults)) {
      if (typeof defaultValue === "boolean") {
        output.modules[key][fieldName] = false;
      }
    }
  }

  output.ticket = { ...output.ticket, enabled: false };
  output.forms = {
    ...output.forms,
    enabled: false,
    items: (output.forms.items || []).map((item) => ({ ...item, enabled: false }))
  };
  output.store = {
    ...output.store,
    enabled: false,
    products: (output.store.products || []).map((item) => ({ ...item, enabled: false }))
  };
  output.welcome = { ...output.welcome, enabled: false };

  return output;
}

function normalizeKnownModules(config) {
  const output = deepMerge(defaultConfig, config);
  output.modules = {};
  for (const [key, moduleDefaults] of Object.entries(defaultConfig.modules || {})) {
    output.modules[key] = deepMerge(moduleDefaults, (config.modules && config.modules[key]) || {});
  }
  return output;
}

class JsonDatabase {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.queue = Promise.resolve();
  }

  async init() {
    await fs.mkdir(this.baseDir, { recursive: true });
    await this.ensure("config", defaultConfig);
    await this.ensure("tickets", []);
    await this.ensure("orders", []);
    await this.ensure("submissions", []);
    await this.ensure("events", []);
    await this.ensure("economy", {});
    await this.ensure("xp", {});
    await this.ensure("warns", []);
    await this.ensure("afk", {});
    await this.ensure("snipes", {});
    await this.ensure("editsnipes", {});
    await this.ensure("backups", []);
    await this.ensure("reminders", []);
    await this.ensure("blacklist", []);
    await this.ensure("whitelist", []);
    await this.ensure("commandStats", {});
    const config = await this.read("config");
    const merged = normalizeKnownModules(deepMerge(defaultConfig, config));
    await this.write(
      "config",
      config.panelModeVersion === defaultConfig.panelModeVersion
        ? merged
        : disableAllFeatureSwitches(merged)
    );
  }

  file(name) {
    return path.join(this.baseDir, files[name]);
  }

  async ensure(name, defaultValue) {
    try {
      await fs.access(this.file(name));
    } catch {
      await this.write(name, defaultValue);
    }
  }

  async read(name) {
    const raw = await fs.readFile(this.file(name), "utf8");
    return JSON.parse(raw);
  }

  async write(name, value) {
    const file = this.file(name);
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    await fs.rename(tmp, file);
  }

  enqueue(task) {
    const next = this.queue.then(task, task);
    this.queue = next.catch(() => undefined);
    return next;
  }

  update(name, updater) {
    return this.enqueue(async () => {
      const current = await this.read(name);
      const next = await updater(current);
      await this.write(name, next);
      return next;
    });
  }

  async getConfig() {
    return deepMerge(defaultConfig, await this.read("config"));
  }

  async setConfig(patch) {
    return this.update("config", async (current) => deepMerge(defaultConfig, deepMerge(current, patch)));
  }

  async addEvent(type, payload = {}) {
    return this.update("events", async (events) => {
      events.unshift({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type,
        payload,
        createdAt: new Date().toISOString()
      });
      return events.slice(0, 300);
    });
  }

  scopeKey(guildId, userId) {
    return `${guildId || "global"}:${userId}`;
  }

  async getScoped(name, guildId, userId, defaults = {}) {
    const records = await this.read(name);
    return deepMerge(defaults, records[this.scopeKey(guildId, userId)] || {});
  }

  async updateScoped(name, guildId, userId, defaults, updater) {
    const key = this.scopeKey(guildId, userId);
    let saved;
    await this.update(name, async (records) => {
      const current = deepMerge(defaults || {}, records[key] || {});
      saved = await updater(current);
      return { ...records, [key]: saved };
    });
    return saved;
  }

  async incrementCommand(commandName) {
    return this.update("commandStats", async (stats) => ({
      ...stats,
      [commandName]: Number(stats[commandName] || 0) + 1
    }));
  }
}

module.exports = { JsonDatabase, deepMerge };

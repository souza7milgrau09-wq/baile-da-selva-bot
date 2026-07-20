const fs = require("node:fs/promises");
const path = require("node:path");
const { defaultConfig } = require("../config/defaultConfig");

const files = {
  config: "config.json",
  tickets: "tickets.json",
  orders: "orders.json",
  submissions: "submissions.json",
  events: "events.json"
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
    const config = await this.read("config");
    await this.write("config", deepMerge(defaultConfig, config));
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
}

module.exports = { JsonDatabase, deepMerge };

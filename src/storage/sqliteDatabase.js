const fs = require("node:fs/promises");
const path = require("node:path");
const { JsonDatabase } = require("./jsonDatabase");

class SqliteDatabase extends JsonDatabase {
  constructor(baseDir) {
    super(baseDir);
    this.databaseFile = path.join(baseDir, "baile-da-selva.sqlite");
    this.connection = null;
    this.selectStatement = null;
    this.upsertStatement = null;
  }

  async init() {
    await fs.mkdir(this.baseDir, { recursive: true });
    let DatabaseSync;
    try {
      ({ DatabaseSync } = require("node:sqlite"));
    } catch {
      throw new Error("SQLite requer Node.js 22.5 ou superior. Use DATABASE_DRIVER=json neste ambiente.");
    }
    this.connection = new DatabaseSync(this.databaseFile);
    this.connection.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
    this.connection.exec("CREATE TABLE IF NOT EXISTS bot_data (name TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL)");
    this.selectStatement = this.connection.prepare("SELECT value FROM bot_data WHERE name = ?");
    this.upsertStatement = this.connection.prepare("INSERT INTO bot_data (name, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at");
    await super.init();
  }

  file(name) {
    return name;
  }

  async ensure(name, defaultValue) {
    const row = this.selectStatement.get(name);
    if (!row) await this.write(name, defaultValue);
  }

  async read(name) {
    const row = this.selectStatement.get(name);
    if (!row) throw new Error(`Colecao SQLite nao encontrada: ${name}`);
    return JSON.parse(row.value);
  }

  async write(name, value) {
    this.upsertStatement.run(name, JSON.stringify(value), new Date().toISOString());
  }

  close() {
    if (this.connection) this.connection.close();
  }
}

module.exports = { SqliteDatabase };

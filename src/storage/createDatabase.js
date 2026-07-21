const { JsonDatabase } = require("./jsonDatabase");
const { SqliteDatabase } = require("./sqliteDatabase");

function createDatabase(baseDir) {
  const driver = String(process.env.DATABASE_DRIVER || "json").toLowerCase();
  if (driver === "sqlite") return new SqliteDatabase(baseDir);
  if (driver !== "json") throw new Error(`DATABASE_DRIVER invalido: ${driver}. Use json ou sqlite.`);
  return new JsonDatabase(baseDir);
}

module.exports = { createDatabase };

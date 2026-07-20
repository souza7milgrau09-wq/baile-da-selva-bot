const { spawnSync } = require("node:child_process");
const { readdirSync, statSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dirs = [path.join(root, "src")];
let failed = false;

function walk(dir) {
  for (const item of readdirSync(dir)) {
    const fullPath = path.join(dir, item);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith(".js")) {
      const result = spawnSync(process.execPath, ["--check", fullPath], {
        encoding: "utf8"
      });
      if (result.status !== 0) {
        failed = true;
        process.stderr.write(result.stderr || result.stdout);
      } else {
        console.log(`OK ${path.relative(root, fullPath)}`);
      }
    }
  }
}

dirs.forEach(walk);
process.exit(failed ? 1 : 0);

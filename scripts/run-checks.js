import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const dir = "src";
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".check.js"))
  .sort();

if (!files.length) {
  console.error("no src/*.check.js files");
  process.exit(1);
}

let failed = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [join(dir, f)], { stdio: "inherit" });
  if (r.status !== 0) failed += 1;
}
process.exit(failed ? 1 : 0);

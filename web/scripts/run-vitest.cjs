const path = require("node:path");
const { spawnSync } = require("node:child_process");

const webNodeModules = path.resolve(__dirname, "../node_modules");
const vitestCli = path.join(
  path.dirname(require.resolve("vitest/package.json")),
  "vitest.mjs",
);
const existingNodePath = process.env.NODE_PATH;
const nodePath = existingNodePath
  ? `${webNodeModules}${path.delimiter}${existingNodePath}`
  : webNodeModules;

const result = spawnSync(
  process.execPath,
  [vitestCli, ...process.argv.slice(2)],
  {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, NODE_PATH: nodePath },
    stdio: "inherit",
  },
);

process.exit(result.status ?? 1);

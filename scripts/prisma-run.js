const { spawn } = require("child_process");
const path = require("path");

require("dotenv").config({ override: true });

const prismaBin = path.join(
  __dirname,
  "..",
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma"
);

const args = process.argv.slice(2);

const command = process.platform === "win32" ? "cmd.exe" : prismaBin;
const commandArgs =
  process.platform === "win32" ? ["/c", prismaBin, ...args] : args;

const child = spawn(command, commandArgs, {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

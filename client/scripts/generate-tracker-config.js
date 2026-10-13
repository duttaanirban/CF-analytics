import { mkdirSync, writeFileSync } from "node:fs";
import process from "node:process";
import { loadEnv } from "vite";

const mode = process.argv[2] || "development";
const env = loadEnv(mode, process.cwd(), "VITE_");

const apiUrl = (
  process.env.VITE_API_URL ||
  env.VITE_API_URL ||
  "http://localhost:5000/api"
).replace(/\/$/, "");

const config = {
  endpoint: `${apiUrl}/events`,
};

mkdirSync("public", { recursive: true });

writeFileSync(
  "public/tracker-config.js",
  `window.CAUSAL_TRACKER_CONFIG = ${JSON.stringify(config)};\n`
);

console.log(`Tracker configuration generated for ${mode}`);
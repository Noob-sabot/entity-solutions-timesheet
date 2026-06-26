import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Load key=value pairs from .env if present (no extra dependency). */
export function loadDotEnv(): void {
  const path = join(rootDir, ".env");
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

export function getPortalCredentials(): {
  username?: string;
  password?: string;
} {
  loadDotEnv();
  return {
    username: process.env.TIMESHEET_USERNAME,
    password: process.env.TIMESHEET_PASSWORD,
  };
}

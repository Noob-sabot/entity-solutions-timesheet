import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

export interface FigJamCaptureConfig {
  boardUrl: string;
  outputDir: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  tileOverlapPx: number;
  panSettleMs: number;
  defaultZoom: number;
  pilotMapName: string;
}

export const FIGMA_AUTH_STATE_PATH = join(rootDir, "figma-auth-state.json");

export function loadFigJamConfig(): FigJamCaptureConfig {
  const path = join(rootDir, "figjam-capture-config.json");
  return JSON.parse(readFileSync(path, "utf-8")) as FigJamCaptureConfig;
}

export function resolveOutputDir(config: FigJamCaptureConfig): string {
  return join(rootDir, config.outputDir);
}

export function requireFigmaAuthState(): string {
  if (!existsSync(FIGMA_AUTH_STATE_PATH)) {
    console.error("figma-auth-state.json not found. Run: npm run figma-auth");
    process.exit(1);
  }
  return FIGMA_AUTH_STATE_PATH;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseCaptureArgs(argv: string[]) {
  const getFlag = (flag: string) => argv.includes(flag);
  const getValue = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const num = (flag: string) => {
    const v = getValue(flag);
    return v !== undefined ? Number(v) : undefined;
  };

  return {
    name: getValue("--name"),
    nodeId: getValue("--node-id"),
    headed: getFlag("--headed"),
    deviceScale: num("--device-scale") || undefined,
    zoom: num("--zoom") || undefined,
    selectionWidth: num("--selection-width"),
    selectionHeight: num("--selection-height"),
    tilesOnly: getFlag("--tiles-only"),
    dryRun: getFlag("--dry-run"),
    pause: getFlag("--pause"),
  };
}

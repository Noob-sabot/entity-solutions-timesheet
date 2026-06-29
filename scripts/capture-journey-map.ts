import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import {
  loadFigJamConfig,
  resolveOutputDir,
  getFigmaAuthState,
  slugify,
  parseCaptureArgs,
} from "./lib/figjam-config.js";
import {
  launchFigmaBrowser,
  openBoard,
  findAndSelectMap,
  zoomToSelection,
  setZoomPercent,
  getCanvasRegion,
  setupHighDpiCapture,
  computeTileGrid,
  estimateSelectionSize,
  captureTileGrid,
  captureSingleFrame,
} from "./lib/figjam-capture.js";
import { stitchTiles } from "./lib/stitch-tiles.js";
import { writeExportArtifacts, writeTileDebug } from "./lib/figjam-export.js";

async function main() {
  const config = loadFigJamConfig();
  const args = parseCaptureArgs(process.argv.slice(2));
  const mapName = args.name ?? config.pilotMapName;
  const nodeId = args.noNodeId ? undefined : args.nodeId;
  const zoom = args.zoom ?? config.defaultZoom;
  const deviceScale = args.deviceScale ?? config.deviceScaleFactor;
  const outputDir = resolveOutputDir(config);
  const baseName = slugify(mapName);

  const authPath = getFigmaAuthState();

  console.log(`Capturing journey map: "${mapName}"`);
  console.log(`  zoom=${zoom}%  deviceScale=${deviceScale}  output=${outputDir}`);
  if (!authPath) console.log("  (public board — no Figma login session)");

  const { browser, page } = await launchFigmaBrowser(args.headed, authPath);

  try {
    await openBoard(page, config.boardUrl, nodeId);

    await findAndSelectMap(page, config.pilotSearchTerm ?? mapName);
    await zoomToSelection(page);
    await page.waitForTimeout(1000);
    if (zoom !== 100) await setZoomPercent(page, zoom);

    const region = await getCanvasRegion(page);
    console.log(`Canvas region: ${region.width}x${region.height} at (${region.x}, ${region.y})`);

    const selectionOverride =
      args.selectionWidth && args.selectionHeight
        ? { width: args.selectionWidth, height: args.selectionHeight }
        : args.singleFrame || nodeId
          ? { width: region.width, height: region.height }
          : undefined;

    const selectionSize = estimateSelectionSize(
      region.width,
      region.height,
      zoom,
      selectionOverride
    );

    let { cols, rows } = computeTileGrid(
      selectionSize.width,
      selectionSize.height,
      region.width,
      region.height,
      config.tileOverlapPx
    );

    if (args.singleFrame) {
      cols = 1;
      rows = 1;
    }

    console.log(`Estimated selection: ${selectionSize.width}x${selectionSize.height} CSS px`);
    console.log(`Tile grid: ${cols} cols x ${rows} rows (${cols * rows} tiles)`);

    if (args.dryRun) {
      console.log("Dry run complete — no screenshots taken.");
      if (args.pause) await page.pause();
      return;
    }

    const client = await setupHighDpiCapture(page, deviceScale, config.viewport);

    let imageBuffer: Buffer;

    if (cols === 1 && rows === 1) {
      console.log("Single-frame capture (fits in viewport)...");
      imageBuffer = await captureSingleFrame(page, client, region);
    } else {
      console.log(`Tiled capture: ${cols}x${rows}...`);
      const { tiles, tileWidth, tileHeight } = await captureTileGrid(page, client, {
        region,
        deviceScaleFactor: deviceScale,
        tileOverlapPx: config.tileOverlapPx,
        panSettleMs: config.panSettleMs,
        cols,
        rows,
      });

      if (args.tilesOnly) {
        mkdirSync(outputDir, { recursive: true });
        writeTileDebug(outputDir, tiles, baseName);
        console.log("Tiles-only mode — skipping stitch.");
        return;
      }

      const grid = tiles.map((row, ri) =>
        row.map((buf, ci) => ({ buffer: buf, col: ci, row: ri }))
      );
      imageBuffer = await stitchTiles(grid, tileWidth, tileHeight, {
        overlapPx: config.tileOverlapPx,
        deviceScaleFactor: deviceScale,
      });
    }

    const artifacts = await writeExportArtifacts(outputDir, baseName, imageBuffer);

    const manifest = {
      mapName,
      zoom,
      deviceScale,
      tileGrid: { cols, rows },
      selectionEstimate: selectionSize,
      ...artifacts,
      capturedAt: new Date().toISOString(),
    };
    writeFileSync(join(outputDir, `${baseName}-manifest.json`), JSON.stringify(manifest, null, 2));

    console.log("\nExport complete:");
    console.log(`  PNG: ${artifacts.pngPath} (${artifacts.width}x${artifacts.height})`);
    console.log(`  SVG: ${artifacts.svgPath}`);
    console.log(`  PDF: ${artifacts.pdfPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

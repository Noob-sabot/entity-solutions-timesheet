import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

export interface ExportArtifacts {
  pngPath: string;
  svgPath: string;
  pdfPath: string;
  width: number;
  height: number;
}

export async function writeExportArtifacts(
  outputDir: string,
  baseName: string,
  imageBuffer: Buffer
): Promise<ExportArtifacts> {
  mkdirSync(outputDir, { recursive: true });

  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const pngPath = join(outputDir, `${baseName}.png`);
  const svgPath = join(outputDir, `${baseName}.svg`);
  const pdfPath = join(outputDir, `${baseName}.pdf`);

  writeFileSync(pngPath, imageBuffer);

  const pngBase64 = imageBuffer.toString("base64");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <image width="${width}" height="${height}" xlink:href="data:image/png;base64,${pngBase64}"/>
</svg>`;
  writeFileSync(svgPath, svg);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([width, height]);
  const pngEmbed = await pdfDoc.embedPng(imageBuffer);
  page.drawImage(pngEmbed, { x: 0, y: 0, width, height });
  writeFileSync(pdfPath, await pdfDoc.save());

  return { pngPath, svgPath, pdfPath, width, height };
}

export function writeTileDebug(outputDir: string, tiles: Buffer[][], prefix: string): void {
  const tilesDir = join(outputDir, `${prefix}-tiles`);
  mkdirSync(tilesDir, { recursive: true });
  let n = 0;
  for (let row = 0; row < tiles.length; row++) {
    for (let col = 0; col < tiles[row].length; col++) {
      writeFileSync(join(tilesDir, `tile-r${row}-c${col}.png`), tiles[row][col]);
      n++;
    }
  }
  console.log(`Saved ${n} debug tiles to ${tilesDir}`);
}

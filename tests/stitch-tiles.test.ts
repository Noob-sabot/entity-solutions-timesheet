import { describe, it } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { stitchTiles } from "../scripts/lib/stitch-tiles.js";

async function solidTile(width: number, height: number, r: number, g: number, b: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r, g, b } },
  })
    .png()
    .toBuffer();
}

describe("stitchTiles", () => {
  it("stitches a 2x1 grid with overlap", async () => {
    const tileW = 100;
    const tileH = 80;
    const dsf = 1;
    const overlap = 20;

    const red = await solidTile(tileW, tileH, 255, 0, 0);
    const blue = await solidTile(tileW, tileH, 0, 0, 255);

    const result = await stitchTiles(
      [[{ buffer: red, col: 0, row: 0 }, { buffer: blue, col: 1, row: 0 }]],
      tileW,
      tileH,
      { overlapPx: overlap, deviceScaleFactor: dsf }
    );

    const meta = await sharp(result).metadata();
    assert.equal(meta.width, tileW + (tileW - overlap));
    assert.equal(meta.height, tileH);
  });

  it("returns single tile unchanged dimensions", async () => {
    const tileW = 50;
    const tileH = 50;
    const green = await solidTile(tileW, tileH, 0, 255, 0);

    const result = await stitchTiles(
      [[{ buffer: green, col: 0, row: 0 }]],
      tileW,
      tileH,
      { overlapPx: 10, deviceScaleFactor: 1 }
    );

    const meta = await sharp(result).metadata();
    assert.equal(meta.width, tileW);
    assert.equal(meta.height, tileH);
  });
});

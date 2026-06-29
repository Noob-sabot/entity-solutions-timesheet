import sharp from "sharp";

export interface Tile {
  buffer: Buffer;
  col: number;
  row: number;
}

export interface StitchOptions {
  overlapPx: number;
  deviceScaleFactor: number;
}

/**
 * Stitch a grid of viewport screenshots into one image.
 * overlapPx is in CSS pixels; tile buffers are at deviceScaleFactor resolution.
 */
export async function stitchTiles(
  tiles: Tile[][],
  tileWidth: number,
  tileHeight: number,
  options: StitchOptions
): Promise<Buffer> {
  const { overlapPx, deviceScaleFactor } = options;
  const overlapDevice = Math.round(overlapPx * deviceScaleFactor);
  const tileW = Math.round(tileWidth * deviceScaleFactor);
  const tileH = Math.round(tileHeight * deviceScaleFactor);
  const stepX = tileW - overlapDevice;
  const stepY = tileH - overlapDevice;

  const rows = tiles.length;
  const cols = tiles[0]?.length ?? 0;

  const outWidth = tileW + (cols - 1) * stepX;
  const outHeight = tileH + (rows - 1) * stepY;

  const composites: sharp.OverlayOptions[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tile = tiles[row][col];
      if (!tile) continue;

      const meta = await sharp(tile.buffer).metadata();
      const tw = meta.width ?? tileW;
      const th = meta.height ?? tileH;

      const cropLeft = col > 0 ? overlapDevice : 0;
      const cropTop = row > 0 ? overlapDevice : 0;
      const cropRight = col < cols - 1 ? overlapDevice : 0;
      const cropBottom = row < rows - 1 ? overlapDevice : 0;

      const cropWidth = tw - cropLeft - cropRight;
      const cropHeight = th - cropTop - cropBottom;

      let input = tile.buffer;
      if (cropLeft || cropTop || cropWidth < tw || cropHeight < th) {
        input = await sharp(tile.buffer)
          .extract({
            left: cropLeft,
            top: cropTop,
            width: Math.max(1, cropWidth),
            height: Math.max(1, cropHeight),
          })
          .toBuffer();
      }

      composites.push({
        input,
        left: col * stepX,
        top: row * stepY,
      });
    }
  }

  return sharp({
    create: {
      width: outWidth,
      height: outHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

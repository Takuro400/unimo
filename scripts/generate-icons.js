// Pure-JS PNG generator for PWA icons — no external deps.
// Produces public/icon-192.png and public/icon-512.png.
// Design: #0D0D0F background, centered silver "U" with a subtle vertical gradient.

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const OUT_DIR = path.resolve(__dirname, "..", "public");

// --------------------- PNG encoder (RGBA, 8-bit) ---------------------

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const rowLen = width * 4;
  const filtered = Buffer.alloc((rowLen + 1) * height);
  for (let y = 0; y < height; y++) {
    filtered[y * (rowLen + 1)] = 0; // filter None
    rgba.copy(filtered, y * (rowLen + 1) + 1, y * rowLen, (y + 1) * rowLen);
  }
  const compressed = zlib.deflateSync(filtered, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: truecolor + alpha
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --------------------- drawing helpers (with anti-aliasing via 3×3 supersample) ---------------------

const SS = 3; // supersample factor for AA

function renderIcon(size) {
  const W = size * SS;
  const H = size * SS;

  // Background color: #0D0D0F
  const BG = [0x0d, 0x0d, 0x0f];
  // Silver gradient (top → bottom): #E0E0E8 → #A0A0A8
  const TOP = [0xe0, 0xe0, 0xe8];
  const BOT = [0xa0, 0xa0, 0xa8];

  // Define "U" geometry relative to canvas (in supersample pixels)
  // Outer U: rounded at the bottom, straight at the top.
  // Stroke the U by (outer shape) ∩ !(inner shape).
  const pad = W * 0.18; // space around the U
  const boxX0 = pad;
  const boxX1 = W - pad;
  const boxY0 = pad;
  const boxY1 = H - pad;
  const stroke = W * 0.145; // thickness of the U stroke
  const bowlRadius = (boxX1 - boxX0) / 2; // radius of the U's bottom half

  const cx = (boxX0 + boxX1) / 2;
  const cyBowl = boxY1 - bowlRadius; // center of the bottom semicircle

  function insideOuter(x, y) {
    if (x < boxX0 || x > boxX1) return false;
    if (y < boxY0 || y > boxY1) return false;
    if (y <= cyBowl) return true;
    const dx = x - cx;
    const dy = y - cyBowl;
    return dx * dx + dy * dy <= bowlRadius * bowlRadius;
  }

  function insideInner(x, y) {
    const ix0 = boxX0 + stroke;
    const ix1 = boxX1 - stroke;
    const iy0 = boxY0 - 1; // open top: extend inner above outer so top reads as "open"
    const iy1 = boxY1 - stroke;
    if (x < ix0 || x > ix1) return false;
    if (y < iy0 || y > iy1) return false;
    if (y <= cyBowl) return true;
    const innerRadius = bowlRadius - stroke;
    const dx = x - cx;
    const dy = y - cyBowl;
    return dx * dx + dy * dy <= innerRadius * innerRadius;
  }

  function silverAt(y) {
    // interpolate top→bottom based on where y falls relative to the U bounds
    const t = Math.min(1, Math.max(0, (y - boxY0) / (boxY1 - boxY0)));
    // ease a touch toward the middle to create a metallic look
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
    return [
      Math.round(TOP[0] + (BOT[0] - TOP[0]) * eased),
      Math.round(TOP[1] + (BOT[1] - TOP[1]) * eased),
      Math.round(TOP[2] + (BOT[2] - TOP[2]) * eased),
    ];
  }

  // Render at supersample resolution as a binary mask, then downsample with averaging.
  const mask = new Uint8Array(W * H); // 0 or 1
  const silverCache = new Array(H);
  for (let y = 0; y < H; y++) silverCache[y] = silverAt(y);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const inStroke = insideOuter(x, y) && !insideInner(x, y);
      mask[y * W + x] = inStroke ? 1 : 0;
    }
  }

  // Downsample to final size
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sum = 0;
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          sum += mask[(y * SS + dy) * W + (x * SS + dx)];
        }
      }
      const coverage = sum / (SS * SS); // 0..1
      const silver = silverCache[y * SS + Math.floor(SS / 2)];
      const r = Math.round(BG[0] * (1 - coverage) + silver[0] * coverage);
      const g = Math.round(BG[1] * (1 - coverage) + silver[1] * coverage);
      const b = Math.round(BG[2] * (1 - coverage) + silver[2] * coverage);
      const i = (y * size + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 0xff;
    }
  }

  return encodePNG(size, size, rgba);
}

function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const size of [192, 512]) {
    const png = renderIcon(size);
    const outPath = path.join(OUT_DIR, `icon-${size}.png`);
    fs.writeFileSync(outPath, png);
    console.log(`wrote ${outPath} (${png.length} bytes)`);
  }
}

main();

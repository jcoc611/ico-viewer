import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { createDemoIco, parseIco, decodeDib } from '../src/ico';
function chunk(type: string, data: Uint8Array) {
  const body = Buffer.concat([Buffer.from(type), data]); let crc = 0xffffffff;
  for (const b of body) { crc ^= b; for (let i = 0; i < 8; i++)crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  const out = Buffer.alloc(body.length + 8); out.writeUInt32BE(data.length); body.copy(out, 4); out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, out.length - 4); return out;
}
function encodePng(width: number, height: number, rgba: Uint8ClampedArray) {
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++)scanlines.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  const header = Buffer.alloc(13); header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(scanlines)), chunk('IEND', new Uint8Array())]);
}
const demo = createDemoIco(), entries = parseIco(demo), last = entries.at(-1)!;
const png = encodePng(last.width, last.height, decodeDib(last));
const mixed = Buffer.alloc(last.offset + png.length); mixed.set(demo.subarray(0, last.offset)); mixed.set(png, last.offset); mixed.writeUInt32LE(png.length, 6 + last.index * 16 + 8);
writeFileSync('fixtures/atlas.ico', demo); writeFileSync('fixtures/mixed.ico', mixed);
// Original pixel arrow: warm white, charcoal outline, and a mint tail cap.
// Keep hard pixel edges at every size, with the hotspot on the upper-left tip.
const arrow = [
  '................',
  '..#.............',
  '..##............',
  '..#w#...........',
  '..#ww#..........',
  '..#www#.........',
  '..#wwww#........',
  '..#wwwww#.......',
  '..#wwwwww#......',
  '..#wwwwwww#.....',
  '..#wwwwwwww#....',
  '..#wwwww####....',
  '..#ww#ww#.......',
  '..#w#.#ww#......',
  '..##...#mm#.....',
  '........##......',
];
const colors: Record<string, number[]> = { '.': [0, 0, 0, 0], '#': [28, 32, 36, 255], w: [255, 252, 235, 255], m: [113, 220, 173, 255] };
const cursorImages = entries.map(({ width: size }, i) => {
  const rgba = new Uint8ClampedArray(size * size * 4);
  const maskStride = Math.ceil(size / 32) * 4;
  const dib = Buffer.alloc(40 + size * size * 4 + maskStride * size);
  dib.writeUInt32LE(40); dib.writeInt32LE(size, 4); dib.writeInt32LE(size * 2, 8); dib.writeUInt16LE(1, 12); dib.writeUInt16LE(32, 14);
  for (let y = 0; y < size; y++)for (let x = 0; x < size; x++) {
    const color = colors[arrow[Math.floor(y * 16 / size)][Math.floor(x * 16 / size)]];
    rgba.set(color, (y * size + x) * 4);
    dib.set([color[2], color[1], color[0], color[3]], 40 + ((size - y - 1) * size + x) * 4);
    if (!color[3]) dib[40 + size * size * 4 + (size - y - 1) * maskStride + (x >> 3)] |= 128 >> (x % 8);
  }
  return { size, data: i === entries.length - 1 ? encodePng(size, size, rgba) : dib };
});
const cursor = Buffer.alloc(6 + cursorImages.length * 16 + cursorImages.reduce((total, image) => total + image.data.length, 0));
cursor.writeUInt16LE(2, 2); cursor.writeUInt16LE(cursorImages.length, 4);
let offset = 6 + cursorImages.length * 16;
cursorImages.forEach(({ size, data }, i) => {
  const p = 6 + i * 16;
  cursor[p] = size % 256; cursor[p + 1] = size % 256;
  cursor.writeUInt16LE(Math.ceil(size * 2 / 16), p + 4); cursor.writeUInt16LE(Math.ceil(size / 16), p + 6);
  cursor.writeUInt32LE(data.length, p + 8); cursor.writeUInt32LE(offset, p + 12);
  cursor.set(data, offset); offset += data.length;
});
writeFileSync('fixtures/mixed.cur', cursor);

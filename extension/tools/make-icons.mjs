import { deflateSync } from "node:zlib"
import { mkdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const sizes = [16, 32, 48, 128]
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "icons")

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, "ascii"), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(width, height, rgba) {
  const idat = deflateSync(Buffer.concat([Buffer.from([0]), rgba]))
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", (() => {
      const h = Buffer.alloc(13)
      h.writeUInt32BE(width, 0)
      h.writeUInt32BE(height, 4)
      h[8] = 8
      h[9] = 6
      return h
    })()),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ])
}

const BG = [17, 24, 39]        // #111827
const BAR_COLORS = [
  [220, 38, 38],   // ID merah
  [250, 204, 21],  // EN kuning
  [37, 99, 235],   // KR biru
]

function drawIcon(size) {
  const px = Buffer.alloc(size * size * 4)
  const radius = size * 0.22

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4

      // rounded-rect background
      const inB = inRoundedRect(x + 0.5, y + 0.5, size, size, radius)
      if (!inB) continue
      px[i] = BG[0]
      px[i + 1] = BG[1]
      px[i + 2] = BG[2]
      px[i + 3] = 255

      // three language bars
      const barCount = 3
      const barW = size * 0.14
      const gap = (size - 2 * size * 0.26 - barCount * barW) / (barCount - 1)
      const barH = size * 0.48
      const top = (size - barH) / 2
      for (let b = 0; b < barCount; b++) {
        const bx = size * 0.26 + b * (barW + gap)
        if (x >= bx && x < bx + barW && y >= top && y < top + barH) {
          px[i] = BAR_COLORS[b][0]
          px[i + 1] = BAR_COLORS[b][1]
          px[i + 2] = BAR_COLORS[b][2]
          px[i + 3] = 255
        }
      }
    }
  }
  return png(size, size, px)
}

function inRoundedRect(x, y, w, h, r) {
  const cx = Math.min(Math.max(x, r), w - r)
  const cy = Math.min(Math.max(y, r), h - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r || (y >= r && y <= h - r) || (x >= r && x <= w - r)
}

mkdirSync(outDir, { recursive: true })
for (const s of sizes) {
  writeFileSync(path.join(outDir, `icon${s}.png`), drawIcon(s))
  console.log(`icon${s}.png written`)
}
import fs from "node:fs"

const pdfPath = process.argv[2]
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
const data = new Uint8Array(fs.readFileSync(pdfPath))
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise

const slabs = []
for (let p = 1; p <= doc.numPages; p++) {
  const page = await doc.getPage(p)
  const content = await page.getTextContent()
  const rows = new Map()
  for (const item of content.items) {
    if (!item.str) continue
    const y = Math.round(item.transform[5])
    if (!rows.has(y)) rows.set(y, [])
    rows.get(y).push({ x: item.transform[4], s: item.str })
  }
  const ys = [...rows.keys()].sort((a, b) => b - a)
  for (const y of ys) {
    slabs.push({ page: p, y, items: rows.get(y).sort((a, b) => a.x - b.x) })
  }
}

const xs = []
for (const s of slabs) for (const it of s.items) xs.push(it.x)
const centers = [100.2, 248.8, 412.9]
const join = (s) => s.replace(/\s+/g, " ").trim()

for (let si = 0; si < slabs.length; si++) {
  const s = slabs[si]
  const cells = []
  for (const it of s.items) {
    let bi = 0
    let bd = Infinity
    for (let i = 0; i < centers.length; i++) {
      const d = Math.abs(it.x - centers[i])
      if (d < bd) { bd = d; bi = i }
    }
    cells[bi] = (cells[bi] || "") + it.s
  }
const text = join(cells.join(" "))
    if (si > 90) break
    const ids = s.items.map((it) => it.x.toFixed(0) + ":" + it.s)
    console.log(si, s.page, s.y, ids.join(" | "))
}
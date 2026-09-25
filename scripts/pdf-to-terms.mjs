import fs from "node:fs"

const pdfPath = process.argv[2]
const outPath = process.argv[3] || "terms.json"

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
    const items = rows.get(y).sort((a, b) => a.x - b.x)
    slabs.push({ page: p, y, items })
  }
}

const xs = []
for (const s of slabs) for (const it of s.items) xs.push(it.x)
const centers = kMeans(xs, 3).sort((a, b) => a - b)

function kMeans(vals, k) {
  let c = []
  for (let i = 1; i <= k; i++) c.push(Math.min(...vals) + (i * (Math.max(...vals) - Math.min(...vals))) / (k + 1))
  for (let iter = 0; iter < 30; iter++) {
    const sum = new Array(k).fill(0)
    const cnt = new Array(k).fill(0)
    for (const v of vals) {
      let bi = 0
      let bd = Infinity
      for (let i = 0; i < k; i++) {
        const d = Math.abs(v - c[i])
        if (d < bd) { bd = d; bi = i }
      }
      sum[bi] += v
      cnt[bi]++
    }
    const nc = c.map((_, i) => (cnt[i] ? sum[i] / cnt[i] : c[i]))
    if (nc.every((v, i) => Math.abs(v - c[i]) < 0.5)) { c = nc; break }
    c = nc
  }
  return c
}

const terms = []
let cur = null
const join = (s) => s.replace(/\s+/g, " ").trim()

for (const s of slabs) {
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
  const c0 = cells[0] ? join(cells[0]) : ""
  const c1 = cells[1] ? join(cells[1]) : ""
  const c2 = cells[2] ? join(cells[2]) : ""

  if (!c0 && !c1 && !c2) continue
  if (c0 && c1 && c2 && c0.includes("Indonesia") && c1.includes("Inggris") && c2.includes("Korea")) continue

  if (c0 || c1) {
    if (cur && (cur.id || cur.en || cur.kr)) terms.push(cur)
    cur = { id: c0, en: c1, kr: c2 }
  } else if (c2 && cur) {
    cur.kr = (cur.kr ? cur.kr + " " : "") + c2
  }
}
if (cur && (cur.id || cur.en || cur.kr)) terms.push(cur)

const cleaned = terms.filter((t) => t.id || t.en || t.kr).map((t) => ({ id: t.id || "", en: t.en || "", kr: t.kr || "" }))

fs.writeFileSync(outPath, JSON.stringify({ centers, count: cleaned.length, terms: cleaned }, null, 2), "utf8")
console.log("centers:", centers.map((c) => c.toFixed(1)), "terms:", cleaned.length)
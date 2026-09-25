import fs from "node:fs"

const pdfPath = process.argv[2]
const outPath = process.argv[3]
if (!pdfPath) {
  console.error("usage: node scripts/pdf-to-text.mjs <file.pdf> [out.txt]")
  process.exit(1)
}

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs")
const data = new Uint8Array(fs.readFileSync(pdfPath))
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise

const all = []
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
  all.push(`=== page ${p} ===`)
  for (const y of ys) {
    const line = rows
      .get(y)
      .sort((a, b) => a.x - b.x)
      .map((i) => i.s)
      .join("")
      .replace(/\s+/g, " ")
      .trim()
    if (line) all.push(line)
  }
}
try {
  await doc.cleanup()
} catch (e) {}
const text = all.join("\n")
if (outPath) fs.writeFileSync(outPath, text, "utf8")
else console.log(text)
console.log("pages:", doc.numPages, "chars:", text.length)
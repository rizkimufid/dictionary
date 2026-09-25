import fs from "node:fs"

const src = process.argv[2] || "C:/Users/Asus/AppData/Local/Temp/opencode/terms.json"
const outJson = process.argv[3] || "terms-cbas.json"
const outSql = "terms-cbas-insert.sql"

const { terms } = JSON.parse(fs.readFileSync(src, "utf8"))

const seen = new Set()
const seenId = new Set()
const clean = []
for (const t of terms) {
  const r = { term_id: (t.id || "").trim(), term_en: (t.en || "").trim(), term_kr: (t.kr || "").trim(), category: "field" }
  const key = r.term_id + "\u0000" + r.term_en + "\u0000" + r.term_kr
  const idKey = r.category + "\u0000" + r.term_id
  if (seen.has(key)) continue
  if (seenId.has(idKey)) continue
  seen.add(key)
  seenId.add(idKey)
  clean.push(r)
}

fs.writeFileSync(outJson, JSON.stringify({ count: clean.length, terms: clean }, null, 2), "utf8")

const esc = (s) => "'" + String(s).replace(/'/g, "''") + "'"
const rows = clean.map((r) => `(${esc(r.term_id)}, ${esc(r.term_en)}, ${esc(r.term_kr)}, ${esc(r.category)})`).join(",\n")
const sql = `-- Dictionary Search: Kosa Kata CBAS (${clean.length} baris)
INSERT INTO terms (term_id, term_en, term_kr, category)
VALUES
${rows};
`
fs.writeFileSync(outSql, sql, "utf8")
console.log("clean:", clean.length, "dup dihapus:", terms.length - clean.length)
console.log("json:", outJson, "| sql:", outSql, "| para-length:", sql.length)
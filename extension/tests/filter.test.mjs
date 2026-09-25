import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import test from "node:test"
import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import path from "node:path"

const dir = path.dirname(fileURLToPath(import.meta.url))
function load(file) {
  const ctx = {}
  runInNewContext(readFileSync(path.join(dir, file), "utf8"), ctx, { filename: file })
  return ctx
}

const match = load("../content/match.js")
const filter = load("../content/filter.js")

function el(tag, text, children = [], parent = null) {
  const nodes = children.length
    ? children
    : text
      ? [text]
      : []
  return {
    nodeType: 1,
    tagName: tag,
    parentElement: parent,
    childNodes: nodes.map((c) =>
      typeof c === "string" ? { nodeType: 3, nodeValue: c } : { ...c, nodeType: 1 }
    ),
    isContentEditable: false,
    disabled: false,
  }
}

test("isLangBadge menerima teks persis EN/ID/KR", () => {
  for (const code of ["EN", "ID", "KR"]) {
    assert.equal(match.isLangBadge(el("span", code)), true, code)
  }
  assert.equal(match.isLangBadge(el("span", " KR \n")), true)
})

test("isLangBadge menolak non-badge dan elemen dengan konten campuran", () => {
  assert.equal(match.isLangBadge(el("span", "ENGLISH")), false)
  assert.equal(match.isLangBadge(el("span", "Korea")), false)
  assert.equal(match.isLangBadge(el("span", "EN", [el("b", "badge")])), false)
  assert.equal(match.isLangBadge(null), false)
  assert.equal(match.isLangBadge({ nodeType: 3, nodeValue: "EN" }), false)
})

test("langFromBadge memetakan ke kode locale", () => {
  assert.equal(match.langFromBadge(el("span", "EN")), "en")
  assert.equal(match.langFromBadge(el("span", "ID")), "id")
  assert.equal(match.langFromBadge(el("span", "KR")), "kr")
  assert.equal(match.langFromBadge(el("span", "XX")), null)
})

test("matchDomain cocok dengan subdomain", () => {
  assert.equal(match.matchDomain("auto-layout.dev", ["auto-layout.dev"]), true)
  assert.equal(match.matchDomain("app.auto-layout.dev", ["auto-layout.dev"]), true)
  assert.equal(match.matchDomain("localhost", ["localhost"]), true)
  assert.equal(match.matchDomain("evil-auto-layout.dev", ["auto-layout.dev"]), false)
  assert.equal(match.matchDomain("x.dev", []), false)
  assert.equal(match.matchDomain("auto-layout.dev", ["https://auto-layout.dev/x"]), true)
})

test("nearestLangBadge mendaki hingga 6 level", () => {
  const badge = el("span", "EN")
  const mid = el("div", "", [], badge)
  const top = el("div", "", [], mid)
  assert.equal(match.nearestLangBadge(mid), badge)
  assert.equal(match.nearestLangBadge(top), badge)
})

test("filterTerms mencari lintas bahasa, case-insensitive, cap 40", () => {
  const terms = [
    { termID: "Nomor KTP", termEN: "ID Card Number", termKR: "주민등록번호", category: "field" },
    { termID: "Nama", termEN: "Name", termKR: "이름", category: "field" },
  ]
  assert.equal(filter.filterTerms("ktp", terms).length, 1)
  assert.equal(filter.filterTerms("id card", terms).length, 1)
  assert.equal(filter.filterTerms("이름", terms).length, 1)
  const batch = Array.from({ length: 60 }, (_, i) => ({
    termID: `Term ${i}`,
    termEN: `English ${i}`,
    termKR: "",
    category: "field",
  }))
  assert.equal(filter.filterTerms("term", batch).length, 40)
})

test("filterTerms query kosong mengembalikan semua (cap 40)", () => {
  const terms = [
    { termID: "A", termEN: "", termKR: "", category: "field" },
    { termID: "B", termEN: "", termKR: "", category: "field" },
  ]
  assert.equal(filter.filterTerms("", terms).length, 2)
})
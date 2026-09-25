import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import test from "node:test"
import assert from "node:assert"
import { fileURLToPath } from "node:url"
import path from "node:path"

const dir = path.dirname(fileURLToPath(import.meta.url))
const ctx = {}
runInNewContext(readFileSync(path.join(dir, "../content/match.js"), "utf8"), ctx)

function textNode(v) {
  return { nodeType: 3, nodeValue: v }
}

function el(className, text) {
  const node = { nodeType: 1, childNodes: [], parentElement: null }
  if (className) node.className = className
  if (text) node.childNodes.push(textNode(text))
  return node
}

test("isLangBadge menerima teks persis EN/ID/KR", () => {
  assert.equal(ctx.isLangBadge(el(null, "EN")), true)
  assert.equal(ctx.isLangBadge(el(null, " ID ")), true)
  assert.equal(ctx.isLangBadge(el(null, "KR")), true)
  assert.equal(ctx.isLangBadge(el("some-class", "EN")), true, "class+teks EN tetap badge")
  assert.equal(ctx.isLangBadge(el(null, "EN / ID")), false, "teks campuran bukan badge")
})

test("isLangBadge menerima ikon bendera fi-id/fi-gb/fi-kr", () => {
  assert.equal(ctx.isLangBadge(el("fi fi-id")), true)
  assert.equal(ctx.isLangBadge(el("fi fi-gb")), true)
  assert.equal(ctx.isLangBadge(el("fi fi-us")), true)
  assert.equal(ctx.isLangBadge(el("fi fi-kr")), true)
  assert.equal(ctx.isLangBadge(el("fi fi-fr")), false)
  assert.equal(ctx.isLangBadge(el("fi (tanpa kode)")), false)
})

test("langFromBadge memetakan teks dan bendera ke kode locale", () => {
  assert.equal(ctx.langFromBadge(el(null, "EN")), "en")
  assert.equal(ctx.langFromBadge(el(null, "ID")), "id")
  assert.equal(ctx.langFromBadge(el("fi fi-gb")), "en")
  assert.equal(ctx.langFromBadge(el("fi fi-kr")), "kr")
  assert.equal(ctx.langFromBadge(el(null, "EN - lain")), null)
})

test("nearestLangBadge mendaki hingga 6 level", () => {
  const flag = el("fi fi-id")
  let parent = flag
  for (let i = 0; i < 3; i++) {
    const p = el("div")
    p.childNodes.push(parent)
    parent.parentElement = p
    parent = p
  }
  assert.equal(ctx.nearestLangBadge(flag), flag)

  const plain = el("span", "teks biasa")
  let p2 = plain
  for (let i = 0; i < 8; i++) {
    const p = el("div")
    p.childNodes.push(p2)
    p2.parentElement = p
    p2 = p
  }
  assert.equal(ctx.nearestLangBadge(plain), null)
})

test("matchDomain cocok dengan subdomain (eksport tersedia)", () => {
  assert.equal(ctx.matchDomain("110.239.67.31", ["110.239.67.31"]), true)
  assert.equal(ctx.matchDomain("auto-layout.dev", ["layout.dev"]), false)
})
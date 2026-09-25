import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import test from "node:test"
import assert from "node:assert"
import { fileURLToPath } from "node:url"
import path from "node:path"

const dir = path.dirname(fileURLToPath(import.meta.url))
const ctx = {}
ctx.URL = globalThis.URL
runInNewContext(readFileSync(path.join(dir, "../options/patterns.js"), "utf8"), ctx)

test("domainPatterns menghasilkan http+https", () => {
  assert.deepEqual(ctx.domainPatterns("auto-layout.dev"), [
    "http://auto-layout.dev/*",
    "https://auto-layout.dev/*",
  ])
})

test("domainPatterns membersihkan scheme, port, path, dan huruf besar", () => {
  assert.deepEqual(ctx.domainPatterns("https://App.Example.com:8080/path"), [
    "http://app.example.com/*",
    "https://app.example.com/*",
  ])
  assert.deepEqual(ctx.domainPatterns("localhost"), [
    "http://localhost/*",
    "https://localhost/*",
  ])
  assert.deepEqual(ctx.domainPatterns(""), [])
})

test("originPattern memetakan URL ke pattern origin", () => {
  assert.equal(
    ctx.originPattern("https://abc.supabase.co"),
    "https://abc.supabase.co/*"
  )
  assert.equal(
    ctx.originPattern("https://abc.supabase.co/auth"),
    "https://abc.supabase.co/*"
  )
  assert.equal(ctx.originPattern("bukan-url"), null)
  assert.equal(ctx.originPattern(""), null)
})
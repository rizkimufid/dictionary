import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import test from "node:test"
import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import path from "node:path"

const dir = path.dirname(fileURLToPath(import.meta.url))
function load(file, customFetch) {
  const ctx = {
    chrome: {
      storage: {
        local: {
          get: async () => ({ dictTerms: [] }),
          set: async () => {},
        },
      },
    },
    fetch: customFetch || globalThis.fetch,
    URL: globalThis.URL,
    encodeURIComponent: globalThis.encodeURIComponent,
    parseInt: globalThis.parseInt,
    Array: globalThis.Array,
    Date: globalThis.Date,
  }
  runInNewContext(readFileSync(path.join(dir, file), "utf8"), ctx, { filename: file })
  return ctx
}

test("buildSearchQuery menghasilkan or filter untuk ilike PostgREST", () => {
  const termsModule = load("../common/terms.js")
  assert.equal(termsModule.buildSearchQuery(""), "")
  assert.equal(termsModule.buildSearchQuery("   "), "")

  const q = termsModule.buildSearchQuery("ktp")
  assert.ok(q.startsWith("or=("))
  assert.ok(q.includes("term_id.ilike.*ktp*"))
  assert.ok(q.includes("term_en.ilike.*ktp*"))
  assert.ok(q.includes("term_kr.ilike.*ktp*"))
  assert.ok(q.includes("category.ilike.*ktp*"))
  assert.ok(q.includes("description.ilike.*ktp*"))
})

test("buildSearchQuery membersihkan karakter khusus PostgREST", () => {
  const termsModule = load("../common/terms.js")
  const q = termsModule.buildSearchQuery('(test, "value" % *)')
  assert.ok(!q.includes("(" && q.indexOf("(") !== 3)) // only outer or=(
  assert.ok(q.includes("test"))
  assert.ok(q.includes("value"))
})

test("searchSupabaseTerms memanggil fetch dengan URL dan pagination yang tepat", async () => {
  let requestedUrl = ""
  let requestedHeaders = null

  const mockFetch = async (url, opts) => {
    requestedUrl = url
    requestedHeaders = opts.headers
    return {
      ok: true,
      headers: {
        get: (h) => (h === "content-range" ? "0-1/10" : null),
      },
      json: async () => [
        { term_id: "T1", term_en: "E1", term_kr: "K1", category: "field" },
        { term_id: "T2", term_en: "E2", term_kr: "K2", category: "field" },
      ],
    }
  }

  const termsModule = load("../common/terms.js", mockFetch)
  const res = await termsModule.searchSupabaseTerms(
    { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "fake-key" },
    { query: "hello", limit: 2, offset: 0 }
  )

  assert.equal(res.terms.length, 2)
  assert.equal(res.total, 10)
  assert.equal(res.hasMore, true)
  assert.equal(res.terms[0].termID, "T1")
  assert.ok(requestedUrl.includes("/rest/v1/terms?"))
  assert.ok(requestedUrl.includes("limit=2"))
  assert.ok(requestedUrl.includes("offset=0"))
  assert.ok(requestedUrl.includes("or="))
  assert.equal(requestedHeaders.apikey, "fake-key")
})

test("fetchSupabaseTerms otomatis melakukan pagination jika lebih dari 1000 baris", async () => {
  let callCount = 0
  const mockFetch = async (url) => {
    callCount++
    if (callCount === 1) {
      // Kembalikan 1000 item pertama
      const chunk = Array.from({ length: 1000 }, (_, i) => ({
        term_id: `Term ${i}`,
        term_en: `English ${i}`,
      }))
      return { ok: true, json: async () => chunk }
    } else {
      // Kembalikan 16 item sisa
      const chunk = Array.from({ length: 16 }, (_, i) => ({
        term_id: `Term ${1000 + i}`,
        term_en: `English ${1000 + i}`,
      }))
      return { ok: true, json: async () => chunk }
    }
  }

  const termsModule = load("../common/terms.js", mockFetch)
  const res = await termsModule.fetchSupabaseTerms({
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "fake-key",
  })

  assert.equal(callCount, 2)
  assert.equal(res.length, 1016)
  assert.equal(res[1000].termID, "Term 1000")
})

test("countSupabaseTerms mengambil total baris secara ringan melalui header content-range", async () => {
  let requestedUrl = ""
  let requestedHeaders = null

  const mockFetch = async (url, opts) => {
    requestedUrl = url
    requestedHeaders = opts.headers
    return {
      ok: true,
      headers: {
        get: (h) => (h === "content-range" ? "0-0/1029" : null),
      },
      json: async () => [{ id: "test-id" }],
    }
  }

  const termsModule = load("../common/terms.js", mockFetch)
  const count = await termsModule.countSupabaseTerms({
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "fake-key",
  })

  assert.equal(count, 1029)
  assert.ok(requestedUrl.includes("/rest/v1/terms?select=id"))
  assert.equal(requestedHeaders.Prefer, "count=exact")
  assert.equal(requestedHeaders.Range, "0-0")
})

test("fetchRecentTerms memanggil searchSupabaseTerms dengan limit awal ringan", async () => {
  let requestedLimit = 0
  const mockFetch = async (url) => {
    if (url.includes("limit=30")) requestedLimit = 30
    return {
      ok: true,
      headers: {
        get: () => "0-29/1029",
      },
      json: async () => Array.from({ length: 30 }, (_, i) => ({ term_id: `ID ${i}`, term_en: `EN ${i}` })),
    }
  }

  const termsModule = load("../common/terms.js", mockFetch)
  const terms = await termsModule.fetchRecentTerms(
    { supabaseUrl: "https://example.supabase.co", supabaseAnonKey: "fake-key" },
    30
  )

  assert.equal(requestedLimit, 30)
  assert.equal(terms.length, 30)
  assert.equal(terms[0].termID, "ID 0")
})

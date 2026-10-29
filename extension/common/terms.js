"use strict"

function termFromRow(r) {
  return {
    termID: r.term_id || "",
    termEN: r.term_en || "",
    termKR: r.term_kr || "",
    category: r.category || "",
    description: r.description || "",
  }
}

function buildSearchQuery(q) {
  var clean = String(q || "").replace(/[(),"%*\\]/g, " ").trim()
  if (!clean) return ""
  var pattern = "*" + clean + "*"
  var enc = encodeURIComponent(pattern)
  return "or=(term_id.ilike." + enc + ",term_en.ilike." + enc + ",term_kr.ilike." + enc + ",category.ilike." + enc + ",description.ilike." + enc + ")"
}

async function searchSupabaseTerms(cfg, opts) {
  opts = opts || {}
  if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    return { terms: [], total: 0, hasMore: false }
  }
  var limit = typeof opts.limit === "number" ? opts.limit : 30
  var offset = typeof opts.offset === "number" ? opts.offset : 0
  var query = opts.query || ""
  var signal = opts.signal || null

  var params = [
    "select=*",
    "order=created_at.desc",
    "limit=" + encodeURIComponent(limit),
    "offset=" + encodeURIComponent(offset),
  ]

  var searchParam = buildSearchQuery(query)
  if (searchParam) {
    params.push(searchParam)
  }

  var url = cfg.supabaseUrl.replace(/\/$/, "") + "/rest/v1/terms?" + params.join("&")
  var res = await fetch(url, {
    signal: signal,
    headers: {
      apikey: cfg.supabaseAnonKey,
      Authorization: "Bearer " + cfg.supabaseAnonKey,
      Prefer: "count=exact",
    },
  })

  if (!res.ok) throw new Error("HTTP " + res.status)

  var contentRange = res.headers.get("content-range") || ""
  var total = null
  if (contentRange && contentRange.indexOf("/") !== -1) {
    var totalStr = contentRange.split("/")[1]
    if (totalStr && totalStr !== "*") {
      total = parseInt(totalStr, 10)
    }
  }

  var rows = await res.json()
  var terms = rows.map(termFromRow)
  var hasMore = total !== null ? (offset + terms.length < total) : (terms.length === limit)

  return {
    terms: terms,
    total: total !== null ? total : terms.length,
    hasMore: hasMore,
  }
}

async function countSupabaseTerms(cfg) {
  if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return 0
  var url = cfg.supabaseUrl.replace(/\/$/, "") + "/rest/v1/terms?select=id"
  var res = await fetch(url, {
    headers: {
      apikey: cfg.supabaseAnonKey,
      Authorization: "Bearer " + cfg.supabaseAnonKey,
      Prefer: "count=exact",
      Range: "0-0",
    },
  })
  if (!res.ok) throw new Error("HTTP " + res.status)
  var contentRange = res.headers.get("content-range") || ""
  if (contentRange && contentRange.indexOf("/") !== -1) {
    var totalStr = contentRange.split("/")[1]
    if (totalStr && totalStr !== "*") {
      return parseInt(totalStr, 10)
    }
  }
  return 0
}

async function fetchRecentTerms(cfg, limit) {
  var lim = typeof limit === "number" ? limit : 30
  var res = await searchSupabaseTerms(cfg, { limit: lim, offset: 0, query: "" })
  return res.terms || []
}

async function fetchSupabaseTerms(cfg) {
  if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) return []
  var allRows = []
  var offset = 0
  var pageSize = 1000
  while (true) {
    var url =
      cfg.supabaseUrl.replace(/\/$/, "") +
      "/rest/v1/terms?select=*&order=created_at.desc&limit=" +
      pageSize +
      "&offset=" +
      offset
    var res = await fetch(url, {
      headers: {
        apikey: cfg.supabaseAnonKey,
        Authorization: "Bearer " + cfg.supabaseAnonKey,
      },
    })
    if (!res.ok) throw new Error("HTTP " + res.status)
    var rows = await res.json()
    if (!Array.isArray(rows) || !rows.length) break
    allRows.push.apply(allRows, rows)
    if (rows.length < pageSize) break
    offset += rows.length
  }
  return allRows.map(termFromRow)
}

async function cacheTerms(terms) {
  await chrome.storage.local.set({ dictTerms: terms, dictTermsAt: Date.now() })
}

async function cachedTerms() {
  var v = await chrome.storage.local.get({ dictTerms: null })
  return v.dictTerms || []
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    termFromRow,
    buildSearchQuery,
    countSupabaseTerms,
    fetchRecentTerms,
    searchSupabaseTerms,
    fetchSupabaseTerms,
    cacheTerms,
    cachedTerms,
  }
}

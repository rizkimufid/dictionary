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

async function fetchSupabaseTerms(cfg) {
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return []
  var url = cfg.supabaseUrl.replace(/\/$/, "") + "/rest/v1/terms?select=*"
  var res = await fetch(url, {
    headers: {
      apikey: cfg.supabaseAnonKey,
      Authorization: "Bearer " + cfg.supabaseAnonKey,
    },
  })
  if (!res.ok) throw new Error("HTTP " + res.status)
  var rows = await res.json()
  return rows.map(termFromRow)
}

async function cacheTerms(terms) {
  await chrome.storage.local.set({ dictTerms: terms, dictTermsAt: Date.now() })
}

async function cachedTerms() {
  var v = await chrome.storage.local.get({ dictTerms: null })
  return v.dictTerms || []
}
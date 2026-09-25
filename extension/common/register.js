"use strict"

var DICT_SCRIPT_ID = "dict-search"
var DICT_CONTENT_FILES = [
  "/content/match.js",
  "/content/filter.js",
  "/content/toast.js",
  "/content/popover.js",
  "/common/terms.js",
  "/content/script.js",
]

function dictOrigins(domains, supabaseUrl) {
  var origins = []
  for (var i = 0; i < (domains || []).length; i++) {
    origins.push.apply(origins, domainPatterns(domains[i]))
  }
  var so = originPattern(supabaseUrl)
  if (so) origins.push(so)
  return origins
}

async function registerDictScripts(domains, supabaseUrl) {
  var contentMatches = dictOrigins(domains, supabaseUrl).filter(
    function (o) { return o !== originPattern(supabaseUrl) }
  )
  if (!contentMatches.length) {
    return { ok: false, reason: "no-domains" }
  }
  try {
    await chrome.scripting.unregisterContentScripts({ ids: [DICT_SCRIPT_ID] })
  } catch (e) {
    /* belum terdaftar — abaikan */
  }
  try {
    await chrome.scripting.registerContentScripts([
      {
        id: DICT_SCRIPT_ID,
        matches: contentMatches,
        js: DICT_CONTENT_FILES,
        runAt: "document_idle",
      },
    ])
    return { ok: true, matches: contentMatches }
  } catch (e) {
    return { ok: false, reason: "register", error: e }
  }
}
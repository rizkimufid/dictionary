"use strict"

function filterTerms(query, terms) {
  var q = String(query || "").trim().toLowerCase()
  if (!q) return terms.slice(0, 40)
  var out = []
  for (var i = 0; i < terms.length && out.length < 40; i++) {
    var t = terms[i]
    var hay = [t.termID, t.termEN, t.termKR, t.category, t.description || ""]
      .join(" ")
      .toLowerCase()
    if (hay.indexOf(q) !== -1) out.push(t)
  }
  return out
}
"use strict"

var LANG_CODES = { EN: "en", ID: "id", KR: "kr" }
var LANG_FLAGS = { "fi-id": "id", "fi-gb": "en", "fi-us": "en", "fi-kr": "kr" }

function directText(el) {
  var out = ""
  for (var i = 0; i < el.childNodes.length; i++) {
    var n = el.childNodes[i]
    if (n.nodeType === 3) out += n.nodeValue
  }
  return out
}

function flagLang(el) {
  if (!el || el.nodeType !== 1) return null
  var classes = String(el.className || "").split(/\s+/)
  for (var i = 0; i < classes.length; i++) {
    if (LANG_FLAGS[classes[i]]) return LANG_FLAGS[classes[i]]
  }
  return null
}

function isLangBadge(el) {
  if (!el || el.nodeType !== 1) return false
  if (directText(el).trim() in LANG_CODES) return true
  return !!flagLang(el)
}

function langFromBadge(el) {
  if (!el || !isLangBadge(el)) return null
  var text = directText(el).trim()
  if (text in LANG_CODES) return LANG_CODES[text]
  return flagLang(el)
}

function matchDomain(hostname, domains) {
  if (!domains || !domains.length) return false
  hostname = hostname.toLowerCase()
  return domains.some(function (d) {
    d = String(d || "")
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^\.+/, "")
      .split("/")[0]
      .split(":")[0]
    if (!d) return false
    return hostname === d || hostname.endsWith("." + d)
  })
}

function nearestLangBadge(el) {
  var node = el
  for (var depth = 0; node && node.nodeType === 1 && depth < 6; node = node.parentElement, depth++) {
    if (isLangBadge(node)) return node
  }
  return null
}
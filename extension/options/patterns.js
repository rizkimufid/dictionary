"use strict"

function cleanDomain(d) {
  return String(d || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .split(":")[0]
}

function domainPatterns(domain) {
  var host = cleanDomain(domain)
  if (!host) return []
  return ["http://" + host + "/*", "https://" + host + "/*"]
}

function originPattern(url) {
  try {
    var u = new URL(String(url || "").trim())
    if (!u.hostname) return null
    return u.protocol + "//" + u.host + "/*"
  } catch (e) {
    return null
  }
}
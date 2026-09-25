"use strict"

var lastEditable = null

function isEditable(el) {
  return (
    el &&
    el.nodeType === 1 &&
    (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) &&
    !el.disabled &&
    el.getAttribute("readonly") === null
  )
}

document.addEventListener(
  "focusin",
  function (e) {
    var t = e.target
    if (isEditable(t) && !(DictSearchPopover.host && e.composedPath().indexOf(DictSearchPopover.host) !== -1)) {
      lastEditable = t
    }
  },
  true
)

async function getSettings() {
  var stored = await chrome.storage.sync.get({ domains: [], supabaseUrl: "", supabaseAnonKey: "" })
  return stored
}

async function fetchTerms(cfg) {
  return fetchSupabaseTerms(cfg)
}

function rectCenter(r) {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

function distTo(a, b) {
  try {
    var ra = a.getBoundingClientRect()
    var rb = b.getBoundingClientRect()
    if (!ra.width && !ra.height) return 1e9
    var ca = rectCenter(ra)
    var cb = rectCenter(rb)
    return Math.sqrt((ca.x - cb.x) * (ca.x - cb.x) + (ca.y - cb.y) * (ca.y - cb.y))
  } catch (e) {
    return 1e9
  }
}

function inputForEl(el) {
  var n = el
  while (n && n.nodeType === 1) {
    var inps = n.querySelectorAll("input, textarea")
    if (inps.length) {
      var best = null
      var bestD = Infinity
      for (var i = 0; i < inps.length; i++) {
        if (inps[i].disabled || inps[i].getAttribute("readonly") !== null) continue
        var d = distTo(inps[i], el)
        if (d < bestD) {
          bestD = d
          best = inps[i]
        }
      }
      if (best) return best
    }
    n = n.parentElement
  }
  return null
}

function translateOf(term, lang) {
  return (term && term["term" + String(lang).toUpperCase()]) || ""
}

function setInputValue(el, text) {
  el.value = text
  el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }))
  el.focus()
}

function countLangBadges(container) {
  if (!container || !container.querySelectorAll) return 0
  var nodes = container.querySelectorAll('span[class*="fi-"]')
  var seen = {}
  var count = 0
  for (var i = 0; i < nodes.length; i++) {
    var l = langFromBadge(nodes[i])
    if (l && !seen[l]) {
      seen[l] = 1
      count++
    }
  }
  return count
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

function groupFor(el) {
  var n = el
  for (var depth = 0; n && n.nodeType === 1 && depth < 12; n = n.parentElement, depth++) {
    if (countLangBadges(n) >= 2) return n
  }
  return null
}

function siblingGroups(root, fromGroup) {
  var out = []
  var flags = root.querySelectorAll('span[class*="fi-"]')
  for (var i = 0; i < flags.length; i++) {
    var g = groupFor(flags[i])
    if (!g || g === fromGroup) continue
    var dup = false
    for (var j = 0; j < out.length; j++) {
      if (out[j] === g) {
        dup = true
        break
      }
    }
    if (!dup) out.push(g)
  }
  return out
}

// Commit ulang nilai trio i18n lain (editor lain) agar triggerFieldPropsReactivity
// memaksa re-render dan trio inert mendapat gen DOM baru yang hidup.
async function nudgeSibling(fromGroup) {
  var root = fromGroup && fromGroup.ownerDocument ? fromGroup.ownerDocument.body : document.body
  var groups = siblingGroups(root, fromGroup)
  for (var g = 0; g < groups.length; g++) {
    var badges = groups[g].querySelectorAll('span[class*="fi-"]')
    for (var b = 0; b < badges.length; b++) {
      var l = langFromBadge(badges[b])
      var inp = inputForEl(badges[b])
      if (!l || !inp || !String(inp.value).trim()) continue
      try {
        inp.setAttribute("data-dictnudge", "1")
      } catch (e) {}
      try {
        injectPageScript(pageTypeSnippet('[data-dictnudge="1"]', String(inp.value)))
      } catch (err) {
        setInputValue(inp, String(inp.value))
      }
      return true
    }
  }
  return false
}

async function applyGroupFill(group, term) {
  var fills = []
  var nodes = group.querySelectorAll('span[class*="fi-"]')
  for (var i = 0; i < nodes.length; i++) {
    var l = langFromBadge(nodes[i])
    var text = translateOf(term, l)
    if (l && text) fills.push({ lang: l, text: text })
  }

  for (var m = 0; m < fills.length; m++) {
    var markInp = inputForEl(findBadge(group, fills[m].lang))
    if (markInp) markInp.setAttribute("data-dictprobe", fills[m].lang)
  }
  injectPageScript(pageCaptureCode())
  try {
    var gb = group.querySelectorAll('span[class*="fi-"]')
    var langsInGroup = {}
    gb.forEach(function (b) {
      var l = langFromBadge(b)
      if (l) langsInGroup[l] = 1
    })
    console.info("[Dictionary Search] G> badges=" + gb.length + " langs=" + Object.keys(langsInGroup).sort().join(","))
  } catch (e) {}

  await sleep(150)

  var order = ["id", "en", "kr"]
  var seen = {}
  var filledLangs = []
  function findFill(l) {
    for (var f = 0; f < fills.length; f++) {
      if (fills[f].lang === l) return fills[f]
    }
    return null
  }
  function typeIntoInp(l, text) {
    var inp = inputForEl(findBadge(group, l))
    if (!inp) return null
    try {
      inp.setAttribute("data-dictprobe", l)
    } catch (e) {}
    try {
      injectPageScript(pageTypeCode(l, text))
    } catch (err) {
      setInputValue(inp, text)
    }
    return inp
  }
  function typeLang(l) {
    var pair = findFill(l)
    if (!pair) return false
    var cur = inputForEl(findBadge(group, l))
    if (cur && String(cur.value).trim() === String(pair.text).trim()) {
      if (filledLangs.indexOf(l.toUpperCase()) === -1) filledLangs.push(l.toUpperCase())
      return false
    }
    var inp = typeIntoInp(l, pair.text)
    if (!inp) return false
    if (filledLangs.indexOf(l.toUpperCase()) === -1) filledLangs.push(l.toUpperCase())
    try {
      console.info(
        "[Dictionary Search] G> " + l + " target=" + inp.localName + " vis=" + (inp.offsetParent !== null) + " cls=" + String(inp.className).slice(0, 40)
      )
    } catch (e) {}
    return true
  }
  for (var o = 0; o < order.length; o++) {
    var l = order[o]
    if (seen[l]) continue
    seen[l] = 1
    if (findFill(l)) {
      typeLang(l)
      pageSample("step-" + l)
    }
  }
  await sleep(350)
  var tries = 0
  while (tries < 5) {
    var need = []
    for (var q = 0; q < fills.length; q++) {
      var inpQ = inputForEl(findBadge(group, fills[q].lang))
      if (!inpQ || String(inpQ.value).trim() !== String(fills[q].text).trim()) {
        need.push(fills[q].lang)
      }
    }
    if (!need.length) break
    tries++
    try {
      console.info("[Dictionary Search] R> retry#" + tries + " langs=" + need.join(","))
    } catch (e) {}
    for (var r = 0; r < need.length; r++) {
      typeIntoInp(need[r], findFill(need[r]).text)
      await sleep(350)
    }
    var after = []
    for (var q2 = 0; q2 < fills.length; q2++) {
      var inpV = inputForEl(findBadge(group, fills[q2].lang))
      if (!inpV || String(inpV.value).trim() !== String(fills[q2].text).trim()) {
        after.push(fills[q2].lang)
      }
    }
    if (after.length && tries === 2) {
      var nudged = false
      try {
        nudged = await nudgeSibling(group)
      } catch (e) {}
      try {
        console.info("[Dictionary Search] N> nudge=" + (nudged ? 1 : 0))
      } catch (e) {}
      if (nudged) {
        await sleep(500)
        for (var n2 = 0; n2 < after.length; n2++) {
          typeIntoInp(after[n2], findFill(after[n2]).text)
          await sleep(350)
        }
      }
    }
  }
  try {
    var marks = (group.ownerDocument || document).querySelectorAll("[data-dictprobe], [data-dictnudge]")
    for (var c = 0; c < marks.length; c++) {
      marks[c].removeAttribute("data-dictprobe")
      marks[c].removeAttribute("data-dictnudge")
    }
  } catch (e) {}
  try {
    console.info("[Dictionary Search] G> filled=" + filledLangs.join(",") + " tries=" + tries)
  } catch (e) {}
  Toast.show(filledLangs.length ? "Terisi: " + filledLangs.join(", ") : "Term belum punya terjemahan untuk group ini")
}

function pageTypeSnippet(selector, text) {
  return (
    "try{(function(){" +
    "var q=document.querySelector(" + JSON.stringify(selector) + ");" +
    "if(q){" +
    "q.dispatchEvent(new MouseEvent('pointerdown',{bubbles:true,cancelable:true}));" +
    "q.dispatchEvent(new MouseEvent('mousedown',{bubbles:true,cancelable:true}));" +
    "q.dispatchEvent(new MouseEvent('pointerup',{bubbles:true,cancelable:true}));" +
    "q.dispatchEvent(new MouseEvent('mouseup',{bubbles:true,cancelable:true}));" +
    "q.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));" +
    "q.focus();q.select();" +
    "document.execCommand('insertText',false," + JSON.stringify(text) + ");" +
    "}" +
    "})()}catch(e){}"
  )
}

function pageTypeCode(lang, text) {
  return pageTypeSnippet('[data-dictprobe="' + lang + '"]', text)
}

function pageTypeEither(lang, text) {
  return pageTypeCode(lang, text) + pageTypeSnippet('[data-dictprobe="single"]', text)
}

function pageCaptureCode() {
  return (
    "(" +
    function () {
      var streams = []
      document.addEventListener(
        "input",
        function (e) {
          var t = e.target
          if (!t || !t.tagName) return
          var mk =
            (t.getAttribute && t.getAttribute("data-dictprobe")) ||
            (t.closest && t.closest("[data-dictprobe]") && t.closest("[data-dictprobe]").getAttribute("data-dictprobe"))
          if (!mk) return
          streams.push({ l: mk, v: String(t.value).slice(0, 60), c: !!t.isConnected })
        },
        true
      )
      window.addEventListener("dictprobe:sample", function (e) {
        try {
          var tag = String(e.detail || "")
          var detail = { tag: tag, streams: streams.slice(-40), marks: {} }
          document.querySelectorAll("[data-dictprobe]").forEach(function (inp) {
            var l = inp.getAttribute("data-dictprobe")
            detail.marks[l] = { val: String(inp.value).slice(0, 60), len: inp.value.length, vis: inp.offsetParent !== null }
          })
          window.dispatchEvent(new CustomEvent("dictprobe:report", { detail: JSON.stringify(detail) }))
        } catch (err) {}
      })
    }.toString() +
    ")()"
  )
}

function findBadge(group, lang) {
  var fresh = group.querySelectorAll('span[class*="fi-"]')
  for (var j = 0; j < fresh.length; j++) {
    if (langFromBadge(fresh[j]) === lang) return fresh[j]
  }
  return null
}

function injectPageScript(src) {
  var s = document.createElement("script")
  s.textContent = src
  ;(document.head || document.documentElement).appendChild(s)
  s.remove()
}

var probeReportHooked = false
function hookProbeReport() {
  if (probeReportHooked) return
  probeReportHooked = true
  window.addEventListener("dictprobe:report", function (e) {
    try {
      var det = JSON.parse(e.detail || "{}")
      console.info("[Dictionary Search] PROBE " + JSON.stringify(det))
    } catch (err) {
      try {
        console.info("[Dictionary Search] PROBE raw", String(e.detail).slice(0, 600))
      } catch (e2) {}
    }
  })
}

function pageSample(tag) {
  try {
    window.dispatchEvent(new CustomEvent("dictprobe:sample", { detail: String(tag) }))
  } catch (e) {}
}

async function applyPick(lang, term, targetEl) {
  var text = translateOf(term, lang)
  if (!text) {
    Toast.show("Term ini belum punya terjemahan " + lang.toUpperCase())
    return
  }
  var el =
    (targetEl && document.contains(targetEl) && targetEl) ||
    (lastEditable && document.contains(lastEditable) && lastEditable)
  if (!el) {
    navigator.clipboard.writeText(text)
    Toast.show("Disalin: " + text)
    return
  }
  var v = { fillAll: true }
  try {
    v = await chrome.storage.sync.get({ fillAll: true })
  } catch (e) {
    v = { fillAll: true }
  }
  if (v.fillAll !== false) {
    var group = groupFor(el)
    if (group) {
      applyGroupFill(group, term)
      return
    }
  }
  var inp = inputForEl(el)
  if (!inp) {
    Toast.show("Klik di kolom/area teks dulu")
    return
  }
  try {
    inp.setAttribute("data-dictprobe", "single")
  } catch (e) {}
  injectPageScript(pageCaptureCode())
  try {
    injectPageScript(pageTypeEither(lang, text))
  } catch (err) {
    setInputValue(inp, text)
  }
  await sleep(400)
  pageSample("single-final")
  await sleep(1200)
  pageSample("single-late")
  Toast.show("Terisi: " + text)
}

function setTerms(terms) {
  var t = terms || []
  DictSearchPopover.setTerms(t)
  window.dictTerms = t
}

document.addEventListener(
  "click",
  function (e) {
    var badge = nearestLangBadge(e.target)
    if (!badge) return
    var lang = langFromBadge(badge)
    if (!lang) return
    console.info("[Dictionary Search] klik badge:", lang)
    e.preventDefault()
    e.stopPropagation()
    setTerms(window.dictTerms || [])
    var rect = badge.getBoundingClientRect()
    DictSearchPopover.open(
      { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
      lang,
      applyPick,
      badge
    )
    DictSearchPopover.refresh()
  },
  true
)

async function init() {
  console.info("[Dictionary Search] content script dimuat di", location.origin)
  var cfg
  try {
    cfg = await getSettings()
  } catch (e) {
    console.error("[Dictionary Search] gagal baca settings:", e)
    return
  }
  if (!matchDomain(location.hostname, cfg.domains || [])) {
    console.warn("[Dictionary Search] domain tidak cocok:", location.hostname, cfg.domains)
    return
  }
  console.info("[Dictionary Search] aktif:", location.origin)

  var configured = !!(cfg.supabaseUrl && cfg.supabaseAnonKey)
  DictSearchPopover.setSupabaseConfigured(configured)

  var terms = []
  try {
    terms = await cachedTerms()
  } catch (e) {
    terms = []
  }
  if (!terms.length) {
    try {
      terms = await fetchTerms(cfg)
      if (terms.length) cacheTerms(terms).catch(function () {})
    } catch (e) {
      console.error("[Dictionary Search] gagal memuat dictionary:", e)
      terms = []
    }
  }
  setTerms(terms)
  DictSearchPopover.setTermsLoaded(terms.length > 0)
  if (configured && !terms.length) {
    Toast.show("Kamus belum termuat — klik ikon toolbar > Berikan Akses untuk memuat.")
  }
}

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === "local" && changes.dictTerms) {
    DictSearchPopover.setTerms(changes.dictTerms.newValue || [])
  }
})

init()
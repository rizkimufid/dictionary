"use strict"

var DictSearchPopover = {
  host: null,
  rootEl: null,
  listEl: null,
  inputEl: null,
  onPick: null,
  results: [],
  activeIndex: 0,
  supabaseConfigured: false,
  termsLoaded: false,
  fillAll: true,
  faEl: null,

  setSupabaseConfigured: function (v) {
    this.supabaseConfigured = !!v
  },

  setTermsLoaded: function (v) {
    this.termsLoaded = !!v
  },

  syncFillAll: function () {
    var self = this
    chrome.storage.sync.get({ fillAll: true }).then(function (v) {
      if (!self.host) return
      self.setFillAll(v.fillAll !== false)
    })
  },

  setFillAll: function (v) {
    this.fillAll = !!v
    if (this.faEl) this.faEl.classList.toggle("on", this.fillAll)
    chrome.storage.sync.set({ fillAll: this.fillAll })
  },

  open: function (rect, lang, onPick, targetEl) {
    if (this.host) this.close()
    this.onPick = onPick
    this.lang = lang
    this.fillTarget = targetEl || null

    var host = document.createElement("div")
    host.id = "dict-search-host"
    var root = host.attachShadow({ mode: "open" })
    root.innerHTML =
      '<style>' +
      ":host{all:initial;position:fixed;z-index:2147483647;width:340px;max-height:380px;display:flex;flex-direction:column;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}" +
      ".pop{display:flex;flex-direction:column;background:#fff;border:1px solid #d1d5db;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.18);color:#111;overflow:hidden;font-size:13px;}" +
      ".head{padding:8px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px;}" +
      ".head .tag{font-size:11px;font-weight:700;background:#111827;color:#fff;border-radius:4px;padding:2px 6px;}" +
      ".fa{margin-left:2px;border:1px solid #e5e7eb;border-radius:6px;padding:3px 6px;font-size:10px;font-weight:700;cursor:pointer;user-select:none;color:#9ca3af;letter-spacing:1px;background:#fff;}" +
      ".fa.on{color:#111827;border-color:#111827;}" +
      "input{flex:1;border:0;outline:0;font-size:13px;padding:4px;background:transparent;color:#111;}" +
      ".list{overflow-y:auto;max-height:300px;padding:4px;}" +
      ".row{padding:7px 9px;border-radius:7px;cursor:pointer;line-height:1.35;}" +
      ".row:hover,.row.active{background:#eef2ff;}" +
      ".row .bi{font-size:12px;}" +
      ".lang{color:#4b5563;}" +
      ".lang b{color:#2563eb;}" +
      ".cat{display:inline-block;font-size:10px;color:#6b7280;border:1px solid #e5e7eb;border-radius:99px;padding:0 6px;margin-top:2px;}" +
      ".empty{padding:14px;color:#6b7280;text-align:center;}" +
      "</style>" +
      '<div class="pop" part="pop">' +
      '<div class="head"><span class="tag"></span><input placeholder="Cari label / terjemahan…" /><span class="fa" title="Isi semua bahasa sekaligus">EN ID KR</span></div>' +
      '<div class="list"></div>' +
      "</div>"

    document.body.appendChild(host)
    this.host = host
    this.rootEl = host.shadowRoot
    this.inputEl = this.rootEl.querySelector("input")
    this.listEl = this.rootEl.querySelector(".list")
    this.rootEl.querySelector(".tag").textContent = lang.toUpperCase()
    this.faEl = this.rootEl.querySelector(".fa")
    var self = this
    this.faEl.addEventListener("click", function (e) {
      e.stopPropagation()
      self.setFillAll(!self.fillAll)
    })
    this.syncFillAll()

    var w = 340
    var left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8))
    var top = rect.bottom + 6
    if (top + 380 > window.innerHeight) top = Math.max(8, rect.top - 380 - 6)
    host.style.left = left + "px"
    host.style.top = top + "px"

    // Isi hasil awal = semua term, langsung filter sesuai teks "langsung mencari"
    this.inputEl.addEventListener("input", this.onInputChange.bind(this))
    this.inputEl.addEventListener("keydown", this.onKeyDown.bind(this))
    this.inputEl.focus()

    document.addEventListener("pointerdown", this.outsideHandler, true)
    return this
  },

  setTerms: function (terms) {
    this.allTerms = terms
  },

  refresh: function () {
    var results = filterTerms(this.inputEl.value, this.allTerms || [])
    this.results = results
    this.activeIndex = 0
    this.render()
  },

  onInputChange: function () {
    this.refresh()
  },

  onKeyDown: function (e) {
    if (e.key === "Escape") {
      e.preventDefault()
      this.close()
      return
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault()
      var n = this.results.length
      if (!n) return
      var dir = e.key === "ArrowDown" ? 1 : -1
      this.activeIndex = (this.activeIndex + dir + n) % n
      this.highlight()
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      var item = this.results[this.activeIndex]
      if (item) this.pick(item)
    }
  },

  render: function () {
    this.listEl.textContent = ""
    if (!this.results.length) {
      var empty = document.createElement("div")
      empty.className = "empty"
      empty.textContent = this.supabaseConfigured
        ? this.termsLoaded
          ? "Tidak ada hasil"
          : "Kamus belum dimuat — klik ikon toolbar > Berikan Akses."
        : "Supabase belum dikonfigurasi — isi URL & anon key di Options."
      this.listEl.appendChild(empty)
      return
    }
    var titleToLang = { en: "EN", id: "ID", kr: "KR" }
    var keys = ["en", "id", "kr"]
    var self = this
    for (var i = 0; i < this.results.length; i++) {
      var t = this.results[i]
      var row = document.createElement("div")
      row.className = "row"

      var bi = document.createElement("div")
      bi.className = "bi"
      for (var j = 0; j < keys.length; j++) {
        var val = t["term" + keys[j].toUpperCase()]
        if (!val) continue
        var lang = document.createElement("span")
        lang.className = "lang"
        var tag = document.createElement("b")
        tag.textContent = titleToLang[keys[j]] + " "
        lang.appendChild(tag)
        lang.appendChild(document.createTextNode(val))
        bi.appendChild(lang)
        bi.appendChild(document.createElement("br"))
      }

      var cat = document.createElement("span")
      cat.className = "cat"
      cat.textContent = t.category || ""

      row.appendChild(bi)
      row.appendChild(cat)
      ;(function (item) {
        row.addEventListener("click", function () { self.pick(item) })
      })(t)
      this.listEl.appendChild(row)
    }
    this.highlight()
  },

  highlight: function () {
    var rows = this.listEl.querySelectorAll(".row")
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.toggle("active", i === this.activeIndex)
      if (i === this.activeIndex) rows[i].scrollIntoView({ block: "nearest" })
    }
  },

  pick: function (item) {
    this.close()
    if (this.onPick) this.onPick(this.lang, item, this.fillTarget)
  },

  outsideHandler: function (e) {
    var h = DictSearchPopover.host
    if (h && e.composedPath().indexOf(h) === -1) DictSearchPopover.close()
  },

  close: function () {
    if (!this.host) return
    document.removeEventListener("pointerdown", this.outsideHandler, true)
    this.host.remove()
    this.host = null
    this.rootEl = null
    this.inputEl = null
    this.listEl = null
  },
}
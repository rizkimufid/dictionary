"use strict"

var DictSearchPopover = {
  host: null,
  rootEl: null,
  listEl: null,
  inputEl: null,
  spinnerEl: null,
  loadMoreEl: null,
  faEl: null,
  rrEl: null,
  onPick: null,
  results: [],
  activeIndex: 0,
  supabaseConfigured: false,
  termsLoaded: false,
  fillAll: true,
  allTerms: [],
  cfg: null,
  query: "",
  offset: 0,
  pageSize: 30,
  hasMore: false,
  loading: false,
  loadingMore: false,
  abortController: null,
  debounceTimer: null,
  fillTarget: null,
  lang: "",

  setCfg: function (cfg) {
    this.cfg = cfg || null
    this.setSupabaseConfigured(!!(cfg && cfg.supabaseUrl && cfg.supabaseAnonKey))
  },

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
    this.results = []
    this.activeIndex = 0
    this.query = ""
    this.offset = 0
    this.hasMore = false
    this.loading = false
    this.loadingMore = false

    var host = document.createElement("div")
    host.id = "dict-search-host"
    var root = host.attachShadow({ mode: "open" })
    root.innerHTML =
      "<style>" +
      ":host{all:initial;position:fixed;z-index:2147483647;width:340px;max-height:380px;display:flex;flex-direction:column;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;}" +
      ".pop{display:flex;flex-direction:column;background:#fff;border:1px solid #d1d5db;border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.18);color:#111;overflow:hidden;font-size:13px;max-height:380px;}" +
      ".head{padding:8px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px;}" +
      ".head .tag{font-size:11px;font-weight:700;background:#111827;color:#fff;border-radius:4px;padding:2px 6px;flex-shrink:0;}" +
      ".fa{margin-left:2px;border:1px solid #e5e7eb;border-radius:6px;padding:3px 6px;font-size:10px;font-weight:700;cursor:pointer;user-select:none;color:#9ca3af;letter-spacing:1px;background:#fff;flex-shrink:0;}" +
      ".fa.on{color:#111827;border-color:#111827;}" +
      ".rr{border:1px solid #e5e7eb;border-radius:6px;padding:3px 6px;font-size:12px;cursor:pointer;user-select:none;color:#9ca3af;background:#fff;line-height:1;flex-shrink:0;}" +
      ".rr:hover{color:#111827;border-color:#111827;}" +
      ".rr.busy{opacity:.4;cursor:default;}" +
      "input{flex:1;border:0;outline:0;font-size:13px;padding:4px;background:transparent;color:#111;min-width:0;}" +
      ".spinner{width:12px;height:12px;border:2px solid #e5e7eb;border-top-color:#2563eb;border-radius:50%;animation:dict-spin .6s linear infinite;display:inline-block;flex-shrink:0;}" +
      "@keyframes dict-spin{to{transform:rotate(360deg);}}" +
      ".hidden{display:none !important;}" +
      ".list{overflow-y:auto;max-height:300px;padding:4px;}" +
      ".row{padding:7px 9px;border-radius:7px;cursor:pointer;line-height:1.35;}" +
      ".row:hover,.row.active{background:#eef2ff;}" +
      ".row .bi{font-size:12px;}" +
      ".lang{color:#4b5563;}" +
      ".lang b{color:#2563eb;}" +
      ".cat{display:inline-block;font-size:10px;color:#6b7280;border:1px solid #e5e7eb;border-radius:99px;padding:0 6px;margin-top:2px;}" +
      ".empty{padding:14px;color:#6b7280;text-align:center;}" +
      ".load-more{padding:8px;text-align:center;font-size:11px;color:#6b7280;display:flex;align-items:center;justify-content:center;gap:6px;}" +
      "</style>" +
      '<div class="pop" part="pop">' +
      '<div class="head">' +
      '<span class="tag"></span>' +
      '<input placeholder="Cari label / terjemahan…" />' +
      '<span class="spinner hidden" title="Mencari…"></span>' +
      '<button class="rr" title="Muat ulang kamus">↻</button>' +
      '<span class="fa" title="Isi semua bahasa sekaligus">EN ID KR</span>' +
      "</div>" +
      '<div class="list"></div>' +
      "</div>"

    document.body.appendChild(host)
    this.host = host
    this.rootEl = host.shadowRoot
    this.inputEl = this.rootEl.querySelector("input")
    this.listEl = this.rootEl.querySelector(".list")
    this.spinnerEl = this.rootEl.querySelector(".spinner")
    this.rootEl.querySelector(".tag").textContent = lang.toUpperCase()
    this.faEl = this.rootEl.querySelector(".fa")
    this.rrEl = this.rootEl.querySelector(".rr")

    var self = this
    this.faEl.addEventListener("click", function (e) {
      e.stopPropagation()
      self.setFillAll(!self.fillAll)
    })
    this.rrEl.addEventListener("click", function (e) {
      e.stopPropagation()
      if (self.refreshing) return
      self.refreshTerms()
    })
    this.syncFillAll()

    var w = 340
    var left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8))
    var top = rect.bottom + 6
    if (top + 380 > window.innerHeight) top = Math.max(8, rect.top - 380 - 6)
    host.style.left = left + "px"
    host.style.top = top + "px"

    this.onInputChangeBound = this.onInputChange.bind(this)
    this.onKeyDownBound = this.onKeyDown.bind(this)
    this.onScrollBound = this.onScroll.bind(this)

    this.inputEl.addEventListener("input", this.onInputChangeBound)
    this.inputEl.addEventListener("keydown", this.onKeyDownBound)
    this.listEl.addEventListener("scroll", this.onScrollBound)
    this.inputEl.focus()

    document.addEventListener("pointerdown", this.outsideHandler, true)

    // Load initial list
    if (!this.cfg) {
      chrome.storage.sync.get({ supabaseUrl: "", supabaseAnonKey: "" }).then(function (stored) {
        self.setCfg(stored)
        self.initInitialResults()
      })
    } else {
      this.initInitialResults()
    }

    return this
  },

  initInitialResults: function () {
    // Tampilkan data lokal segera jika ada agar respon instan
    if (this.allTerms && this.allTerms.length > 0) {
      this.results = this.allTerms.slice(0, this.pageSize)
      this.render()
    }
    // Lalu jalankan query server untuk data termutakhir dan pagination
    this.performSearch("", true)
  },

  setTerms: function (terms) {
    this.allTerms = terms || []
    if (this.host && !this.results.length && this.allTerms.length) {
      this.results = this.allTerms.slice(0, this.pageSize)
      this.render()
    }
  },

  refresh: function () {
    var q = this.inputEl ? this.inputEl.value.trim() : ""
    this.performSearch(q, false)
  },

  onInputChange: function () {
    var self = this
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    var q = this.inputEl ? this.inputEl.value.trim() : ""
    this.debounceTimer = setTimeout(function () {
      self.performSearch(q, false)
    }, 250)
  },

  onScroll: function () {
    if (this.loading || this.loadingMore || !this.hasMore) return
    var el = this.listEl
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      this.loadMore()
    }
  },

  performSearch: function (query, isInitial) {
    var q = String(query || "").trim()
    this.query = q
    this.offset = 0
    this.hasMore = false
    this.loading = true

    if (this.abortController) {
      try {
        this.abortController.abort()
      } catch (e) {}
      this.abortController = null
    }

    if (this.spinnerEl) this.spinnerEl.classList.remove("hidden")

    var self = this
    if (!this.cfg || !this.cfg.supabaseUrl || !this.cfg.supabaseAnonKey) {
      this.loading = false
      if (this.spinnerEl) this.spinnerEl.classList.add("hidden")
      if (typeof filterTerms === "function") {
        this.results = filterTerms(q, this.allTerms || [])
      } else {
        this.results = []
      }
      this.hasMore = false
      this.activeIndex = 0
      this.render()
      return
    }

    var controller = new AbortController()
    this.abortController = controller

    searchSupabaseTerms(this.cfg, {
      query: q,
      limit: this.pageSize,
      offset: 0,
      signal: controller.signal,
    })
      .then(function (res) {
        if (self.abortController !== controller) return
        self.loading = false
        if (self.spinnerEl) self.spinnerEl.classList.add("hidden")
        self.results = res.terms || []
        self.offset = (res.terms || []).length
        self.hasMore = !!res.hasMore
        self.termsLoaded = self.termsLoaded || self.results.length > 0
        self.activeIndex = 0
        self.render()
      })
      .catch(function (err) {
        if (err && err.name === "AbortError") return
        console.warn("[Dictionary Search] query search error, fallback ke lokal:", err)
        if (self.abortController !== controller) return
        self.loading = false
        if (self.spinnerEl) self.spinnerEl.classList.add("hidden")
        if (typeof filterTerms === "function") {
          self.results = filterTerms(q, self.allTerms || [])
        } else {
          self.results = []
        }
        self.hasMore = false
        self.activeIndex = 0
        self.render()
      })
  },

  loadMore: function () {
    if (this.loading || this.loadingMore || !this.hasMore || !this.cfg) return
    this.loadingMore = true
    this.showLoadMoreIndicator(true)

    var self = this
    searchSupabaseTerms(this.cfg, {
      query: this.query,
      limit: this.pageSize,
      offset: this.offset,
    })
      .then(function (res) {
        self.loadingMore = false
        self.showLoadMoreIndicator(false)
        if (!self.host) return
        var newTerms = res.terms || []
        if (!newTerms.length) {
          self.hasMore = false
          return
        }
        var startIndex = self.results.length
        self.results = self.results.concat(newTerms)
        self.offset += newTerms.length
        self.hasMore = !!res.hasMore
        self.appendRows(newTerms, startIndex)
      })
      .catch(function (err) {
        self.loadingMore = false
        self.showLoadMoreIndicator(false)
        console.warn("[Dictionary Search] loadMore error:", err)
      })
  },

  showLoadMoreIndicator: function (show) {
    if (!this.loadMoreEl && this.listEl) {
      var lm = document.createElement("div")
      lm.className = "load-more"
      lm.innerHTML = '<span class="spinner"></span> <span>Memuat lebih banyak…</span>'
      this.listEl.appendChild(lm)
      this.loadMoreEl = lm
    }
    if (this.loadMoreEl) {
      this.loadMoreEl.style.display = show ? "flex" : "none"
      if (show && this.listEl) {
        this.listEl.appendChild(this.loadMoreEl)
      }
    }
  },

  refreshTerms: function () {
    var self = this
    if (!this.supabaseConfigured) {
      Toast.show("Supabase belum dikonfigurasi — isi di Pengaturan dulu")
      return
    }
    this.refreshing = true
    if (this.rrEl) this.rrEl.classList.add("busy")
    chrome.storage.sync
      .get({ supabaseUrl: "", supabaseAnonKey: "" })
      .then(function (cfg) {
        self.setCfg(cfg)
        return Promise.all([
          countSupabaseTerms(cfg),
          fetchRecentTerms(cfg, 30),
        ])
      })
      .then(function (res) {
        var total = res[0]
        var recent = res[1]
        self.allTerms = recent
        window.dictTerms = recent
        void cacheTerms(recent).catch(function () {})
        self.termsLoaded = true
        self.performSearch(self.inputEl ? self.inputEl.value.trim() : "", false)
        Toast.show("Kamus diperbarui: " + total + " term")
      })
      .catch(function (e) {
        Toast.show("Gagal muat kamus: " + (e && e.message ? e.message : e))
      })
      .finally(function () {
        self.refreshing = false
        if (self.rrEl) self.rrEl.classList.remove("busy")
      })
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
      if (dir === 1 && this.activeIndex >= n - 3 && this.hasMore) {
        this.loadMore()
      }
      return
    }
    if (e.key === "Enter") {
      e.preventDefault()
      var item = this.results[this.activeIndex]
      if (item) this.pick(item)
    }
  },

  createRowEl: function (t) {
    var titleToLang = { en: "EN", id: "ID", kr: "KR" }
    var keys = ["en", "id", "kr"]
    var self = this

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

    row.addEventListener("click", function () {
      self.pick(t)
    })

    return row
  },

  appendRows: function (terms) {
    if (!this.listEl) return
    for (var i = 0; i < terms.length; i++) {
      var rowEl = this.createRowEl(terms[i])
      if (this.loadMoreEl && this.loadMoreEl.parentElement === this.listEl) {
        this.listEl.insertBefore(rowEl, this.loadMoreEl)
      } else {
        this.listEl.appendChild(rowEl)
      }
    }
    this.highlight()
  },

  render: function () {
    if (!this.listEl) return
    this.listEl.textContent = ""
    this.loadMoreEl = null

    if (!this.results.length) {
      var empty = document.createElement("div")
      empty.className = "empty"
      if (this.loading) {
        empty.textContent = "Mencari data…"
      } else if (!this.supabaseConfigured) {
        empty.textContent = "Supabase belum dikonfigurasi — isi URL & anon key di Pengaturan."
      } else if (!this.termsLoaded && !this.allTerms.length) {
        empty.textContent = "Kamus belum dimuat — klik ikon toolbar > Berikan Akses."
      } else {
        empty.textContent = "Tidak ada hasil"
      }
      this.listEl.appendChild(empty)
      return
    }

    for (var i = 0; i < this.results.length; i++) {
      this.listEl.appendChild(this.createRowEl(this.results[i]))
    }

    this.showLoadMoreIndicator(this.loadingMore)
    this.highlight()
  },

  highlight: function () {
    if (!this.listEl) return
    var rows = this.listEl.querySelectorAll(".row")
    for (var i = 0; i < rows.length; i++) {
      rows[i].classList.toggle("active", i === this.activeIndex)
      if (i === this.activeIndex) {
        rows[i].scrollIntoView({ block: "nearest" })
      }
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
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (this.abortController) {
      try {
        this.abortController.abort()
      } catch (e) {}
      this.abortController = null
    }
    document.removeEventListener("pointerdown", this.outsideHandler, true)
    this.host.remove()
    this.host = null
    this.rootEl = null
    this.inputEl = null
    this.listEl = null
    this.spinnerEl = null
    this.loadMoreEl = null
  },
}

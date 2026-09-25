"use strict"

const DEFAULTS = { domains: [], supabaseUrl: "", supabaseAnonKey: "" }

const domainsEl = document.getElementById("domains")
const urlEl = document.getElementById("supabaseUrl")
const keyEl = document.getElementById("supabaseAnonKey")
const saveBtn = document.getElementById("saveBtn")
const statusEl = document.getElementById("status")
const grantsEl = document.getElementById("grants")

async function loadSettings() {
  const v = await chrome.storage.sync.get(DEFAULTS)
  domainsEl.value = (v.domains || []).join("\n")
  urlEl.value = v.supabaseUrl
  keyEl.value = v.supabaseAnonKey
  await refreshGrants(v.domains, v.supabaseUrl)
}

async function refreshGrants(domains, supabaseUrl) {
  const origins = []
  for (const d of domains || []) origins.push(...domainPatterns(d))
  const so = originPattern(supabaseUrl)
  if (so) origins.push(so)
  const all = await chrome.permissions.getAll()
  const grantedList = all.origins || []

  grantsEl.replaceChildren()
  if (!origins.length) {
    const hint = document.createElement("span")
    hint.className = "hint"
    hint.textContent = "Belum ada domain. Simpan untuk meminta akses."
    grantsEl.appendChild(hint)
    return
  }
  const ul = document.createElement("ul")
  for (const o of origins) {
    const granted = grantedList.indexOf(o) !== -1
    const li = document.createElement("li")
    li.className = granted ? "ok" : "no"
    li.textContent = o + (granted ? " ✓" : " — belum disetujui")
    ul.appendChild(li)
  }
  grantsEl.appendChild(ul)
}

function parseDomainsFromInput() {
  return domainsEl.value
    .split("\n")
    .map(cleanDomain)
    .filter(Boolean)
}

async function save() {
  const domains = parseDomainsFromInput()
  const supabaseUrl = urlEl.value.trim()
  const supabaseAnonKey = keyEl.value.trim()

  const origins = dictOrigins(domains, supabaseUrl)
  const so = originPattern(supabaseUrl)
  const contentMatches = origins.filter((o) => o !== so)

  let grantError = null
  let granted = false
  if (contentMatches.length) {
    try {
      const r = await chrome.permissions.request({ origins })
      granted = r === true
    } catch (e) {
      grantError = e
      console.error("[Dictionary Search] gagal minta izin:", e)
    }
  }

  await chrome.storage.sync.set({ domains, supabaseUrl, supabaseAnonKey })

  let registered = false
  let registerError = null
  if (granted) {
    const reg = await registerDictScripts(domains, supabaseUrl)
    console.log("[Dictionary Search] hasil registrasi:", reg)
    registered = reg.ok
    if (!reg.ok && reg.reason !== "no-domains") registerError = reg.error || reg.reason
  }

  await refreshGrants(domains, supabaseUrl)

  if (supabaseUrl && supabaseAnonKey) {
    fetchSupabaseTerms({ supabaseUrl, supabaseAnonKey })
      .then(cacheTerms)
      .then(() => console.log("[Dictionary Search] kamus dikache:", domains.length))
      .catch((e) => console.error("[Dictionary Search] gagal preload kamus:", e))
  }

  if (grantError && grantError.message) {
    statusEl.textContent = "Permintaan izin gagal: " + grantError.message
  } else if (registerError && registerError.message) {
    statusEl.textContent = "Gagal registrasi: " + registerError.message
  } else if (!domains.length) {
    statusEl.textContent = "Domain kosong — extension tidak aktif di mana pun."
  } else if (!registered) {
    statusEl.textContent = "Izin tidak disetujui — extension tidak jalan di domain tsb."
  } else {
    statusEl.textContent = "Tersimpan & terdaftar. Reload halaman situs target."
  }
  statusEl.classList.remove("hidden")
}

saveBtn.addEventListener("click", save)

loadSettings()
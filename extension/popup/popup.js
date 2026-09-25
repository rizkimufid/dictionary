"use strict"

let state = { domains: [], supabaseUrl: "", granted: [], fillAll: true }

async function loadState() {
  const v = await chrome.storage.sync.get({ domains: [], supabaseUrl: "", fillAll: true })
  const all = await chrome.permissions.getAll()
  state = {
    domains: v.domains || [],
    supabaseUrl: v.supabaseUrl || "",
    granted: all.origins || [],
    fillAll: v.fillAll !== false,
  }
}

async function refreshTermsCache() {
  const cacheEl = document.getElementById("cached")
  if (!state.supabaseUrl) {
    cacheEl.textContent = ""
    return 0
  }
  const anonKey = (await chrome.storage.sync.get({ supabaseAnonKey: "" })).supabaseAnonKey
  if (!anonKey) {
    cacheEl.textContent = "Kamus: anon key belum diset (untuk versi dev)."
    return 0
  }
  cacheEl.textContent = "Memuat kamus…"
  try {
    const terms = await fetchSupabaseTerms({ supabaseUrl: state.supabaseUrl, supabaseAnonKey: anonKey })
    await cacheTerms(terms)
    cacheEl.textContent = "Kamus: " + terms.length + " term"
    return terms.length
  } catch (e) {
    console.error("[Dictionary Search] popup gagal memuat kamus:", e)
    cacheEl.textContent = "Kamus: gagal dimuat (" + e.message + ")"
    return 0
  }
}

async function forceRefresh() {
  const btn = document.getElementById("refreshBtn")
  btn.disabled = true
  try {
    await refreshTermsCache()
  } finally {
    btn.disabled = false
  }
}

async function loadAndRender() {
  await loadState()
  render()
  refreshTermsCache()
}

function render() {
  const dot = document.getElementById("dot")
  const domainsEl = document.getElementById("domains")
  const grantBtn = document.getElementById("grantBtn")
  const origins = dictOrigins(state.domains, state.supabaseUrl)

  if (!state.domains.length) {
    dot.className = "dot off"
    domainsEl.textContent = "Belum ada domain aktif."
    grantBtn.disabled = true
    grantBtn.textContent = "Belum ada domain"
  } else {
    dot.className = "dot on"
    const ul = document.createElement("ul")
    for (const d of state.domains) {
      const patterns = domainPatterns(d)
      const ok = patterns.some((p) => state.granted.indexOf(p) !== -1)
      const li = document.createElement("li")
      li.textContent = d + (ok ? " ✓" : " — tanpa akses")
      ul.appendChild(li)
    }
    domainsEl.replaceChildren(ul)

    const allGranted = origins.every((o) => state.granted.indexOf(o) !== -1)
    grantBtn.disabled = allGranted
    grantBtn.textContent = allGranted ? "Sudah diberi akses" : "Berikan Akses Domain"
  }

  document.getElementById("supabase").textContent = state.supabaseUrl
    ? "Supabase: terkonfigurasi"
    : "Supabase: belum dikonfigurasi"
  document.getElementById("fillAllSwitch").checked = state.fillAll
}

document.getElementById("fillAllSwitch").addEventListener("change", (e) => {
  state.fillAll = e.target.checked
  chrome.storage.sync.set({ fillAll: state.fillAll })
})

async function grantAccess() {
  const statusEl = document.getElementById("grantStatus")
  statusEl.textContent = "Meminta izin…"
  const origins = dictOrigins(state.domains, state.supabaseUrl)
  let granted = false
  let thrown = null
  try {
    const r = await chrome.permissions.request({ origins })
    granted = r === true
  } catch (e) {
    thrown = e
    console.error("[Dictionary Search] gagal minta izin dari popup:", e)
  }
  if (granted) {
    const res = await registerDictScripts(state.domains, state.supabaseUrl)
    console.log("[Dictionary Search] hasil registrasi:", res)
  }
  await loadState()
  render()
  refreshTermsCache()
  if (thrown && thrown.message) {
    statusEl.textContent = "Error: " + thrown.message + " — coba via Pengaturan → Simpan."
  } else if (granted) {
    statusEl.textContent = "Akses diberikan. Reload halaman situs target."
  } else {
    statusEl.textContent =
      "Ditolak / tanpa prompt. Klik Pengaturan → Simpan lalu izinkan, atau nyalakan izin di halaman detail add-on." 
  }
}

document.getElementById("grantBtn").addEventListener("click", grantAccess)
document.getElementById("refreshBtn").addEventListener("click", forceRefresh)
document
  .getElementById("openOptions")
  .addEventListener("click", () => chrome.runtime.openOptionsPage())

loadAndRender()
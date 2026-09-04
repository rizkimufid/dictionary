import type { CopyFormat, TermCategory, TermEntry, AppLocale } from "@/types"

const PREFIX: Record<TermCategory, string> = {
  field: "label",
  placeholder: "placeholder",
  action: "label",
  title: "title",
  "table-header": "label",
}

const LANG_SUFFIX: Record<AppLocale, string> = {
  id: "ID",
  en: "EN",
  kr: "KR",
}

function keyName(entry: TermEntry, lang: AppLocale): string {
  return `${PREFIX[entry.category]}${LANG_SUFFIX[lang]}`
}

function valueOf(entry: TermEntry, lang: AppLocale): string {
  if (lang === "id") return entry.termID
  if (lang === "en") return entry.termEN
  return entry.termKR
}

function quote(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`
}

function pair(entry: TermEntry, lang: AppLocale): string {
  return `${keyName(entry, lang)}:${quote(valueOf(entry, lang))}`
}

/** Output lengkap 3 bahasa */
export function fullCopy(entry: TermEntry, format: CopyFormat): string {
  if (format === "text") {
    return [entry.termID, entry.termEN, entry.termKR].filter(Boolean).join(", ")
  }
  const pairs = (["id", "en", "kr"] as AppLocale[]).map((l) => pair(entry, l)).join(", ")
  return format === "json" ? `{ ${pairs} }` : pairs
}

/** Output satu bahasa */
export function singleCopy(entry: TermEntry, lang: AppLocale, format: CopyFormat): string {
  if (format === "text") return valueOf(entry, lang)
  const p = pair(entry, lang)
  return format === "json" ? `{ ${p} }` : p
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement("textarea")
    ta.value = text
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    document.execCommand("copy")
    document.body.removeChild(ta)
  }
}

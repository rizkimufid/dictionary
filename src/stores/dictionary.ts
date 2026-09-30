import { ref, computed } from "vue"
import { defineStore } from "pinia"
import { supabase } from "@/lib/supabase"
import type { TermCategory, TermEntry, TermInput } from "@/types"

export type TermWriteErrorCode = "empty" | "duplicate" | "database"

export type TermWriteResult =
  | { ok: true }
  | { ok: false; code: TermWriteErrorCode; reason: string }

export interface BatchImportItem {
  rowNumber: number
  input: TermInput
}

export interface BatchImportFailure {
  rowNumber: number
  reason: string
}

export interface BatchImportResult {
  inserted: number
  skipped: number
  failed: BatchImportFailure[]
}

export const useDictionaryStore = defineStore("dictionary", () => {
  const terms = ref<TermEntry[]>([])
  const loading = ref(false)

  const categoryCount = computed<Record<TermCategory, number>>(() => {
    const counts: Record<TermCategory, number> = {
      field: 0,
      placeholder: 0,
      action: 0,
      title: 0,
      "table-header": 0,
    }
    for (const t of terms.value) counts[t.category]++
    return counts
  })

  async function fetchTerms(): Promise<{ ok: true } | { ok: false; reason: string }> {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from("terms")
        .select("*")
        .order("created_at", { ascending: false })
      if (error) return { ok: false, reason: error.message }
      if (data) {
        terms.value = data.map((row) => ({
          id: row.id,
          termID: row.term_id,
          termEN: row.term_en,
          termKR: row.term_kr,
          category: row.category as TermCategory,
          description: row.description || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }))
      }
      return { ok: true }
    } finally {
      loading.value = false
    }
  }

  async function addTerm(input: TermInput): Promise<TermWriteResult> {
    if (!input.termID.trim() && !input.termEN.trim() && !input.termKR.trim()) {
      return { ok: false, code: "empty", reason: "Setidaknya satu bahasa wajib diisi" }
    }
    const { error } = await supabase.from("terms").insert({
      term_id: input.termID.trim(),
      term_en: input.termEN.trim(),
      term_kr: input.termKR.trim(),
      category: input.category,
      description: input.description?.trim() || null,
    })
    if (error) {
      if (error.code === "23505") {
        return { ok: false, code: "duplicate", reason: "TermID (Indonesia) sudah ada untuk kategori ini" }
      }
      return { ok: false, code: "database", reason: error.message }
    }
    await fetchTerms()
    return { ok: true }
  }

  async function updateTerm(id: string, input: TermInput): Promise<TermWriteResult> {
    if (!input.termID.trim() && !input.termEN.trim() && !input.termKR.trim()) {
      return { ok: false, code: "empty", reason: "Setidaknya satu bahasa wajib diisi" }
    }
    const { error } = await supabase
      .from("terms")
      .update({
        term_id: input.termID.trim(),
        term_en: input.termEN.trim(),
        term_kr: input.termKR.trim(),
        category: input.category,
        description: input.description?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
    if (error) {
      if (error.code === "23505") {
        return { ok: false, code: "duplicate", reason: "TermID (Indonesia) sudah ada untuk kategori ini" }
      }
      return { ok: false, code: "database", reason: error.message }
    }
    await fetchTerms()
    return { ok: true }
  }

  async function importTerms(items: BatchImportItem[]): Promise<BatchImportResult> {
    const result: BatchImportResult = { inserted: 0, skipped: 0, failed: [] }
    const chunkSize = 250

    for (let offset = 0; offset < items.length; offset += chunkSize) {
      const chunk = items.slice(offset, offset + chunkSize)
      const payload = chunk.map(({ input }) => ({
        term_id: input.termID.trim(),
        term_en: input.termEN.trim(),
        term_kr: input.termKR.trim(),
        category: input.category,
        description: input.description?.trim() || null,
      }))
      const { data, error } = await supabase
        .from("terms")
        .insert(payload)
        .setHeader("Prefer", "resolution=ignore-duplicates,return=representation")
        .select("id")

      if (error) {
        result.failed.push(...chunk.map(({ rowNumber }) => ({ rowNumber, reason: error.message })))
        continue
      }

      const inserted = data?.length ?? 0
      result.inserted += inserted
      result.skipped += chunk.length - inserted
    }

    if (items.length > 0) await fetchTerms()
    return result
  }

  async function removeTerm(id: string): Promise<void> {
    await supabase.from("terms").delete().eq("id", id)
    await fetchTerms()
  }

  return { terms, loading, categoryCount, fetchTerms, addTerm, updateTerm, importTerms, removeTerm }
})

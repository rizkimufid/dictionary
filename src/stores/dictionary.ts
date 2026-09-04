import { ref, computed } from "vue"
import { defineStore } from "pinia"
import { supabase } from "@/lib/supabase"
import type { TermCategory, TermEntry } from "@/types"

export interface TermInput {
  termID: string
  termEN: string
  termKR: string
  category: TermCategory
  description?: string
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

  async function fetchTerms(): Promise<void> {
    loading.value = true
    const { data, error } = await supabase
      .from("terms")
      .select("*")
      .order("created_at", { ascending: false })
    if (!error && data) {
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
    loading.value = false
  }

  async function addTerm(input: TermInput): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!input.termID.trim() && !input.termEN.trim() && !input.termKR.trim()) {
      return { ok: false, reason: "Setidaknya satu bahasa wajib diisi" }
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
        return { ok: false, reason: "TermID (Indonesia) sudah ada untuk kategori ini" }
      }
      return { ok: false, reason: error.message }
    }
    await fetchTerms()
    return { ok: true }
  }

  async function updateTerm(id: string, input: TermInput): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!input.termID.trim() && !input.termEN.trim() && !input.termKR.trim()) {
      return { ok: false, reason: "Setidaknya satu bahasa wajib diisi" }
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
        return { ok: false, reason: "TermID (Indonesia) sudah ada untuk kategori ini" }
      }
      return { ok: false, reason: error.message }
    }
    await fetchTerms()
    return { ok: true }
  }

  async function removeTerm(id: string): Promise<void> {
    await supabase.from("terms").delete().eq("id", id)
    await fetchTerms()
  }

  return { terms, loading, categoryCount, fetchTerms, addTerm, updateTerm, removeTerm }
})

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { toast } from "vue3-toastify"

import { DCodeButton, DCodeTextField } from "@gemafajarramadhan/dynamic-ui"
import TermCard from "@/components/TermCard.vue"
import TermTable from "@/components/TermTable.vue"
import TermFormDialog from "@/components/TermFormDialog.vue"
import LoginScreen from "@/components/LoginScreen.vue"
import { useDictionaryStore } from "@/stores/dictionary"
import { supabase } from "@/lib/supabase"
import { supportLocales } from "@/i18n"
import type { AppLocale, CopyFormat, TermCategory, ViewMode } from "@/types"

const { t, locale } = useI18n()
const store = useDictionaryStore()

const authenticated = ref(false)
const search = ref("")
const categoryFilter = ref<"all" | TermCategory>("all")
const format = ref<CopyFormat>("text")
const appLocale = ref<AppLocale>("id")
const viewMode = ref<ViewMode>("table")

watch(appLocale, (v) => {
  locale.value = v
})

const dialogOpen = ref(false)
const editingId = ref<string | null>(null)

onMounted(async () => {
  const { data } = await supabase.auth.getSession()
  if (data.session) {
    authenticated.value = true
    await store.fetchTerms()
  }

  document.addEventListener("keydown", handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault()
    nextTick(() => {
      const el = document.querySelector<HTMLInputElement>("[data-search-input]")
      el?.focus()
      el?.select()
    })
  }
}

async function onAuthenticated() {
  authenticated.value = true
  await store.fetchTerms()
}

async function logout() {
  await supabase.auth.signOut()
  authenticated.value = false
  store.terms = []
}

const filtered = computed(() => {
  const q = (search.value ?? "").trim().toLowerCase()
  return store.terms.filter((term) => {
    if (categoryFilter.value !== "all" && term.category !== categoryFilter.value) return false
    if (!q) return true
    return [term.termID, term.termEN, term.termKR, term.description ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(q)
  })
})

function openAdd() {
  editingId.value = null
  dialogOpen.value = true
}

function openEdit(id: string) {
  editingId.value = id
  dialogOpen.value = true
}

function onDelete(id: string) {
  if (window.confirm(t("confirmDelete"))) {
    store.removeTerm(id)
    toast.success(t("deletedMessage"))
  }
}
</script>

<template>
  <LoginScreen v-if="!authenticated" @authenticated="onAuthenticated" />

  <div v-else class="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">{{ t("appTitle") }}</h1>
        <p class="text-sm text-muted-foreground">{{ t("appSubtitle") }}</p>
      </div>
      <div class="flex items-center gap-2">
        <select
          v-model="appLocale"
          class="h-9 rounded-lg border bg-white px-2 text-sm dark:bg-neutral-800"
        >
          <option v-for="loc in supportLocales" :key="loc" :value="loc">{{ loc.toUpperCase() }}</option>
        </select>
        <DCodeButton
          variant="destructive"
          size="sm"
          :text="t('logoutButton')"
          icon="LogOut"
          @click="logout"
        />
      </div>
    </header>

    <div class="flex flex-col gap-3">
      <DCodeTextField
        v-model="search"
        :placeholder="t('searchPlaceholder')"
        data-search-input
      />

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap items-center gap-3">
          <select
            v-model="categoryFilter"
            class="h-9 rounded-lg border bg-white px-2 text-sm dark:bg-neutral-800"
          >
            <option value="all">{{ t("filterAll") }}</option>
            <option value="field">{{ t("categoryField") }}</option>
            <option value="placeholder">{{ t("categoryPlaceholder") }}</option>
            <option value="action">{{ t("categoryAction") }}</option>
            <option value="title">{{ t("categoryTitle") }}</option>
            <option value="table-header">{{ t("categoryTableHeader") }}</option>
          </select>

          <div class="flex overflow-hidden rounded-lg border">
            <button
              v-for="f in (['text', 'code', 'json'] as CopyFormat[])"
              :key="f"
              class="px-3 py-1.5 text-xs font-medium transition-colors"
              :class="format === f ? 'bg-primary text-white' : 'bg-white text-muted-foreground hover:bg-muted/50 dark:bg-neutral-800'"
              @click="format = f"
            >
              {{ f === 'text' ? t('formatText') : f === 'code' ? t('formatCode') : t('formatJson') }}
            </button>
          </div>

          <div class="flex overflow-hidden rounded-lg border">
            <button
              v-for="m in (['table', 'card'] as ViewMode[])"
              :key="m"
              class="px-3 py-1.5 text-xs font-medium transition-colors"
              :class="viewMode === m ? 'bg-primary text-white' : 'bg-white text-muted-foreground hover:bg-muted/50 dark:bg-neutral-800'"
              @click="viewMode = m"
            >
              {{ m === 'table' ? t('viewModeTable') : t('viewModeCard') }}
            </button>
          </div>
        </div>

        <DCodeButton :text="t('addTerm')" icon="Plus" bg-color="primary" size="sm" @click="openAdd" />
      </div>
    </div>

    <p class="text-xs text-muted-foreground">
      {{ t("count_" + Math.min(filtered.length, 1), [filtered.length]) }}
    </p>

    <div class="flex flex-col gap-3">
      <p v-if="filtered.length === 0" class="py-10 text-center text-sm text-muted-foreground">
        {{ t("count_0") }}
      </p>
      <template v-if="viewMode === 'card'">
        <TermCard
          v-for="entry in filtered"
          :key="entry.id"
          :entry="entry"
          :format="format"
          @edit="openEdit"
          @delete="onDelete"
        />
      </template>
      <TermTable
        v-else
        :entries="filtered"
        :format="format"
        @edit="openEdit"
        @delete="onDelete"
      />
    </div>

    <TermFormDialog v-model:open="dialogOpen" :editing-id="editingId" />
  </div>
</template>

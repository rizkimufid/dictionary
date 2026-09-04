<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { toast } from "vue3-toastify"

import { Copy, Pencil, Trash2 } from "lucide-vue-next"
import { DCodeBadge, DCodeButton } from "@gemafajarramadhan/dynamic-ui"
import { fullCopy, singleCopy, copyText } from "@/utils/copy"
import type { AppLocale, CopyFormat, TermCategory, TermEntry } from "@/types"

const props = defineProps<{
  entry: TermEntry
  format: CopyFormat
  authenticated?: boolean
}>()

const emit = defineEmits<{
  (e: "edit", id: string): void
  (e: "delete", id: string): void
}>()

const { t } = useI18n()

const categoryLabel = computed(() => {
  const map: Record<TermCategory, string> = {
    field: t("categoryField"),
    placeholder: t("categoryPlaceholder"),
    action: t("categoryAction"),
    title: t("categoryTitle"),
    "table-header": t("categoryTableHeader"),
  }
  return map[props.entry.category]
})

const badgeColor = computed(() => {
  const map: Record<TermCategory, "primary" | "secondary" | "warning" | "info" | "success"> = {
    field: "primary",
    placeholder: "secondary",
    action: "warning",
    title: "info",
    "table-header": "success",
  }
  return map[props.entry.category]
})

async function copyFull() {
  const text = fullCopy(props.entry, props.format)
  if (!text.replace(/[{},":]/g, "").trim()) return toast.error(t("copyEmpty"))
  await copyText(text)
  toast.success(t("copiedMessage"))
}

async function copySingle(lang: AppLocale) {
  const text = singleCopy(props.entry, lang, props.format)
  if (!text.replace(/[{},":]/g, "").trim()) return toast.error(t("copyEmpty"))
  await copyText(text)
  toast.success(t("copiedMessage"))
}

const langRows: { lang: AppLocale; label: string; value: () => string }[] = [
  { lang: "id", label: "ID", value: () => props.entry.termID },
  { lang: "en", label: "EN", value: () => props.entry.termEN },
  { lang: "kr", label: "KR", value: () => props.entry.termKR },
]
</script>

<template>
  <div class="group/card rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
    <div class="mb-3 flex items-start justify-between gap-3">
      <div class="flex items-center gap-2">
        <DCodeBadge :text="categoryLabel" :color="badgeColor" size="xs" />
        <h3
          class="cursor-pointer font-semibold leading-none decoration-dashed underline-offset-2 hover:underline hover:decoration-muted-foreground/50"
          @click="copySingle('id')"
        >
          {{ entry.termID }}
        </h3>
      </div>
      <div v-if="authenticated" class="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover/card:opacity-100">
        <DCodeButton size="icon" variant="ghost" icon="Pencil" @click="emit('edit', entry.id)" />
        <DCodeButton size="icon" variant="ghost" icon="Trash2" bg-color="danger" @click="emit('delete', entry.id)" />
      </div>
    </div>

    <div class="space-y-1">
      <div
        v-for="row in langRows"
        :key="row.lang"
        class="group/row flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-muted/50"
      >
        <span class="w-7 shrink-0 rounded bg-muted px-1.5 py-0.5 text-center font-mono text-xs font-medium">
          {{ row.label }}
        </span>
        <span
          class="min-w-0 flex-1 cursor-pointer truncate text-sm decoration-dashed underline-offset-2 hover:underline hover:decoration-muted-foreground/50"
          @click="copySingle(row.lang)"
        >
          {{ row.value() }}
        </span>
        <button
          class="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/row:opacity-100"
          @click="copySingle(row.lang)"
        >
          <Copy class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div v-if="entry.description" class="mt-2 border-t pt-2 text-xs italic text-muted-foreground">
      {{ entry.description }}
    </div>

    <div class="mt-3 flex justify-end">
      <DCodeButton
        :text="t('copyAll')"
        variant="outline"
        size="sm"
        icon="Copy"
        @click="copyFull"
      />
    </div>
  </div>
</template>

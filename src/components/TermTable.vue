<script setup lang="ts">

import { useI18n } from "vue-i18n"
import { toast } from "vue3-toastify"

import { Copy, Pencil, Trash2 } from "lucide-vue-next"
import { DCodeBadge, DCodeButton } from "@gemafajarramadhan/dynamic-ui"
import { singleCopy, copyText } from "@/utils/copy"
import type { AppLocale, CopyFormat, TermCategory, TermEntry } from "@/types"

const props = defineProps<{
  entries: TermEntry[]
  format: CopyFormat
  authenticated?: boolean
}>()

const emit = defineEmits<{
  (e: "edit", id: string): void
  (e: "delete", id: string): void
}>()

const { t } = useI18n()

const categoryLabel = (cat: TermCategory): string => {
  const map: Record<TermCategory, string> = {
    field: t("categoryField"),
    placeholder: t("categoryPlaceholder"),
    action: t("categoryAction"),
    title: t("categoryTitle"),
    "table-header": t("categoryTableHeader"),
  }
  return map[cat]
}

const badgeColor = (cat: TermCategory): "primary" | "secondary" | "warning" | "info" | "success" => {
  const map: Record<TermCategory, "primary" | "secondary" | "warning" | "info" | "success"> = {
    field: "primary",
    placeholder: "secondary",
    action: "warning",
    title: "info",
    "table-header": "success",
  }
  return map[cat]
}

async function copyCell(entry: TermEntry, lang: AppLocale) {
  const text = singleCopy(entry, lang, props.format)
  if (!text.replace(/[{}",:]/g, "").trim()) return toast.error(t("copyEmpty"))
  await copyText(text)
  toast.success(t("copiedMessage"))
}

async function copyID(entry: TermEntry) {
  const text = singleCopy(entry, "id", props.format)
  if (!text.replace(/[{}",:]/g, "").trim()) return toast.error(t("copyEmpty"))
  await copyText(text)
  toast.success(t("copiedMessage"))
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <th class="px-4 py-2.5">{{ t("tableKey") }}</th>
          <th class="px-4 py-2.5">{{ t("tableEN") }}</th>
          <th class="px-4 py-2.5">{{ t("tableKR") }}</th>
          <th class="px-4 py-2.5">{{ t("fieldCategory") }}</th>
          <th v-if="authenticated" class="w-20 px-4 py-2.5 text-right">{{ t("tableActions") }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="entry in entries"
          :key="entry.id"
          class="group/row border-b transition-colors last:border-b-0 hover:bg-muted/30"
        >
          <td class="px-4 py-2.5 font-medium">
            <div class="flex items-center gap-1.5">
              <span
                class="min-w-0 cursor-pointer truncate decoration-dashed underline-offset-2 hover:underline hover:decoration-muted-foreground/50"
                @click="copyID(entry)"
              >
                {{ entry.termID }}
              </span>
              <button
                class="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/row:opacity-100"
                @click="copyID(entry)"
              >
                <Copy class="h-4 w-4" />
              </button>
            </div>
          </td>
          <td class="px-4 py-2.5">
            <div class="flex items-center gap-1.5">
              <span
                class="min-w-0 cursor-pointer truncate decoration-dashed underline-offset-2 hover:underline hover:decoration-muted-foreground/50"
                @click="copyCell(entry, 'en')"
              >
                {{ entry.termEN }}
              </span>
              <button
                class="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/row:opacity-100"
                @click="copyCell(entry, 'en')"
              >
                <Copy class="h-4 w-4" />
              </button>
            </div>
          </td>
          <td class="px-4 py-2.5">
            <div class="flex items-center gap-1.5">
              <span
                class="min-w-0 cursor-pointer truncate decoration-dashed underline-offset-2 hover:underline hover:decoration-muted-foreground/50"
                @click="copyCell(entry, 'kr')"
              >
                {{ entry.termKR }}
              </span>
              <button
                class="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/row:opacity-100"
                @click="copyCell(entry, 'kr')"
              >
                <Copy class="h-4 w-4" />
              </button>
            </div>
          </td>
          <td class="px-4 py-2.5">
            <DCodeBadge :text="categoryLabel(entry.category)" :color="badgeColor(entry.category)" size="xs" />
          </td>
          <td v-if="authenticated" class="px-4 py-2.5 text-right">
            <div class="flex justify-end gap-1">
              <DCodeButton size="icon" variant="ghost" icon="Pencil" @click="emit('edit', entry.id)" />
              <DCodeButton size="icon" variant="ghost" icon="Trash2" bg-color="danger" @click="emit('delete', entry.id)" />
            </div>
          </td>
        </tr>
        <tr v-if="entries.length === 0">
          <td :colspan="authenticated ? 5 : 4" class="px-4 py-10 text-center text-sm text-muted-foreground">{{ t("count_0") }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

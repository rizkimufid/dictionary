<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "vue-i18n"
import { toast } from "vue3-toastify"

import { DataTable, DCodeButton } from "@skyworx/dynamic-ui"
import { singleCopy, copyText } from "@/utils/copy"
import type { AppLocale, CopyFormat, TermEntry } from "@/types"

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

const columns = computed(() => [
  { key: "termID", label: t("tableKey") },
  { key: "termEN", label: t("tableEN") },
  { key: "termKR", label: t("tableKR") },
])

async function copyCell(entry: TermEntry, lang: AppLocale) {
  const text = singleCopy(entry, lang, props.format)
  if (!text.replace(/[{}",:]/g, "").trim()) return toast.error(t("copyEmpty"))
  await copyText(text)
  toast.success(t("copiedMessage"))
}

const copyID = (entry: TermEntry) => copyCell(entry, "id")
</script>

<template>
  <DataTable
    :columns="columns"
    :data="entries"
    :has-actions="authenticated"
    :show-pagination="false"
    ignore-permissions
  >
    <template #cell-termID="{ row }">
      <div class="flex items-center gap-1.5">
        <span
          class="min-w-0 cursor-pointer truncate decoration-dashed underline-offset-2 hover:underline hover:decoration-muted-foreground/50"
          @click="copyID(row)"
        >{{ row.termID }}</span>
        <DCodeButton
          class="opacity-0 group-hover:opacity-100"
          size="icon"
          variant="ghost"
          icon="Copy"
          :tooltip="t('copyRow')"
          @click="copyID(row)"
        />
      </div>
    </template>

    <template #cell-termEN="{ row }">
      <div class="flex items-center gap-1.5">
        <span
          class="min-w-0 cursor-pointer truncate decoration-dashed underline-offset-2 hover:underline hover:decoration-muted-foreground/50"
          @click="copyCell(row, 'en')"
        >{{ row.termEN }}</span>
        <DCodeButton
          class="opacity-0 group-hover:opacity-100"
          size="icon"
          variant="ghost"
          icon="Copy"
          :tooltip="t('copyRow')"
          @click="copyCell(row, 'en')"
        />
      </div>
    </template>

    <template #cell-termKR="{ row }">
      <div class="flex items-center gap-1.5">
        <span
          class="min-w-0 cursor-pointer truncate decoration-dashed underline-offset-2 hover:underline hover:decoration-muted-foreground/50"
          @click="copyCell(row, 'kr')"
        >{{ row.termKR }}</span>
        <DCodeButton
          class="opacity-0 group-hover:opacity-100"
          size="icon"
          variant="ghost"
          icon="Copy"
          :tooltip="t('copyRow')"
          @click="copyCell(row, 'kr')"
        />
      </div>
    </template>

    <template v-if="authenticated" #actions="{ row }">
      <div class="flex justify-end gap-1">
        <DCodeButton
          size="icon"
          variant="ghost"
          icon="Pencil"
          :tooltip="t('edit')"
          @click="emit('edit', row.id)"
        />
        <DCodeButton
          size="icon"
          variant="ghost"
          icon="Trash2"
          bg-color="danger"
          :tooltip="t('delete')"
          @click="emit('delete', row.id)"
        />
      </div>
    </template>
  </DataTable>
</template>

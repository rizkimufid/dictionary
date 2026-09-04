<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { toast } from "vue3-toastify"
import {
  DCodeDialog,
  DCodeTextField,
  DCodeTextarea,
  DCodeButton,
} from "@gemafajarramadhan/dynamic-ui"
import { useDictionaryStore } from "@/stores/dictionary"
import type { TermCategory } from "@/types"

const props = defineProps<{
  open: boolean
  editingId?: string | null
}>()

const emit = defineEmits<{
  (e: "update:open", value: boolean): void
  (e: "saved"): void
}>()

const { t } = useI18n()
const store = useDictionaryStore()

const termID = ref<string>("")
const termEN = ref<string>("")
const termKR = ref<string>("")
const category = ref<TermCategory>("field")
const description = ref<string>("")

function reset() {
  termID.value = ""
  termEN.value = ""
  termKR.value = ""
  category.value = "field"
  description.value = ""
}

watch(
  () => [props.open, props.editingId] as const,
  ([open, editingId]) => {
    if (!open) return
    if (editingId) {
      const found = store.terms.find((t) => t.id === editingId)
      if (found) {
        termID.value = found.termID
        termEN.value = found.termEN
        termKR.value = found.termKR
        category.value = found.category
        description.value = found.description ?? ""
        return
      }
    }
    reset()
  },
  { immediate: true },
)

function close() {
  emit("update:open", false)
}

async function save() {
  const input = {
    termID: (termID.value ?? "") as string,
    termEN: (termEN.value ?? "") as string,
    termKR: (termKR.value ?? "") as string,
    category: category.value,
    description: (description.value ?? "") as string,
  }
  const result = props.editingId
    ? await store.updateTerm(props.editingId, input)
    : await store.addTerm(input)
  if (!result.ok) {
    toast.error(
      result.reason === "TermID (Indonesia) sudah ada untuk kategori ini"
        ? t("validationDuplicate")
        : t("validationEmpty"),
    )
    return
  }
  toast.success(t("savedMessage"))
  emit("saved")
  emit("update:open", false)
}
</script>

<template>
  <DCodeDialog
    :model-value="open"
    :title="editingId ? t('modalEditTitle') : t('modalAddTitle')"
    size="md"
    @update:model-value="emit('update:open', $event)"
  >
    <div class="flex flex-col gap-4">
      <DCodeTextField
        v-model="termID"
        :label="t('fieldKey')"
        :placeholder="t('fieldKey')"
      />
      <DCodeTextField
        v-model="termEN"
        :label="t('fieldEn')"
        :placeholder="t('fieldEn')"
      />
      <DCodeTextField
        v-model="termKR"
        :label="t('fieldKr')"
        :placeholder="t('fieldKr')"
      />

      <div>
        <label class="mb-1.5 block text-sm font-medium">{{ t("fieldCategory") }}</label>
        <select
          v-model="category"
          class="w-full h-10 rounded-lg border bg-white px-3 text-sm dark:bg-neutral-800"
        >
          <option value="field">{{ t("categoryField") }}</option>
          <option value="placeholder">{{ t("categoryPlaceholder") }}</option>
          <option value="action">{{ t("categoryAction") }}</option>
          <option value="title">{{ t("categoryTitle") }}</option>
          <option value="table-header">{{ t("categoryTableHeader") }}</option>
        </select>
      </div>

      <DCodeTextarea
        v-model="description"
        :label="t('fieldDescription')"
        :placeholder="t('fieldDescription')"
      />
    </div>

    <template #actions>
      <DCodeButton variant="outline" :text="t('cancel')" @click="close" />
      <DCodeButton bg-color="primary" :text="t('save')" @click="save" />
    </template>
  </DCodeDialog>
</template>

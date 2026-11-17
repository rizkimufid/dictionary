<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue3-toastify";
import {
    DCodeDialog,
    DCodeTextField,
    DCodeTextarea,
    DCodeButton,
} from "@skyworx/dynamic-ui";
import { useDictionaryStore } from "@/stores/dictionary";

const props = defineProps<{
    open: boolean;
    editingId?: string | null;
}>();

const emit = defineEmits<{
    (e: "update:open", value: boolean): void;
    (e: "saved"): void;
}>();

const { t } = useI18n();
const store = useDictionaryStore();

const termID = ref<string>("");
const termEN = ref<string>("");
const termKR = ref<string>("");
const description = ref<string>("");
const saving = ref(false);

function reset() {
    termID.value = "";
    termEN.value = "";
    termKR.value = "";
    description.value = "";
}

watch(
    () => [props.open, props.editingId] as const,
    ([open, editingId]) => {
        if (!open) return;
        if (editingId) {
            const found = store.terms.find((t) => t.id === editingId);
            if (found) {
                termID.value = found.termID;
                termEN.value = found.termEN;
                termKR.value = found.termKR;
                description.value = found.description ?? "";
                return;
            }
        }
        reset();
    },
    { immediate: true },
);

function onOpenChange(open: boolean) {
    if (!saving.value) emit("update:open", open);
}

function close() {
    onOpenChange(false);
}

async function save() {
    if (saving.value) return;
    const input = {
        termID: (termID.value ?? "") as string,
        termEN: (termEN.value ?? "") as string,
        termKR: (termKR.value ?? "") as string,
        description: (description.value ?? "") as string,
    };

    saving.value = true;
    try {
        const result = props.editingId
            ? await store.updateTerm(props.editingId, input)
            : await store.addTerm(input);
        if (!result.ok) {
            const message = result.code === "duplicate"
                ? t("validationDuplicate")
                : result.code === "empty"
                    ? t("validationEmpty")
                    : t("validationDatabase");
            toast.error(message);
            return;
        }
        toast.success(t("savedMessage"));
        emit("saved");
        emit("update:open", false);
    } catch {
        toast.error(t("validationDatabase"));
    } finally {
        saving.value = false;
    }
}
</script>

<template>
    <DCodeDialog
        :model-value="open"
        :title="editingId ? t('modalEditTitle') : t('modalAddTitle')"
        size="md"
        :show-close="!saving"
        @update:model-value="onOpenChange"
    >
        <div class="flex flex-col gap-4">
            <DCodeTextField
                v-model="termID"
                :label="t('fieldKey')"
                :placeholder="t('fieldKey')"
                :disabled="saving"
                rounded="lg"
            />
            <DCodeTextField
                v-model="termEN"
                :label="t('fieldEn')"
                :placeholder="t('fieldEn')"
                :disabled="saving"
                rounded="lg"
            />
            <DCodeTextField
                v-model="termKR"
                :label="t('fieldKr')"
                :placeholder="t('fieldKr')"
                :disabled="saving"
                rounded="lg"
            />

            <DCodeTextarea
                v-model="description"
                :label="t('fieldDescription')"
                :placeholder="t('fieldDescription')"
                :disabled="saving"
            />
        </div>

        <template #actions>
            <DCodeButton variant="outline" :text="t('cancel')" :disabled="saving" @click="close" />
            <DCodeButton
                bg-color="primary"
                :text="saving ? t('saving') : t('save')"
                :disabled="saving"
                @click="save"
            />
        </template>
    </DCodeDialog>
</template>

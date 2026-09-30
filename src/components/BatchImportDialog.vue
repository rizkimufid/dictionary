<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue3-toastify";
import { DCodeButton, DCodeDialog } from "@gemafajarramadhan/dynamic-ui";
import { useDictionaryStore, type BatchImportResult } from "@/stores/dictionary";
import {
    ImportFileError,
    MAX_IMPORT_ROWS,
    parseTermFile,
    type ImportCandidate,
    type ImportFileErrorCode,
} from "@/utils/importTerms";

const props = defineProps<{
    open: boolean;
}>();

const emit = defineEmits<{
    (e: "update:open", value: boolean): void;
    (e: "imported"): void;
}>();

const PREVIEW_LIMIT = 100;

const { t } = useI18n();
const store = useDictionaryStore();
const preview = ref<Awaited<ReturnType<typeof parseTermFile>> | null>(null);
const fileName = ref("");
const parseError = ref("");
const parsing = ref(false);
const importing = ref(false);
const result = ref<BatchImportResult | null>(null);

const rows = computed(() => preview.value?.rows ?? []);
const readyRows = computed(() => rows.value.filter((row) => row.status === "ready"));
const duplicateRows = computed(() => rows.value.filter((row) => row.status === "duplicate"));
const invalidRows = computed(() => rows.value.filter((row) => row.status === "invalid"));
const previewRows = computed(() => rows.value.slice(0, PREVIEW_LIMIT));
const busy = computed(() => parsing.value || importing.value);
const reportRows = computed(() => {
    const failed = invalidRows.value.map((row) => ({
        row,
        reason: t(row.reason === "invalidCategory" ? "batchInvalidCategory" : "batchEmptyRow"),
    }));
    for (const failure of result.value?.failed ?? []) {
        const row = readyRows.value.find((candidate) => candidate.rowNumber === failure.rowNumber);
        if (row) failed.push({ row, reason: failure.reason });
    }
    return failed;
});

function reset() {
    preview.value = null;
    fileName.value = "";
    parseError.value = "";
    result.value = null;
}

watch(
    () => props.open,
    (open) => {
        if (open) reset();
    },
    { immediate: true },
);

function onOpenChange(open: boolean) {
    if (!busy.value) emit("update:open", open);
}

function fileErrorMessage(error: unknown): string {
    if (!(error instanceof ImportFileError)) return t("batchUnexpectedError");
    const messages: Record<ImportFileErrorCode, string> = {
        fileType: t("batchInvalidFileType"),
        fileSize: t("batchFileTooLarge"),
        emptyFile: t("batchEmptyFile"),
        invalidCsv: t("batchInvalidCsv"),
        invalidXlsx: t("batchInvalidXlsx"),
        invalidHeaders: t("batchInvalidHeaders"),
        tooManyRows: t("batchTooManyRows", { n: MAX_IMPORT_ROWS }),
    };
    return messages[error.code];
}

async function onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    parsing.value = true;
    parseError.value = "";
    preview.value = null;
    result.value = null;
    fileName.value = file.name;

    try {
        preview.value = await parseTermFile(file, store.terms);
    } catch (error) {
        parseError.value = fileErrorMessage(error);
    } finally {
        parsing.value = false;
    }
}

function duplicateReason(row: ImportCandidate): string {
    return t(row.reason === "duplicateFile" ? "batchDuplicateFile" : "batchDuplicateExisting");
}

function invalidReason(row: ImportCandidate): string {
    return t(row.reason === "invalidCategory" ? "batchInvalidCategory" : "batchEmptyRow");
}

async function importRows() {
    if (!readyRows.value.length || busy.value) return;

    importing.value = true;
    try {
        result.value = await store.importTerms(
            readyRows.value.map(({ rowNumber, input }) => ({ rowNumber, input })),
        );
        emit("imported");
        if (result.value.inserted > 0) {
            toast.success(t("batchCompleted", {
                inserted: result.value.inserted,
                skipped: duplicateRows.value.length + result.value.skipped,
                failed: invalidRows.value.length + result.value.failed.length,
            }));
        } else if (result.value.failed.length > 0) {
            toast.error(t("batchImportFailed"));
        } else {
            toast.success(t("batchCompleted", {
                inserted: 0,
                skipped: duplicateRows.value.length + result.value.skipped,
                failed: invalidRows.value.length,
            }));
        }
    } catch {
        toast.error(t("batchImportFailed"));
    } finally {
        importing.value = false;
    }
}

function csvCell(value: unknown): string {
    let text = String(value ?? "");
    if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

function downloadReport() {
    const header = ["row", "status", "reason", "termID", "termEN", "termKR", "category", "description"];
    const lines = reportRows.value.map(({ row, reason }) => [
        row.rowNumber,
        "invalid",
        reason,
        row.input.termID,
        row.input.termEN,
        row.input.termKR,
        row.sourceCategory,
        row.input.description ?? "",
    ]);
    const csv = [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `dictionary-import-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}
</script>

<template>
    <DCodeDialog
        :model-value="open"
        :title="t('batchTitle')"
        size="lg"
        :show-close="!busy"
        @update:model-value="onOpenChange"
    >
        <div class="flex flex-col gap-4">
            <p class="text-sm text-muted-foreground">
                {{ t("batchDescription") }}
            </p>

            <label class="flex flex-col gap-2 text-sm font-medium">
                <span>{{ t("batchChooseFile") }}</span>
                <input
                    class="w-full rounded-lg border bg-white p-2 text-sm font-normal file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium dark:bg-neutral-800"
                    type="file"
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    :disabled="busy"
                    @change="onFileChange"
                />
            </label>

            <p class="text-xs text-muted-foreground">
                {{ t("batchFormatHint") }} · {{ t("batchRowLimit", { n: MAX_IMPORT_ROWS }) }}
            </p>

            <p v-if="parsing" class="text-sm text-muted-foreground" aria-live="polite">
                {{ t("batchParsing") }}
            </p>
            <p v-if="parseError" class="text-sm text-red-600 dark:text-red-400" role="alert">
                {{ parseError }}
            </p>

            <div v-if="preview" class="flex flex-col gap-3">
                <div class="grid grid-cols-3 gap-2 text-center text-xs">
                    <div class="rounded-lg bg-green-50 p-2 text-green-700 dark:bg-green-950 dark:text-green-300">
                        <strong class="block text-lg">{{ readyRows.length }}</strong>
                        {{ t("batchReady") }}
                    </div>
                    <div class="rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        <strong class="block text-lg">{{ duplicateRows.length }}</strong>
                        {{ t("batchDuplicate") }}
                    </div>
                    <div class="rounded-lg bg-red-50 p-2 text-red-700 dark:bg-red-950 dark:text-red-300">
                        <strong class="block text-lg">{{ invalidRows.length }}</strong>
                        {{ t("batchInvalid") }}
                    </div>
                </div>

                <p class="text-xs text-muted-foreground">
                    {{ fileName }} · {{ t("batchPreviewLimit", { n: PREVIEW_LIMIT }) }}
                </p>

                <div class="max-h-80 overflow-auto rounded-lg border">
                    <table class="w-full text-left text-xs">
                        <thead class="sticky top-0 bg-muted/80 text-muted-foreground">
                            <tr>
                                <th class="px-3 py-2">{{ t("batchRow") }}</th>
                                <th class="px-3 py-2">{{ t("tableKey") }}</th>
                                <th class="px-3 py-2">{{ t("tableEN") }}</th>
                                <th class="px-3 py-2">{{ t("tableKR") }}</th>
                                <th class="px-3 py-2">{{ t("fieldCategory") }}</th>
                                <th class="px-3 py-2">{{ t("batchStatus") }}</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in previewRows" :key="row.rowNumber" class="border-t">
                                <td class="px-3 py-2">{{ row.rowNumber }}</td>
                                <td class="max-w-40 truncate px-3 py-2">{{ row.input.termID }}</td>
                                <td class="max-w-40 truncate px-3 py-2">{{ row.input.termEN }}</td>
                                <td class="max-w-40 truncate px-3 py-2">{{ row.input.termKR }}</td>
                                <td class="px-3 py-2">{{ row.sourceCategory }}</td>
                                <td class="px-3 py-2">
                                    <span v-if="row.status === 'ready'" class="text-green-600 dark:text-green-400">
                                        {{ t("batchReady") }}
                                    </span>
                                    <span v-else-if="row.status === 'duplicate'" class="text-amber-600 dark:text-amber-400">
                                        {{ duplicateReason(row) }}
                                    </span>
                                    <span v-else class="text-red-600 dark:text-red-400">
                                        {{ invalidReason(row) }}
                                    </span>
                                </td>
                            </tr>
                            <tr v-if="!previewRows.length">
                                <td colspan="6" class="px-3 py-8 text-center text-muted-foreground">
                                    {{ t("batchNoRows") }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p v-if="result" class="text-sm font-medium" aria-live="polite">
                    {{
                        t("batchCompleted", {
                            inserted: result.inserted,
                            skipped: duplicateRows.length + result.skipped,
                            failed: invalidRows.length + result.failed.length,
                        })
                    }}
                </p>
            </div>
        </div>

        <template #actions>
            <DCodeButton
                variant="outline"
                :text="t('close')"
                :disabled="busy"
                @click="onOpenChange(false)"
            />
            <DCodeButton
                v-if="reportRows.length"
                variant="secondary"
                :text="t('batchDownloadReport')"
                :disabled="busy"
                @click="downloadReport"
            />
            <DCodeButton
                bg-color="primary"
                :text="importing ? t('batchImporting') : t('batchImportAction')"
                :disabled="busy || !readyRows.length"
                @click="importRows"
            />
        </template>
    </DCodeDialog>
</template>

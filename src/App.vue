<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue3-toastify";
import { useDebounceFn } from "@vueuse/core";

import {
    DCodeAutoComplete,
    DCodeButton,
    DCodePagination,
    DCodeTextField,
} from "@gemafajarramadhan/dynamic-ui";
import TermCard from "@/components/TermCard.vue";
import TermTable from "@/components/TermTable.vue";
import TermFormDialog from "@/components/TermFormDialog.vue";
import BatchImportDialog from "@/components/BatchImportDialog.vue";
import LoginScreen from "@/components/LoginScreen.vue";
import { useDictionaryStore } from "@/stores/dictionary";
import { supabase } from "@/lib/supabase";
import { supportLocales } from "@/i18n";
import type { AppLocale, CopyFormat, TermCategory, ViewMode } from "@/types";

const { t, locale } = useI18n();
const store = useDictionaryStore();

const authenticated = ref(false);
const search = ref("");
const categoryFilter = ref<"all" | TermCategory>("all");
const format = ref<CopyFormat>("text");
const appLocale = ref<AppLocale>("id");
const viewMode = ref<ViewMode>("table");
const currentPage = ref(1);
const perPage = ref(25);

watch(appLocale, (v) => {
    locale.value = v;
});

function cycleLocale() {
    const i = supportLocales.indexOf(appLocale.value);
    appLocale.value = supportLocales[(i + 1) % supportLocales.length];
}

const categoryOptions = [
    { value: "all", label: t("filterAll") },
    { value: "field", label: t("categoryField") },
    { value: "placeholder", label: t("categoryPlaceholder") },
    { value: "action", label: t("categoryAction") },
    { value: "title", label: t("categoryTitle") },
    { value: "table-header", label: t("categoryTableHeader") },
];

const dialogOpen = ref(false);
const editingId = ref<string | null>(null);
const batchOpen = ref(false);
const loginOpen = ref(false);

function openLogin() {
    loginOpen.value = true;
}

async function loadTerms() {
    await store.fetchTerms({
        page: currentPage.value,
        perPage: perPage.value,
        query: search.value,
        category: categoryFilter.value,
    });
}

const debouncedSearch = useDebounceFn(() => {
    currentPage.value = 1;
    loadTerms();
}, 300);

watch(search, () => {
    debouncedSearch();
});

watch(categoryFilter, () => {
    currentPage.value = 1;
    loadTerms();
});

function onPageChange(page: number) {
    currentPage.value = page;
    loadTerms();
}

function onPerPageChange(limit: number) {
    perPage.value = limit;
    currentPage.value = 1;
    loadTerms();
}

onMounted(async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
        authenticated.value = true;
    }
    await loadTerms();

    document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
    document.removeEventListener("keydown", handleKeydown);
});

function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        nextTick(() => {
            const el = document.querySelector<HTMLInputElement>(
                "[data-search-input]",
            );
            el?.focus();
            el?.select();
        });
    }
}

async function onAuthenticated() {
    authenticated.value = true;
    loginOpen.value = false;
    await loadTerms();
}

async function logout() {
    await supabase.auth.signOut();
    authenticated.value = false;
    await loadTerms();
}

function openAdd() {
    editingId.value = null;
    dialogOpen.value = true;
}

function openEdit(id: string) {
    if (!store.terms.some((term) => term.id === id)) {
        toast.error(t("entryNotFound"));
        return;
    }
    editingId.value = id;
    dialogOpen.value = true;
}

async function onDelete(id: string) {
    if (window.confirm(t("confirmDelete"))) {
        await store.removeTerm(id);
        toast.success(t("deletedMessage"));
    }
}
</script>

<template>
    <div
        class="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-4 sm:p-8"
    >
        <header class="flex items-center justify-between">
            <div>
                <h1 class="text-2xl font-bold tracking-tight">
                    {{ t("appTitle") }}
                </h1>
                <p class="text-sm text-muted-foreground">
                    {{ t("appSubtitle") }}
                </p>
            </div>
            <div class="flex items-center gap-2">
                <DCodeButton
                    variant="tonal"
                    bgColor="primary"
                    icon="Earth"
                    size="sm"
                    :tooltip="t('switchLanguage')"
                    @click="cycleLocale"
                    :text="appLocale.toUpperCase()"
                />
                <template v-if="authenticated">
                    <DCodeButton
                        variant="default"
                        bgColor="danger"
                        size="sm"
                        :text="t('logoutButton')"
                        icon="LogOut"
                        @click="logout"
                        rounded="lg"
                    />
                </template>
                <template v-else>
                    <DCodeButton
                        size="sm"
                        bg-color="primary"
                        :text="t('loginTitle')"
                        icon="LogIn"
                        @click="openLogin"
                        rounded="lg"
                    />
                </template>
            </div>
        </header>

        <div class="flex flex-row gap-3">
            <DCodeTextField
                v-model="search"
                :placeholder="t('searchPlaceholder')"
                data-search-input
                size="sm"
                rounded="lg"
            />
            <DCodeAutoComplete
                v-model="categoryFilter"
                :options="categoryOptions"
                item-value="value"
                item-title="label"
                :placeholder="t('filterAll')"
                size="sm"
                rounded="lg"
                :searchable="false"
            />
        </div>
        <div
            class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
            <div class="flex flex-wrap items-center gap-3">
                <div class="flex overflow-hidden rounded-lg border">
                    <button
                        v-for="f in ['text', 'code', 'json'] as CopyFormat[]"
                        :key="f"
                        class="px-3 py-1.5 text-xs font-medium transition-colors"
                        :class="
                            format === f
                                ? 'bg-primary text-white'
                                : 'bg-white text-muted-foreground hover:bg-muted/50 dark:bg-neutral-800'
                        "
                        @click="format = f"
                    >
                        {{
                            f === "text"
                                ? t("formatText")
                                : f === "code"
                                  ? t("formatCode")
                                  : t("formatJson")
                        }}
                    </button>
                </div>

                <div class="flex overflow-hidden rounded-lg border">
                    <button
                        v-for="m in ['table', 'card'] as ViewMode[]"
                        :key="m"
                        class="px-3 py-1.5 text-xs font-medium transition-colors"
                        :class="
                            viewMode === m
                                ? 'bg-primary text-white'
                                : 'bg-white text-muted-foreground hover:bg-muted/50 dark:bg-neutral-800'
                        "
                        @click="viewMode = m"
                    >
                        {{
                            m === "table"
                                ? t("viewModeTable")
                                : t("viewModeCard")
                        }}
                    </button>
                </div>
            </div>

            <div v-if="authenticated" class="flex flex-wrap justify-end gap-2">
                <DCodeButton
                    :text="t('batchImport')"
                    icon="Upload"
                    variant="tonal"
                    bgColor="primary"
                    size="sm"
                    @click="batchOpen = true"
                />
                <DCodeButton
                    :text="t('addTerm')"
                    icon="Plus"
                    variant="default"
                    bgColor="success"
                    size="sm"
                    @click="openAdd"
                />
            </div>
        </div>

        <p class="text-xs text-muted-foreground">
            {{ t("count_" + Math.min(store.total, 1), [store.total]) }}
        </p>

        <div class="flex flex-col gap-3">
            <p
                v-if="store.terms.length === 0 && !store.loading"
                class="py-10 text-center text-sm text-muted-foreground"
            >
                {{ t("count_0") }}
            </p>
            <template v-if="viewMode === 'card'">
                <TermCard
                    v-for="entry in store.terms"
                    :key="entry.id"
                    :entry="entry"
                    :format="format"
                    :authenticated="authenticated"
                    @edit="openEdit"
                    @delete="onDelete"
                />
            </template>
            <TermTable
                v-else
                :entries="store.terms"
                :format="format"
                :authenticated="authenticated"
                @edit="openEdit"
                @delete="onDelete"
            />

            <div
                v-if="store.total > 0"
                class="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row"
            >
                <span class="text-xs text-muted-foreground">
                    {{
                        t("showingCount", {
                            from: (currentPage - 1) * perPage + 1,
                            to: Math.min(currentPage * perPage, store.total),
                            total: store.total,
                        })
                    }}
                </span>
                <DCodePagination
                    :total-items="store.total"
                    :current-page="currentPage"
                    :per-page="perPage"
                    :loading="store.loading"
                    @update:page="onPageChange"
                    @update:per-page="onPerPageChange"
                />
            </div>
        </div>

        <TermFormDialog v-model:open="dialogOpen" :editing-id="editingId" />
        <BatchImportDialog v-model:open="batchOpen" />

        <LoginScreen
            v-model:open="loginOpen"
            @authenticated="onAuthenticated"
        />
    </div>
</template>

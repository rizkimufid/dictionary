<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { DCodeTextField, DCodeButton } from "@gemafajarramadhan/dynamic-ui"
import { supabase } from "@/lib/supabase"

const emit = defineEmits<{
  (e: "authenticated"): void
}>()

const { t } = useI18n()
const email = ref<string>("")
const password = ref<string>("")
const loading = ref(false)
const error = ref("")

async function login() {
  loading.value = true
  error.value = ""

  const { error: authError } = await supabase.auth.signInWithPassword({
    email: email.value ?? "",
    password: password.value ?? "",
  })

  loading.value = false

  if (authError) {
    error.value = t("loginError")
    return
  }
  emit("authenticated")
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-muted/30 p-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <h1 class="text-2xl font-bold tracking-tight">{{ t("appTitle") }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ t("appSubtitle") }}</p>
      </div>

      <div class="rounded-xl border bg-card p-6 shadow-sm">
        <h2 class="mb-4 text-lg font-semibold">{{ t("loginTitle") }}</h2>

        <form @submit.prevent="login" class="flex flex-col gap-4">
          <DCodeTextField
            v-model="email"
            :label="t('loginEmail')"
            :placeholder="t('loginEmail')"
            value-type="email"
          />

          <DCodeTextField
            v-model="password"
            :label="t('loginPassword')"
            :placeholder="t('loginPassword')"
            value-type="password"
            :error="error || null"
            @keyup.enter="login"
          />

          <DCodeButton
            :text="t('loginButton')"
            bg-color="primary"
            :loading="loading"
            :disabled="!(email ?? '') || !(password ?? '')"
            @click="login"
          />
        </form>
      </div>
    </div>
  </div>
</template>

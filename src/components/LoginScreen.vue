<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "vue-i18n"
import { DCodeTextField, DCodeButton, DCodeDialog } from "@gemafajarramadhan/dynamic-ui"
import { supabase } from "@/lib/supabase"

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (e: "update:open", value: boolean): void
  (e: "authenticated"): void
}>()

const { t } = useI18n()
const email = ref<string>("")
const password = ref<string>("")
const loading = ref(false)
const error = ref("")

watch(
  () => props.open,
  (open) => {
    if (open) {
      error.value = ""
    }
  },
)

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

function close() {
  emit("update:open", false)
}
</script>

<template>
  <DCodeDialog
    :model-value="open"
    :title="t('loginTitle')"
    size="sm"
    @update:model-value="emit('update:open', $event)"
  >
    <div class="flex flex-col gap-4">
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
      />
    </div>

    <template #actions>
      <DCodeButton variant="outline" :text="t('cancel')" @click="close" />
      <DCodeButton
        :text="t('loginButton')"
        bg-color="primary"
        :loading="loading"
        :disabled="!(email ?? '') || !(password ?? '')"
        @click="login"
      />
    </template>
  </DCodeDialog>
</template>

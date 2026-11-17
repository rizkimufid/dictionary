import { createApp } from "vue"
import { createPinia } from "pinia"
import { DynamicUI } from "@skyworx/dynamic-ui"
import { i18n } from "@/i18n"
import "vue3-toastify/dist/index.css"
import "@skyworx/dynamic-ui/style.css"
import App from "./App.vue"
import "./assets/main.css";

const pinia = createPinia()

const app = createApp(App)
app.use(DynamicUI, { externalApi: null })
app.use(pinia).use(i18n).mount("#app")

import { createApp } from "vue"
import { createPinia } from "pinia"
import { i18n } from "@/i18n"
import "vue3-toastify/dist/index.css"
import "@gemafajarramadhan/dynamic-ui/style.css"
import App from "./App.vue"
import '@gemafajarramadhan/dynamic-ui/dist/dynamic-ui.css'
import "./assets/main.css";

const pinia = createPinia()

createApp(App).use(pinia).use(i18n).mount("#app")

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './style.css'
import { initOneSignal } from './utils/oneSignal'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// Init OneSignal: SDK script sudah di-load di index.html,
// ini hanya init({ appId }) + requestPermission + optIn
initOneSignal()

import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import LicenseWindow from './components/LicenseWindow.vue'

const app = createApp(App)

// Check if we're on the license route
if (window.location.hash === '#/license') {
  const licenseApp = createApp(LicenseWindow)
  licenseApp.mount('#app')
} else {
  app.mount('#app')
}

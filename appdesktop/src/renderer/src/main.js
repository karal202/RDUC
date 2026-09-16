import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import LicenseWindow from './components/LicenseWindow.vue'

function uiLog(level, tag, msg) {
  try {
    if (window.api && typeof window.api.log === 'function') {
      window.api.log(level, tag, msg).catch(() => {
        void 0
      })
    }
  } catch {
    void 0
  }
  const meth = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  try {
    meth(`[UI:${tag}]`, msg)
  } catch {
    void 0
  }
}

uiLog('info', 'main', `Renderer starting. hash=${window.location.hash} UA=${navigator.userAgent}`)
uiLog(
  'info',
  'main',
  `window.api available=${!!window.api} contextIsolated=${typeof window.api === 'object' ? 'yes' : 'no or pending'}`
)

window.addEventListener('error', (event) => {
  const info =
    event.error && event.error.stack ? event.error.stack : String(event.message || 'unknown')
  uiLog(
    'error',
    'crash',
    `window.error: message=${event.message} filename=${event.filename} line=${event.lineno} col=${event.colno} stack=${info}`
  )
})

window.addEventListener('unhandledrejection', (event) => {
  let r = ''
  try {
    if (event.reason instanceof Error) r = event.reason.stack || String(event.reason)
    else if (typeof event.reason === 'object') r = JSON.stringify(event.reason)
    else r = String(event.reason)
  } catch {
    r = String(event.reason || 'unknown')
  }
  uiLog('error', 'crash', `unhandledrejection: ${r}`)
})

window.addEventListener('load', () => uiLog('info', 'main', 'window load event fired'))
window.addEventListener('DOMContentLoaded', () =>
  uiLog('info', 'main', 'DOMContentLoaded event fired')
)
window.addEventListener('beforeunload', () => uiLog('info', 'main', 'beforeunload event fired'))

function attachVueErrorHandlers(vueApp, name) {
  vueApp.config.errorHandler = (err, instance, info) => {
    const stack = err instanceof Error ? err.stack || String(err) : String(err)
    uiLog(
      'error',
      'crash',
      `Vue(${name}) errorHandler: info=${info || ''} err=${stack} instance=${instance ? Object.prototype.toString.call(instance) : 'none'}`
    )
  }
  vueApp.config.warnHandler = (msg, instance, trace) => {
    uiLog('warn', 'vue', `Vue(${name}) warn: ${String(msg)} trace=${trace || ''}`)
  }
  uiLog('info', 'main', `Vue app [${name}] error/warn handlers attached`)
}

const app = createApp(App)
attachVueErrorHandlers(app, 'main')

if (window.location.hash === '#/license') {
  uiLog('info', 'main', 'hash = #/license — mounting LicenseWindow')
  const licenseApp = createApp(LicenseWindow)
  attachVueErrorHandlers(licenseApp, 'license')
  try {
    licenseApp.mount('#app')
    uiLog('info', 'main', 'LicenseWindow mounted OK')
  } catch (e) {
    const s = e instanceof Error ? e.stack : String(e)
    uiLog('error', 'crash', `LicenseWindow mount FAILED: ${s}`)
    throw e
  }
} else {
  uiLog('info', 'main', 'hash != #/license — mounting main App')
  try {
    app.mount('#app')
    uiLog('info', 'main', 'Main App mounted OK')
  } catch (e) {
    const s = e instanceof Error ? e.stack : String(e)
    uiLog('error', 'crash', `Main App mount FAILED: ${s}`)
    throw e
  }
}

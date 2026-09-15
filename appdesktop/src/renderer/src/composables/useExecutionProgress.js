import { reactive, readonly } from 'vue'

const state = reactive({
  active: new Map(),
  lastCompleted: null
})

let subscribed = false
let cleanupListener = null

function subscribe() {
  if (subscribed) return
  if (typeof window === 'undefined' || !window.api || !window.api.onFeatureProgress) return

  cleanupListener = window.api.onFeatureProgress((payload) => {
    const { executionId, scriptKey, featureKey, label, percent, phase, message } = payload
    const key = executionId || `${featureKey || scriptKey}-fallback`

    const currentEntry = state.active.get(key) || {
      startedAt: Date.now(),
      executionId: key,
      scriptKey: featureKey || scriptKey,
      label: label || featureKey || scriptKey,
      percent: 0,
      phase: phase || 'start',
      message: message || 'Đang chuẩn bị…'
    }

    const next = {
      ...currentEntry,
      scriptKey: featureKey || scriptKey || currentEntry.scriptKey,
      label: label || currentEntry.label,
      percent:
        typeof percent === 'number' ? Math.min(100, Math.max(0, percent)) : currentEntry.percent,
      phase: phase || currentEntry.phase,
      message: message || currentEntry.message,
      lastUpdateAt: Date.now()
    }

    state.active.set(key, next)

    if (next.percent >= 100) {
      state.lastCompleted = { ...next, completedAt: Date.now() }
      setTimeout(() => {
        if (state.active.get(key)?.percent >= 100) {
          state.active.delete(key)
        }
      }, 1600)
    }
  })

  subscribed = true
}

if (typeof window !== 'undefined') {
  try {
    subscribe()
  } catch {
    void 0
  }
  window.addEventListener?.(
    'beforeunload',
    () => {
      if (typeof cleanupListener === 'function') {
        try {
          cleanupListener()
        } catch {
          void 0
        }
      }
    },
    { once: true }
  )
}

export function useExecutionProgress() {
  const activeList = () => Array.from(state.active.values())

  const topActive = () => {
    const list = activeList()
    if (!list.length) return null
    return list.sort((a, b) => (b.lastUpdateAt || 0) - (a.lastUpdateAt || 0))[0]
  }

  const isFeatureRunning = (featureKey) => {
    return activeList().some((entry) => entry.scriptKey === featureKey && entry.percent < 100)
  }

  return {
    state: readonly(state),
    activeList,
    topActive,
    isFeatureRunning
  }
}

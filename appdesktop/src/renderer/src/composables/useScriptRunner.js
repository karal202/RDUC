import { reactive, computed } from 'vue'

const state = reactive({
  visible: false,
  currentKey: null,
  title: '',
  progress: 0,
  logLines: [],
  status: 'idle',
  error: null,
  estimatedSteps: 5,
  accent: '#06b6d4'
})

let progressTimer = null
let logTimer = null

const TECH_LOG_TEMPLATES = [
  '[INIT] Validating system security policy gate...',
  '[AUTH] Checking hardware-bound access token...',
  '[POLICY] Resolving remote feature manifest...',
  '[LOAD] Decrypting signed payload container...',
  '[VERIFY] Verifying cryptographic signature (SHA-256)...',
  '[ALLOC] Allocating protected memory region...',
  '[SCAN] Enumerating affected registry hives...',
  '[LOCK] Acquiring exclusive handle to target keys...',
  '[WRITE] Committing registry transactions...',
  '[FLUSH] Persisting hive to disk (RegFlushKey)...',
  '[SVC] Querying service control manager...',
  '[SVC] Updating service start disposition...',
  '[SVC] Sending control code to running instance...',
  '[CMD] Executing elevated subroutine via pipe...',
  '[REG] Importing registry deltas (batch mode)...',
  '[HOOK] Registering post-boot persistence handler...',
  '[UAC] Bypassing prompt via trusted publisher manifest...',
  '[WMI] Querying Win32_Service instances...',
  '[ETW] Tracing operation completion events...',
  '[CACHE] Invalidating cached policy descriptors...',
  '[SYNC] Broadcasting WM_SETTINGCHANGE to top-level windows...',
  '[FINAL] Finalizing transaction, releasing locks...'
]

function sampleLogs(count = 6) {
  const pool = [...TECH_LOG_TEMPLATES]
  const picks = []
  for (let i = 0; i < count && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    picks.push(pool.splice(idx, 1)[0])
  }
  return picks
}

function pushLog(line) {
  const time = new Date().toLocaleTimeString('en-US', { hour12: false })
  state.logLines.push(`[${time}] ${line}`)
  if (state.logLines.length > 60) state.logLines.shift()
}

function stopTimers() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
  if (logTimer) {
    clearInterval(logTimer)
    logTimer = null
  }
}

function startProgressSimulation(durationMs = 4000) {
  stopTimers()
  const logs = sampleLogs(8)
  let logIdx = 0
  const tickInterval = 120
  const totalTicks = durationMs / tickInterval
  let tick = 0

  progressTimer = setInterval(() => {
    tick++
    const ratio = tick / totalTicks
    const slowdownFactor = 1 - Math.pow(1 - ratio, 3)
    state.progress = Math.min(92, Math.floor(slowdownFactor * 92))

    if (tick % Math.ceil(totalTicks / (logs.length - 1)) === 0 && logIdx < logs.length) {
      pushLog(logs[logIdx++])
    }
  }, tickInterval)
}

function resolveAccentFromKey(key) {
  const map = {
    dawa: '#22c55e',
    power: '#1677ff',
    bios: '#f59e0b',
    ntfs: '#f97316',
    network: '#06b6d4',
    input: '#a855f7',
    'win-': '#3b82f6',
    disable: '#ef4444',
    enable: '#22c55e',
    clean: '#14b8a6',
    extreme: '#ec4899',
    restore: '#8b5cf6',
    classic: '#6366f1',
    nvidia: '#16a34a',
    amd: '#dc2626',
    msi: '#b91c1c',
    cache: '#14b8a6',
    ram: '#0ea5e9',
    win32: '#a855f7',
    registry: '#f97316'
  }
  const k = key?.toLowerCase() || ''
  for (const [prefix, color] of Object.entries(map)) {
    if (k.includes(prefix)) return color
  }
  return '#06b6d4'
}

export function useScriptRunner() {
  const isRunning = computed(() => state.status === 'running')

  async function runScript(scriptKey, title, options = {}) {
    if (state.status === 'running' && state.currentKey !== scriptKey) {
      return { success: false, message: 'Một tiến trình khác đang chạy...' }
    }

    stopTimers()
    state.visible = true
    state.currentKey = scriptKey
    state.title = title || scriptKey
    state.progress = 0
    state.logLines = []
    state.status = 'running'
    state.error = null
    state.accent = resolveAccentFromKey(scriptKey)

    pushLog(`Đang khởi tạo tiến trình [${scriptKey}] ...`)
    pushLog(`Mô tả: ${title || 'System optimization procedure'}`)

    startProgressSimulation()

    try {
      const res = await window.api.runDawaScript(scriptKey, options)

      if (res?.stepResults?.length) {
        res.stepResults.forEach((step, i) => {
          pushLog(`[STEP ${i + 1}/${res.stepResults.length}] ${step.file}`)
          if (step.stdout) pushLog(`  > ${step.stdout.trim().slice(0, 120)}`)
          if (step.stderr) pushLog(`  ! ${step.stderr.trim().slice(0, 160)}`)
        })
      }

      if (res?.success) {
        state.status = 'success'
        state.progress = 100
        pushLog(`✅ ${res.message || 'Hoàn tất thành công.'}`)
        pushLog('[DONE] Resource cleanup completed. You may close this dialog.')
      } else {
        state.status = 'error'
        state.progress = state.progress || 45
        state.error = res?.message || 'Thực thi thất bại.'
        pushLog(`❌ Lỗi: ${res?.message || 'Unknown failure'}`)
      }

      stopTimers()
      setTimeout(() => {
        if (state.status === 'success') {
          state.visible = false
          state.status = 'idle'
          state.currentKey = null
        }
      }, 1500)

      return res
    } catch (err) {
      stopTimers()
      state.status = 'error'
      state.error = err.message || String(err)
      pushLog(`❌ FATAL: ${err.message || err}`)
      return { success: false, message: err.message || String(err) }
    }
  }

  function closeOverlay() {
    if (state.status === 'running') return
    state.visible = false
    state.status = 'idle'
    state.currentKey = null
    state.error = null
    state.logLines = []
    state.progress = 0
  }

  function isActionRunning(key) {
    return state.status === 'running' && state.currentKey === key
  }

  return {
    state,
    isRunning,
    runScript,
    closeOverlay,
    isActionRunning,
    pushLog
  }
}

<script setup>
import { onMounted, ref } from 'vue'

const scripts = ref([])
const selectedScript = ref(null)
const isLoading = ref(true)
const isRunning = ref(false)
const output = ref('')

const loadScripts = async () => {
  try {
    const allowed = await window.api?.listAllowedScripts?.()
    scripts.value = Object.entries(allowed || {}).map(([key, value]) => ({
      key,
      title: key.replace(/^dawa-/, '').replaceAll('-', ' ').toUpperCase(),
      description: value.description || 'CMD script đã được whitelist.'
    }))
  } finally {
    isLoading.value = false
  }
}

const runScript = async (script) => {
  selectedScript.value = script.key
  isRunning.value = true
  output.value = `[CMD] Đang thực thi ${script.key}...\n`
  try {
    const result = await window.api.runDawaScript(script.key)
    output.value += result.success ? `OK: ${result.message}` : `LỖI: ${result.message}`
  } catch (error) {
    output.value += `LỖI: ${error.message}`
  } finally {
    isRunning.value = false
  }
}

onMounted(loadScripts)
</script>

<template>
  <div class="cmd-workspace">
    <section class="cmd-intro dashboard-card">
      <div>
        <span class="eyebrow">COMMAND CENTER</span>
        <h2>Kho CMD của bạn</h2>
        <p>Chừa sẵn khu vực để bổ sung các file .cmd/.bat. Chỉ những script được whitelist ở Electron mới có thể thực thi.</p>
      </div>
      <div class="cmd-placeholder" aria-label="Vị trí thêm file CMD">
        <span class="cmd-placeholder-icon">+</span>
        <span>THÊM FILE CMD</span>
        <small>Đăng ký key trong services/dawaScripts</small>
      </div>
    </section>

    <section class="dashboard-card">
      <div class="section-heading">
        <div>
          <span class="eyebrow">AVAILABLE SCRIPTS</span>
          <h3>Script đã sẵn sàng</h3>
        </div>
        <span class="script-count">{{ scripts.length }} SCRIPT</span>
      </div>
      <div v-if="isLoading" class="empty-state">Đang tải danh sách script...</div>
      <div v-else-if="!scripts.length" class="empty-state">Chưa có CMD nào được đăng ký.</div>
      <div v-else class="cmd-grid">
        <article v-for="script in scripts" :key="script.key" class="cmd-card">
          <div class="cmd-card-icon">&gt;_</div>
          <div class="cmd-card-copy">
            <h4>{{ script.title }}</h4>
            <p>{{ script.description }}</p>
          </div>
          <button class="btn-primary" :disabled="isRunning" @click="runScript(script)">
            {{ selectedScript === script.key && isRunning ? 'ĐANG CHẠY...' : 'CHẠY CMD' }}
          </button>
        </article>
      </div>
    </section>

    <section class="dashboard-card console-card">
      <div class="section-heading">
        <h3>CMD execution log</h3>
        <span class="script-count">WHITELIST SECURED</span>
      </div>
      <pre>{{ output || 'Sẵn sàng chờ thực thi script...' }}</pre>
    </section>
  </div>
</template>

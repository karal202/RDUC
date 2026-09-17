<script setup>
import { Rocket, Activity, ShieldCheck, Cpu, Wifi, Database } from 'lucide-vue-next'
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'

defineProps({
  launching: { type: Boolean, default: false },
  copy: { type: String, default: 'Booting kernel subsystem' }
})

const logs = ref([])
const progress = ref(8)
const stageLabels = [
  'BOOT0  Boot ROM handshake',
  'HWID   Fingerprinting hardware',
  'VAULT  AES-256-GCM sealed',
  'NET    Backend ping 200 OK',
  'CORE   Kernel modules ready'
]
let tick = null
let stageIdx = 0

onMounted(() => {
  tick = setInterval(() => {
    progress.value = Math.min(96, progress.value + Math.random() * 6 + 1.2)
    if (logs.value.length < stageLabels.length && progress.value > (stageIdx + 1) * 17) {
      logs.value.unshift({ t: new Date().toISOString().slice(11, 19), msg: stageLabels[stageIdx] })
      stageIdx += 1
    }
  }, 180)
})

onBeforeUnmount(() => {
  if (tick) clearInterval(tick)
})

const pct = computed(() => Math.round(progress.value))
</script>

<template>
  <div
    class="rocket-launch"
    :class="{ 'rocket-launching': launching }"
    role="status"
    aria-live="polite"
    aria-label="Booting DAWA Optimizer"
  >
    <div class="rocket-stars" aria-hidden="true"></div>
    <div class="rocket-aurora" aria-hidden="true"></div>

    <div class="rocket-stage">
      <div class="rocket-flight">
        <div class="rocket-body">
          <Rocket :size="54" :stroke-width="2" />
        </div>
        <div class="rocket-plume" aria-hidden="true">
          <span class="rocket-plume-core"></span>
        </div>
      </div>
    </div>

    <p class="rocket-title">DAWA</p>
    <p class="rocket-copy">{{ copy }}</p>

    <div class="rocket-ground" aria-hidden="true">
      <div class="rocket-ground-stripes"></div>
      <div class="rocket-ground-runner" :style="{ '--pct': pct + '%' }">
        <Rocket :size="16" :stroke-width="2.25" class="rocket-ground-icon" />
        <span class="rocket-ground-trail"></span>
      </div>
      <div class="rocket-ground-pins" aria-hidden="true">
        <span><Activity :size="11" /></span>
        <span><ShieldCheck :size="11" /></span>
        <span><Cpu :size="11" /></span>
        <span><Wifi :size="11" /></span>
        <span><Database :size="11" /></span>
      </div>
    </div>

    <div class="rocket-track" aria-hidden="true">
      <span class="rocket-track-fill" :style="{ width: pct + '%', animation: 'none' }"></span>
      <span class="rocket-track-glow" :style="{ width: pct + '%' }"></span>
    </div>
    <p class="rocket-track-label">CORE INITIALIZATION · {{ pct }}%</p>

    <ul class="rocket-log" aria-hidden="true">
      <li v-for="(line, i) in logs" :key="i">
        <span class="rocket-log-time">{{ line.t }}</span>
        <span class="rocket-log-msg">{{ line.msg }}</span>
      </li>
      <li v-if="logs.length === 0">
        <span class="rocket-log-time">{{ new Date().toISOString().slice(11, 19) }}</span>
        <span class="rocket-log-msg">INIT Resolving secure boot chain</span>
      </li>
    </ul>
  </div>
</template>

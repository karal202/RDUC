<script setup>
import { Rocket, Activity, ShieldCheck, Cpu, Wifi, Database } from 'lucide-vue-next'
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'

defineProps({
  launching: { type: Boolean, default: false },
  copy: { type: String, default: 'Booting kernel subsystem' }
})

const progress = ref(8)
let tick = null

onMounted(() => {
  tick = setInterval(() => {
    progress.value = Math.min(96, progress.value + Math.random() * 6 + 1.2)
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
  </div>
</template>

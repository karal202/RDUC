<script setup>
import { Rocket } from 'lucide-vue-next'

defineProps({
  launching: { type: Boolean, default: false }
})
</script>

<template>
  <div
    class="rocket-launch"
    :class="{ 'rocket-launching': launching }"
    role="status"
    aria-live="polite"
    aria-label="Đang xác thực bản quyền"
  >
    <div class="rocket-stars" aria-hidden="true"></div>
    <div class="rocket-stage">
      <div class="rocket-flight">
        <div class="rocket-body">
          <Rocket :size="54" :stroke-width="1.6" />
        </div>
        <div class="rocket-plume" aria-hidden="true">
          <span class="rocket-plume-core"></span>
        </div>
      </div>
    </div>
    <p class="rocket-title">DAWA</p>
    <p class="rocket-copy">Đang xác thực bản quyền HWID</p>
    <div class="rocket-track" aria-hidden="true">
      <span class="rocket-track-fill"></span>
    </div>
  </div>
</template>
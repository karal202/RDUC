<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  banners: { type: Array, required: true },
  variant: { type: String, default: 'landscape' },
  interval: { type: Number, default: 3200 }
})

const activeBanner = ref(0)
const isPaused = ref(false)
let timer = null

const showBanner = (direction) => {
  activeBanner.value = (activeBanner.value + direction + props.banners.length) % props.banners.length
}

const startTimer = () => {
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (!isPaused.value) showBanner(1)
  }, props.interval)
}

onMounted(startTimer)
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div
    class="hero-banner"
    :class="`hero-banner-${variant}`"
    tabindex="0"
    role="region"
    aria-label="Banner DAWA SHOP"
    @mouseenter="isPaused = true"
    @mouseleave="isPaused = false"
    @focus="isPaused = true"
    @blur="isPaused = false"
    @keydown.left.prevent="showBanner(-1)"
    @keydown.right.prevent="showBanner(1)"
  >
    <img
      v-for="(banner, index) in banners"
      :key="banner.src"
      :src="banner.src"
      :alt="banner.alt"
      class="hero-banner-image"
      :class="{ active: index === activeBanner }"
    />
    <button
      v-if="variant === 'landscape'"
      class="banner-arrow banner-arrow-left"
      type="button"
      aria-label="Banner trước"
      @click="showBanner(-1)"
    >
      <ChevronLeft :size="18" :stroke-width="2" />
    </button>
    <button
      v-if="variant === 'landscape'"
      class="banner-arrow banner-arrow-right"
      type="button"
      aria-label="Banner tiếp theo"
      @click="showBanner(1)"
    >
      <ChevronRight :size="18" :stroke-width="2" />
    </button>
    <div class="banner-dots" role="tablist" aria-label="Chọn banner">
      <button
        v-for="(_, index) in banners"
        :key="index"
        type="button"
        role="tab"
        :aria-label="`Chuyển đến banner ${index + 1}`"
        :aria-selected="index === activeBanner"
        class="banner-dot"
        :class="{ active: index === activeBanner }"
        @click="activeBanner = index"
      />
    </div>
  </div>
</template>

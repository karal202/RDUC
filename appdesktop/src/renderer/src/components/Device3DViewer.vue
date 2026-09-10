<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { Laptop, Monitor, Cpu, CircuitBoard, MemoryStick, Zap } from 'lucide-vue-next'

const props = defineProps({
  deviceType: { type: String, default: 'pc' },
  cpuName: { type: String, default: 'CPU' },
  gpuName: { type: String, default: 'GPU' },
  gpuVendor: { type: String, default: '' },
  ramTotalGB: { type: [String, Number], default: 0 },
  systemArch: { type: String, default: 'x64' },
  platform: { type: String, default: 'win32' }
})

const containerRef = ref(null)
const fallbackType = ref('')
const sceneReady = ref(false)
const errorState = ref('')

let scene = null
let camera = null
let renderer = null
let cpuLabelEl = null
let gpuLabelEl = null
let ramLabelEl = null
let labelRenderer = null
let frameId = null
let Three = null
let CSS2DRenderer = null
let CSS2DObject = null

const loadThree = async () => {
  try {
    const threeMod = await import('three')
    Three = threeMod
    try {
      const addons = await import('three/examples/jsm/renderers/CSS2DRenderer.js')
      CSS2DRenderer = addons.CSS2DRenderer
      CSS2DObject = addons.CSS2DObject
    } catch {
      CSS2DRenderer = null
      CSS2DObject = null
    }
    return true
  } catch (err) {
    console.warn('Three.js unavailable, falling back to card mode:', err)
    return false
  }
}

const makeLabel = (text, sub, colorClass) => {
  const wrap = document.createElement('div')
  wrap.className = `d3d-label d3d-label-${colorClass}`
  wrap.innerHTML = `
    <strong>${text}</strong>
    <small>${sub}</small>
  `
  wrap.style.cssText = `
    pointer-events: none;
    user-select: none;
    padding: 4px 10px 5px;
    border-radius: 10px;
    font-family: 'Be Vietnam Pro', 'Archivo', sans-serif;
    background: rgba(5, 10, 20, 0.88);
    border: 1px solid rgba(56, 189, 248, 0.4);
    box-shadow: 0 10px 30px -14px rgba(34, 211, 238, 0.5), inset 0 0 0 1px rgba(255,255,255,0.05);
    backdrop-filter: blur(6px);
    color: #e2e8f0;
    line-height: 1.2;
    white-space: nowrap;
  `
  wrap.querySelector('strong').style.cssText = `
    display: block;
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.4px;
    color: #fff;
  `
  wrap.querySelector('small').style.cssText = `
    display: block;
    font-size: 10px;
    margin-top: 1px;
    color: #94a3b8;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 600;
  `
  if (!CSS2DObject) return null
  const labelObj = new CSS2DObject(wrap)
  return labelObj
}

const initThreeScene = async () => {
  if (!containerRef.value || !Three) return
  const W = containerRef.value.clientWidth || 480
  const H = containerRef.value.clientHeight || 360

  scene = new Three.Scene()
  scene.background = null

  camera = new Three.PerspectiveCamera(45, W / H, 0.1, 200)
  camera.position.set(0, 2.2, 5)
  camera.lookAt(0, 0.3, 0)

  renderer = new Three.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(W, H)
  renderer.shadowMap.enabled = true
  renderer.outputColorSpace = Three.SRGBColorSpace
  renderer.toneMapping = Three.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1
  containerRef.value.appendChild(renderer.domElement)
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'
  renderer.domElement.style.display = 'block'

  if (CSS2DRenderer) {
    labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(W, H)
    const dom = labelRenderer.domElement
    dom.style.position = 'absolute'
    dom.style.top = '0'
    dom.style.left = '0'
    dom.style.pointerEvents = 'none'
    containerRef.value.appendChild(dom)
  }

  // Lights
  const amb = new Three.AmbientLight(0xffffff, 0.55)
  scene.add(amb)

  const keyLight = new Three.DirectionalLight(0x38bdf8, 1.1)
  keyLight.position.set(5, 8, 5)
  keyLight.castShadow = true
  scene.add(keyLight)

  const rimLight = new Three.DirectionalLight(0xa855f7, 0.9)
  rimLight.position.set(-6, 3, -5)
  scene.add(rimLight)

  const fillLight = new Three.PointLight(0xf59e0b, 0.8, 30)
  fillLight.position.set(0, 2, 6)
  scene.add(fillLight)

  // Ground plate (subtle)
  const groundGeo = new Three.CircleGeometry(5, 64)
  const groundMat = new Three.MeshStandardMaterial({
    color: 0x05060a,
    metalness: 0.6,
    roughness: 0.8,
    transparent: true,
    opacity: 0.7
  })
  const ground = new Three.Mesh(groundGeo, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -1.3
  ground.receiveShadow = true
  scene.add(ground)

  // Ground ring glow
  const ringGeo = new Three.RingGeometry(1.9, 2.1, 64)
  const ringMat = new Three.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.35,
    side: Three.DoubleSide
  })
  const ring = new Three.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = -1.29
  scene.add(ring)

  // Build device group (abstracted PC/Laptop shell)
  const isLaptop = props.deviceType === 'laptop'
  const group = new Three.Group()

  if (isLaptop) {
    // Laptop: base plate + screen plate
    const baseGeo = new Three.BoxGeometry(3.4, 0.18, 2.3)
    const baseMat = new Three.MeshStandardMaterial({
      color: 0x1a1d29,
      metalness: 0.75,
      roughness: 0.32
    })
    const base = new Three.Mesh(baseGeo, baseMat)
    base.position.y = -1.12
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)

    // Keyboard texture line
    const kbGeo = new Three.BoxGeometry(3, 0.02, 1.8)
    const kbMat = new Three.MeshStandardMaterial({
      color: 0x0a0b12,
      metalness: 0.3,
      roughness: 0.9
    })
    const kb = new Three.Mesh(kbGeo, kbMat)
    kb.position.y = -1.02
    kb.position.z = -0.05
    group.add(kb)

    // Screen back plate
    const screenGeo = new Three.BoxGeometry(3.4, 2.2, 0.12)
    const screenMat = new Three.MeshStandardMaterial({
      color: 0x1a1d29,
      metalness: 0.72,
      roughness: 0.3
    })
    const screen = new Three.Mesh(screenGeo, screenMat)
    screen.position.set(0, 0.25, -1.15)
    screen.rotation.x = -0.28
    screen.castShadow = true
    group.add(screen)

    // Screen face (glowing)
    const faceGeo = new Three.PlaneGeometry(3.1, 1.95)
    const faceCanvas = document.createElement('canvas')
    faceCanvas.width = 512
    faceCanvas.height = 320
    const fctx = faceCanvas.getContext('2d')
    const grad = fctx.createLinearGradient(0, 0, 512, 320)
    grad.addColorStop(0, '#0b1220')
    grad.addColorStop(0.4, '#0a2240')
    grad.addColorStop(1, '#170a33')
    fctx.fillStyle = grad
    fctx.fillRect(0, 0, 512, 320)
    // DAWA grid
    fctx.strokeStyle = 'rgba(56, 189, 248, 0.14)'
    fctx.lineWidth = 1
    for (let x = 0; x < 512; x += 32) {
      fctx.beginPath()
      fctx.moveTo(x, 0)
      fctx.lineTo(x, 320)
      fctx.stroke()
    }
    for (let y = 0; y < 320; y += 32) {
      fctx.beginPath()
      fctx.moveTo(0, y)
      fctx.lineTo(512, y)
      fctx.stroke()
    }
    // Logo
    fctx.font = "800 36px 'Be Vietnam Pro', sans-serif"
    fctx.textAlign = 'center'
    const logoGrad = fctx.createLinearGradient(200, 140, 312, 180)
    logoGrad.addColorStop(0, '#38bdf8')
    logoGrad.addColorStop(1, '#a855f7')
    fctx.fillStyle = logoGrad
    fctx.fillText('DAWA', 256, 180)
    fctx.font = "600 14px 'JetBrains Mono', monospace"
    fctx.fillStyle = 'rgba(148, 163, 184, 0.8)'
    fctx.fillText('SYSTEM OPTIMIZER', 256, 210)

    const faceTex = new Three.CanvasTexture(faceCanvas)
    faceTex.colorSpace = Three.SRGBColorSpace
    const faceMat = new Three.MeshBasicMaterial({ map: faceTex })
    const face = new Three.Mesh(faceGeo, faceMat)
    face.position.set(0, 0.25, -1.088)
    face.rotation.x = -0.28
    group.add(face)
  } else {
    // PC Tower: abstracted rectangular case
    const caseGeo = new Three.BoxGeometry(1.8, 3.2, 1.2)
    const caseMat = new Three.MeshStandardMaterial({
      color: 0x0f1118,
      metalness: 0.7,
      roughness: 0.35
    })
    const pcCase = new Three.Mesh(caseGeo, caseMat)
    pcCase.position.y = 0.3
    pcCase.castShadow = true
    pcCase.receiveShadow = true
    group.add(pcCase)

    // Glass side panel (glowing interior)
    const glassGeo = new Three.BoxGeometry(0.04, 3.1, 1.1)
    const glassMat = new Three.MeshPhysicalMaterial({
      color: 0x0c0a1a,
      metalness: 0.1,
      roughness: 0.05,
      transmission: 0.55,
      transparent: true,
      opacity: 0.9,
      clearcoat: 1,
      clearcoatRoughness: 0.2
    })
    const glass = new Three.Mesh(glassGeo, glassMat)
    glass.position.set(0.92, 0.3, 0)
    group.add(glass)

    // RGB fans inside
    for (let i = 0; i < 3; i++) {
      const fanGeo = new Three.CylinderGeometry(0.28, 0.28, 0.05, 32)
      const colors = [0x22d3ee, 0xa855f7, 0xf59e0b]
      const fanMat = new Three.MeshStandardMaterial({
        color: colors[i % 3],
        emissive: colors[i % 3],
        emissiveIntensity: 0.9,
        metalness: 0.6,
        roughness: 0.3
      })
      const fan = new Three.Mesh(fanGeo, fanMat)
      fan.rotation.x = Math.PI / 2
      fan.position.set(0.4, 0.9 - i * 1.05, 0)
      fan.userData.spin = Math.random() * 0.1 + 0.04
      group.add(fan)
    }

    // Accent strip on front
    const stripGeo = new Three.BoxGeometry(1.76, 0.08, 0.02)
    const stripMat = new Three.MeshBasicMaterial({ color: 0x22d3ee })
    const strip = new Three.Mesh(stripGeo, stripMat)
    strip.position.set(0, -1.18, 0.6)
    group.add(strip)
  }

  scene.add(group)

  // ======= 3D COMPONENT MARKERS =======
  // CPU marker (glowing cube)
  const cpuMarkerGeo = new Three.IcosahedronGeometry(0.22, 0)
  const cpuMarkerMat = new Three.MeshStandardMaterial({
    color: 0x1677ff,
    emissive: 0x1677ff,
    emissiveIntensity: 0.8,
    metalness: 0.4,
    roughness: 0.25
  })
  const cpuMarker = new Three.Mesh(cpuMarkerGeo, cpuMarkerMat)
  if (isLaptop) {
    cpuMarker.position.set(-0.5, -0.95, 0.3)
  } else {
    cpuMarker.position.set(-0.2, 1.0, 0.2)
  }
  cpuMarker.userData.pulse = 0
  group.add(cpuMarker)

  // GPU marker
  const gpuMarkerGeo = new Three.IcosahedronGeometry(0.22, 0)
  const gpuMarkerMat = new Three.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 0.8,
    metalness: 0.4,
    roughness: 0.25
  })
  const gpuMarker = new Three.Mesh(gpuMarkerGeo, gpuMarkerMat)
  if (isLaptop) {
    gpuMarker.position.set(0.6, -0.95, 0.1)
  } else {
    gpuMarker.position.set(-0.2, 0.3, 0.2)
  }
  gpuMarker.userData.pulse = 1
  group.add(gpuMarker)

  // RAM marker
  const ramMarkerGeo = new Three.IcosahedronGeometry(0.2, 0)
  const ramMarkerMat = new Three.MeshStandardMaterial({
    color: 0xa855f7,
    emissive: 0xa855f7,
    emissiveIntensity: 0.8,
    metalness: 0.4,
    roughness: 0.25
  })
  const ramMarker = new Three.Mesh(ramMarkerGeo, ramMarkerMat)
  if (isLaptop) {
    ramMarker.position.set(0.9, -0.95, 0.6)
  } else {
    ramMarker.position.set(-0.2, 1.5, 0.2)
  }
  ramMarker.userData.pulse = 2
  group.add(ramMarker)

  // Floating labels using CSS2DRenderer if available
  if (CSS2DObject) {
    cpuLabelEl = makeLabel('CPU', (props.cpuName || '').slice(0, 18), 'cpu')
    if (cpuLabelEl) {
      cpuLabelEl.position.copy(cpuMarker.position)
      cpuLabelEl.position.y += 0.45
      cpuLabelEl.position.x -= 0.2
      group.add(cpuLabelEl)
    }
    gpuLabelEl = makeLabel('GPU', (props.gpuName || '').slice(0, 18), 'gpu')
    if (gpuLabelEl) {
      gpuLabelEl.position.copy(gpuMarker.position)
      gpuLabelEl.position.y += 0.45
      gpuLabelEl.position.x += 0.2
      group.add(gpuLabelEl)
    }
    const ramText = props.ramTotalGB ? `${props.ramTotalGB} GB` : 'RAM'
    ramLabelEl = makeLabel('RAM', ramText, 'ram')
    if (ramLabelEl) {
      ramLabelEl.position.copy(ramMarker.position)
      ramLabelEl.position.y += 0.45
      group.add(ramLabelEl)
    }
  }

  // Interaction: track mouse for manual orbit
  let isDragging = false
  let lastX = 0
  let lastY = 0
  let rotY = isLaptop ? 0.5 : 0.3
  let rotX = isLaptop ? -0.1 : -0.15
  let targetRotY = rotY
  let targetRotX = rotX
  let zoomZ = 5
  let targetZoomZ = 5

  const onDown = (e) => {
    isDragging = true
    lastX = e.clientX || (e.touches && e.touches[0].clientX) || 0
    lastY = e.clientY || (e.touches && e.touches[0].clientY) || 0
  }
  const onUp = () => {
    isDragging = false
  }
  const onMove = (e) => {
    if (!isDragging) return
    const cx = e.clientX || (e.touches && e.touches[0].clientX) || 0
    const cy = e.clientY || (e.touches && e.touches[0].clientY) || 0
    const dx = cx - lastX
    const dy = cy - lastY
    lastX = cx
    lastY = cy
    targetRotY += dx * 0.008
    targetRotX += dy * 0.006
    targetRotX = Math.max(-0.9, Math.min(0.9, targetRotX))
  }
  const onWheel = (e) => {
    e.preventDefault()
    targetZoomZ += e.deltaY * 0.004
    targetZoomZ = Math.max(3.2, Math.min(8.5, targetZoomZ))
  }

  const dom = renderer.domElement
  dom.style.cursor = 'grab'
  dom.addEventListener('pointerdown', onDown)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointermove', onMove)
  dom.addEventListener('wheel', onWheel, { passive: false })

  // Animation loop
  const clock = new Three.Clock()
  const animate = () => {
    frameId = requestAnimationFrame(animate)
    const dt = clock.getDelta()
    const t = clock.getElapsedTime()

    // Auto-idle rotation
    if (!isDragging) {
      targetRotY += dt * 0.12
    }
    rotY += (targetRotY - rotY) * 0.08
    rotX += (targetRotX - rotX) * 0.08
    zoomZ += (targetZoomZ - zoomZ) * 0.1

    if (group) {
      group.rotation.y = rotY
      group.rotation.x = rotX
      // Float
      group.position.y = Math.sin(t * 0.9) * 0.07 - 0.1
    }

    // Camera zoom
    camera.position.z += (zoomZ - camera.position.z) * 0.1

    // Pulse markers
    const markers = [cpuMarker, gpuMarker, ramMarker]
    markers.forEach((m) => {
      const p = t * 2.4 + (m.userData.pulse || 0)
      const s = 1 + Math.sin(p) * 0.14
      m.scale.set(s, s, s)
    })

    // Spin PC fans
    if (!isLaptop) {
      group.children.forEach((c) => {
        if (c.userData && c.userData.spin) {
          c.rotation.z += c.userData.spin
        }
      })
    }

    camera.lookAt(0, 0.2, 0)
    renderer.render(scene, camera)
    if (labelRenderer) labelRenderer.render(scene, camera)
  }
  animate()

  // Resize handling
  const handleResize = () => {
    if (!containerRef.value || !camera || !renderer) return
    const w = containerRef.value.clientWidth || 1
    const h = containerRef.value.clientHeight || 1
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    if (labelRenderer) labelRenderer.setSize(w, h)
  }
  const ro = new ResizeObserver(handleResize)
  ro.observe(containerRef.value)
  window.addEventListener('resize', handleResize)

  // Cleanup storage
  containerRef.value._d3dCleanup = () => {
    cancelAnimationFrame(frameId)
    ro.disconnect()
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointermove', onMove)
    dom.removeEventListener('pointerdown', onDown)
    dom.removeEventListener('wheel', onWheel)
    if (scene)
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose && obj.geometry.dispose()
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((m) => m.dispose && m.dispose())
        }
      })
    if (renderer) {
      renderer.dispose()
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
    }
    if (labelRenderer && labelRenderer.domElement && labelRenderer.domElement.parentNode) {
      labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement)
    }
    scene = null
    camera = null
    renderer = null
  }

  sceneReady.value = true
}

// Public API called by parent DashboardTab
const setFallbackDetected = (type) => {
  fallbackType.value = type || ''
}

defineExpose({ setFallbackDetected })

onMounted(async () => {
  const hasThree = await loadThree()
  if (hasThree && containerRef.value) {
    try {
      await initThreeScene()
    } catch (err) {
      console.warn('3D scene failed to init, fallback card mode:', err)
      errorState.value = 'init-failed'
    }
  } else {
    errorState.value = 'three-unavailable'
  }
})

onBeforeUnmount(() => {
  if (containerRef.value && containerRef.value._d3dCleanup) {
    try {
      containerRef.value._d3dCleanup()
    } catch {
      void 0
    }
  }
})

const isLaptop = computed(() => props.deviceType === 'laptop')
</script>

<template>
  <div class="device-viewer-root" :class="{ 'is-laptop': isLaptop }">
    <!-- 3D Canvas mount -->
    <div ref="containerRef" class="device-viewer-canvas" aria-hidden="true"></div>

    <!-- Overlay: subtle corner HUD -->
    <div class="device-viewer-hud">
      <div class="dvh-left">
        <div class="dvh-chip" :class="isLaptop ? 'chip-laptop' : 'chip-pc'">
          <Laptop v-if="isLaptop" :size="12" />
          <Monitor v-else :size="12" />
          {{ isLaptop ? 'LAPTOP DETECTED' : 'PC DESKTOP' }}
        </div>
        <div v-if="fallbackType === 'battery'" class="dvh-chip dvh-info">
          <Zap :size="12" /> Pin được nhận diện
        </div>
        <div v-else-if="fallbackType === 'no-battery'" class="dvh-chip dvh-warn">
          <Monitor :size="12" /> Không có Pin (PC)
        </div>
      </div>
      <div class="dvh-right">
        <div class="dvh-spec">
          <Cpu :size="12" />
          <span>CPU</span>
        </div>
        <div class="dvh-spec">
          <CircuitBoard :size="12" />
          <span>GPU</span>
        </div>
        <div class="dvh-spec">
          <MemoryStick :size="12" />
          <span>RAM</span>
        </div>
      </div>
    </div>

    <!-- Fallback card view if 3D not loaded -->
    <div v-if="!sceneReady || errorState" class="device-viewer-fallback">
      <div class="dvf-inner" :class="isLaptop ? 'dvf-laptop' : 'dvf-pc'">
        <div class="dvf-icon">
          <Laptop v-if="isLaptop" :size="52" :stroke-width="1.5" />
          <Monitor v-else :size="52" :stroke-width="1.5" />
        </div>
        <div class="dvf-title">
          {{ isLaptop ? 'Laptop của bạn' : 'PC Desktop' }}
        </div>
        <div class="dvf-specs">
          <div class="dvf-row">
            <Cpu :size="14" />
            <span>{{ cpuName }}</span>
          </div>
          <div class="dvf-row">
            <CircuitBoard :size="14" />
            <span>{{ gpuName }}</span>
          </div>
          <div class="dvf-row">
            <MemoryStick :size="14" />
            <span>RAM {{ ramTotalGB }} GB · {{ systemArch }}</span>
          </div>
        </div>
        <div v-if="!sceneReady && !errorState" class="dvf-loader">
          <span class="dvf-spinner"></span>
          Đang khởi tạo 3D...
        </div>
        <div v-else-if="errorState" class="dvf-note">
          3D Viewer không khả dụng. Chế độ card hiển thị bên trên.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.device-viewer-root {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 200px;
  overflow: hidden;
  border-radius: 12px;
  background:
    radial-gradient(ellipse at 50% 20%, rgba(34, 211, 238, 0.14), transparent 55%),
    radial-gradient(ellipse at 0% 100%, rgba(168, 85, 247, 0.12), transparent 50%),
    linear-gradient(180deg, #070a13 0%, #030408 100%);
}
.device-viewer-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
.device-viewer-hud {
  position: absolute;
  inset: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;
  z-index: 3;
}
.dvh-left,
.dvh-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.dvh-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 5px;
  border-radius: 999px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(8, 10, 18, 0.72);
  backdrop-filter: blur(8px);
  color: #cbd5e1;
}
.chip-laptop {
  border-color: rgba(56, 189, 248, 0.35);
  color: #7dd3fc;
  box-shadow: 0 6px 20px -12px rgba(34, 211, 238, 0.6);
}
.chip-pc {
  border-color: rgba(168, 85, 247, 0.35);
  color: #c4b5fd;
  box-shadow: 0 6px 20px -12px rgba(168, 85, 247, 0.6);
}
.dvh-info {
  color: #86efac;
  border-color: rgba(34, 197, 94, 0.3);
}
.dvh-warn {
  color: #fde68a;
  border-color: rgba(251, 191, 36, 0.3);
}
.dvh-spec {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px 5px;
  border-radius: 8px;
  font-family: 'Be Vietnam Pro', sans-serif;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: #64748b;
  background: rgba(8, 10, 18, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.device-viewer-fallback {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(5, 6, 12, 0.85);
  backdrop-filter: blur(4px);
}
.dvf-inner {
  width: 100%;
  max-width: 420px;
  padding: 18px 18px 16px;
  border-radius: 14px;
  border: 1px solid rgba(48, 54, 74, 0.9);
  background: linear-gradient(180deg, rgba(14, 16, 24, 0.96), rgba(8, 9, 14, 0.98));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  box-shadow:
    0 20px 60px -30px rgba(0, 0, 0, 0.8),
    inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}
.dvf-icon {
  width: 84px;
  height: 84px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
  color: #fff;
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    0 16px 36px -18px rgba(34, 211, 238, 0.55);
}
.dvf-laptop .dvf-icon {
  background:
    radial-gradient(160% 120% at 30% 0%, rgba(56, 189, 248, 0.45), transparent 60%),
    linear-gradient(135deg, #0e7490, #082f49);
}
.dvf-pc .dvf-icon {
  background:
    radial-gradient(160% 120% at 30% 0%, rgba(168, 85, 247, 0.45), transparent 60%),
    linear-gradient(135deg, #6d28d9, #3b0764);
}
.dvf-title {
  font-family: 'Be Vietnam Pro', sans-serif;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 0.3px;
}
.dvf-specs {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid rgba(48, 54, 74, 0.9);
}
.dvf-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(48, 54, 74, 0.55);
  color: #94a3b8;
  font-size: 11.5px;
  font-weight: 600;
}
.dvf-row svg {
  color: #38bdf8;
  flex-shrink: 0;
}
.dvf-row span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dvf-loader,
.dvf-note {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding: 6px 10px 7px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.3px;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(71, 85, 105, 0.5);
}
.dvf-spinner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-top-color: #38bdf8;
  animation: dvf-spin 0.9s linear infinite;
  display: inline-block;
}
@keyframes dvf-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

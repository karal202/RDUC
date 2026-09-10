import si from 'systeminformation'

export function formatGpuVram(memoryTotal) {
  if (!memoryTotal || Number(memoryTotal) <= 0) return 'N/A'
  const gb = Number(memoryTotal) / (1024 * 1024 * 1024)
  return `${gb >= 1 ? gb.toFixed(1).replace(/\.0$/, '') : '<1'} GB`
}

export function isLikelyIntegratedGpu(controller = {}) {
  const combined = `${controller.vendor || ''} ${controller.model || ''}`.toLowerCase()
  return /(intel.*(uhd|iris|arc)|amd.*(radeon|vega)|integrated|onboard|i gpu)/i.test(combined)
}

export function isLikelyDiscreteGpu(controller = {}) {
  const combined = `${controller.vendor || ''} ${controller.model || ''}`.toLowerCase()
  const memoryTotal = Number(controller.memoryTotal || 0)
  const isDedicatedByModel =
    /(nvidia|geforce|quadro|rtx|gtx|tesla|amd|ati|radeon|rx|vga|graphics)/i.test(combined)
  return (
    (memoryTotal > 512 * 1024 * 1024 && !isLikelyIntegratedGpu(controller)) ||
    (isDedicatedByModel && !isLikelyIntegratedGpu(controller))
  )
}

export function getDiscreteGpuController(graphics) {
  const controllers = Array.isArray(graphics?.controllers) ? graphics.controllers : []
  const dedicated = controllers.filter((controller) => isLikelyDiscreteGpu(controller))
  if (dedicated.length > 0) return dedicated[0]
  return (
    controllers.find((controller) => !isLikelyIntegratedGpu(controller)) || controllers[0] || null
  )
}

let staticCache = null
let deviceTypeCache = null

function detectDeviceTypeByChassisOrBattery(chassis, battery) {
  if (chassis) {
    const t = String(chassis.type || chassis.chassis || '').toLowerCase()
    if (/(laptop|notebook|convertible|handset|dock|subnotebook|netbook|ultrabook)/i.test(t))
      return 'laptop'
    if (/(desktop|tower|space|allinone|expansionchassis|server|mini-pc|minipc|sff)/i.test(t))
      return 'pc'
    if (chassis.type === 'Laptop' || chassis.type === 'Notebook' || chassis.type === 'Convertible')
      return 'laptop'
    if (chassis.type === 'Desktop' || chassis.type === 'Tower') return 'pc'
  }
  if (battery) {
    const dc = Number(battery.designCapacity || 0)
    const hasCharge = Number(battery.percent || battery.currentCapacity || 0) > 0 || dc > 0
    if (hasCharge || battery.hasBattery === true || dc >= 4000) return 'laptop'
  }
  return 'pc'
}

export async function detectDeviceType() {
  if (deviceTypeCache) return deviceTypeCache
  try {
    const [chassis, battery] = await Promise.all([
      Promise.resolve()
        .then(() => si.chassis?.())
        .catch(() => null),
      Promise.resolve()
        .then(() => si.battery?.())
        .catch(() => null)
    ])
    deviceTypeCache = detectDeviceTypeByChassisOrBattery(chassis, battery)
  } catch (err) {
    console.warn('Detect device type failed, fallback to pc:', err?.message || err)
    deviceTypeCache = 'pc'
  }
  return deviceTypeCache
}

export async function getStaticInfo() {
  if (staticCache) return staticCache
  const [cpu, graphics] = await Promise.all([si.cpu(), si.graphics()])
  const discreteGpu = getDiscreteGpuController(graphics) || graphics.controllers[0] || {}
  staticCache = {
    cpu: { manufacturer: cpu.manufacturer, brand: cpu.brand, speed: cpu.speed, cores: cpu.cores },
    gpu: {
      model: discreteGpu.model || 'Card màn hình',
      vendor: discreteGpu.vendor || 'N/A',
      vram: formatGpuVram(discreteGpu.memoryTotal),
      hasDiscreteGpu: isLikelyDiscreteGpu(discreteGpu)
    }
  }
  return staticCache
}

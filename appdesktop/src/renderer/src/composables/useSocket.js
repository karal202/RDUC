import { ref, onMounted, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 'https://rduc.onrender.com'

// Singleton socket — dùng chung toàn app
let _socket = null
let _refCount = 0

function getSocket(accessToken) {
  if (!_socket || _socket.disconnected) {
    _socket = io(SOCKET_URL, {
      transports: ['websocket'],
      auth: { token: accessToken },
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
    })
  }
  return _socket
}

/**
 * useSocket() — composable dùng trong bất kỳ component Vue nào.
 *
 * @param {Object} handlers - map sự kiện { eventName: callback }
 * @returns {{ connected: Ref<boolean>, socket: Socket }}
 *
 * Ví dụ:
 *   const { connected } = useSocket({
 *     license_updated: () => reloadData(),
 *     license_revoked: ({ keyCode }) => handleRevoke(keyCode),
 *   })
 */
export function useSocket(handlers = {}) {
  const connected = ref(false)
  let socket = null
  _refCount++

  const onConnect = () => { connected.value = true }
  const onDisconnect = () => { connected.value = false }
  const registeredHandlers = {}

  onMounted(async () => {
    const accessToken = await window.api?.getAccessToken?.()
    socket = getSocket(accessToken)
    connected.value = socket.connected
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    for (const [event, fn] of Object.entries(handlers)) {
      registeredHandlers[event] = fn
      socket.on(event, fn)
    }
  })

  onUnmounted(() => {
    if (!socket) return
    socket.off('connect', onConnect)
    socket.off('disconnect', onDisconnect)

    for (const [event, fn] of Object.entries(registeredHandlers)) {
      socket.off(event, fn)
    }

    _refCount--
    // Disconnect socket khi không còn component nào dùng
    if (_refCount <= 0) {
      _socket?.disconnect()
      _socket = null
      _refCount = 0
    }
  })

  return { connected, socket }
}

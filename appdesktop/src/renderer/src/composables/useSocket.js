import { ref, onUnmounted } from 'vue'
import { io } from 'socket.io-client'

const SOCKET_URL = 'http://localhost:3069'

// Singleton socket — dùng chung toàn app
let _socket = null
let _refCount = 0

function getSocket() {
  if (!_socket || _socket.disconnected) {
    _socket = io(SOCKET_URL, {
      transports: ['websocket'],
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
  const socket = getSocket()
  _refCount++

  // Sync initial state
  connected.value = socket.connected

  const onConnect = () => { connected.value = true }
  const onDisconnect = () => { connected.value = false }

  socket.on('connect', onConnect)
  socket.on('disconnect', onDisconnect)

  // Register user-defined handlers
  const registeredHandlers = {}
  for (const [event, fn] of Object.entries(handlers)) {
    registeredHandlers[event] = fn
    socket.on(event, fn)
  }

  onUnmounted(() => {
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

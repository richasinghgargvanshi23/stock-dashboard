// src/hooks/useWebSocket.js
import { useEffect, useRef, useState, useCallback } from 'react'

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function useWebSocket(ticker) {
  const [data, setData]       = useState(null)
  const [status, setStatus]   = useState('connecting') // connecting | open | closed | error
  const wsRef                 = useRef(null)
  const reconnectTimer        = useRef(null)
  const mountedRef            = useRef(true)

  const connect = useCallback(() => {
    if (!ticker || !mountedRef.current) return

    setStatus('connecting')
    const ws = new WebSocket(`${WS_BASE}/ws/${ticker}`)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      setStatus('open')
    }

    ws.onmessage = (e) => {
      if (!mountedRef.current) return
      try {
        const payload = JSON.parse(e.data)
        if (!payload.error) setData(payload)
      } catch (_) {}
    }

    ws.onerror = () => {
      if (!mountedRef.current) return
      setStatus('error')
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setStatus('closed')
      // Auto-reconnect after 5 s
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current) connect()
      }, 5000)
    }
  }, [ticker])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  return { data, status }
}

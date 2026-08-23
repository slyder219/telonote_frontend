import { useCallback, useRef, useState } from 'react'
import { pickSupportedMimeType } from './audioUtils'

export type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'error'

export interface RecordingResult {
  blob: Blob
  mimeType: string
  durationMs: number
}

function describeMicError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      return 'Microphone access was denied. Allow microphone access in your browser settings and try again.'
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return 'No microphone was found on this device.'
    }
    if (error.name === 'NotReadableError') {
      return 'Your microphone is already in use by another app.'
    }
  }
  return 'Could not access the microphone. Please try again.'
}

export function useVoiceRecorder() {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)

  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const tickRef = useRef<number | null>(null)

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const stopTicker = () => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current)
      tickRef.current = null
    }
  }

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setStatus('error')
      setError("Recording isn't supported in this browser.")
      return
    }

    setStatus('requesting')
    setError(null)

    try {
      // Requesting inside the click handler (before any await resolves further
      // down) keeps this tied to the user gesture, which iOS Safari requires.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = pickSupportedMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      recorderRef.current = recorder
      recorder.start()
      startedAtRef.current = Date.now()
      setElapsedMs(0)
      tickRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current)
      }, 200)
      setStatus('recording')
    } catch (err) {
      releaseStream()
      setStatus('error')
      setError(describeMicError(err))
    }
  }, [])

  const stop = useCallback((): Promise<RecordingResult | null> => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return Promise.resolve(null)

    return new Promise((resolve) => {
      recorder.onstop = () => {
        stopTicker()
        const durationMs = Date.now() - startedAtRef.current
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        releaseStream()
        recorderRef.current = null
        setStatus('idle')
        resolve(blob.size > 0 ? { blob, mimeType, durationMs } : null)
      }
      recorder.stop()
    })
  }, [])

  const cancel = useCallback(() => {
    const recorder = recorderRef.current
    stopTicker()
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      recorder.stop()
    }
    releaseStream()
    recorderRef.current = null
    chunksRef.current = []
    setStatus('idle')
    setElapsedMs(0)
  }, [])

  const dismissError = useCallback(() => {
    setStatus('idle')
    setError(null)
  }, [])

  return { status, error, elapsedMs, start, stop, cancel, dismissError }
}

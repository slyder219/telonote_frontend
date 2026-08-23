/**
 * Chrome/Firefox report `duration: Infinity` for a MediaRecorder-produced
 * WebM blob until something forces a seek near the end — WebM (being a
 * streaming-oriented container) doesn't carry duration in its header the
 * way a finalized mp3/mp4 does. Standard workaround: seek far past the end,
 * which forces the browser to resolve the real duration, then reset to 0.
 */
export function resolveDuration(audio: HTMLAudioElement): Promise<number> {
  if (Number.isFinite(audio.duration)) return Promise.resolve(audio.duration)

  return new Promise((resolve) => {
    const onTimeUpdate = () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.currentTime = 0
      resolve(Number.isFinite(audio.duration) ? audio.duration : 0)
    }
    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.currentTime = 1e101
  })
}

/** Best-effort duration probe for a file/blob that isn't mounted in an <audio> element yet. */
export function probeDurationMs(blob: Blob, timeoutMs = 4000): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio()
    let settled = false

    const finish = (ms: number) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      URL.revokeObjectURL(url)
      resolve(ms)
    }

    const timer = setTimeout(() => finish(0), timeoutMs)

    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      resolveDuration(audio).then((seconds) => finish(seconds * 1000))
    }
    audio.onerror = () => finish(0)
    audio.src = url
  })
}

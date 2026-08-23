import { useEffect, useState } from 'react'
import type { ChangeEvent, RefObject } from 'react'
import { formatDuration } from './format'

interface AudioScrubberProps {
  audioRef: RefObject<HTMLAudioElement | null>
}

export default function AudioScrubber({ audioRef }: AudioScrubberProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    const onEnded = () => setCurrentTime(0)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    if (Number.isFinite(audio.duration)) setDuration(audio.duration)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audioRef])

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current
    if (!audio) return
    const value = Number(event.target.value)
    audio.currentTime = value
    setCurrentTime(value)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-ink-soft">
        {formatDuration(currentTime * 1000)}
      </span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={currentTime}
        onChange={handleSeek}
        aria-label="Seek"
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-brand-500"
        style={{
          background: `linear-gradient(to right, var(--color-brand-500) ${progress}%, var(--color-border) ${progress}%)`,
        }}
      />
      <span className="w-9 shrink-0 text-xs tabular-nums text-ink-soft">{formatDuration(duration * 1000)}</span>
    </div>
  )
}

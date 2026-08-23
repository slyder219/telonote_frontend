import { pickSupportedMimeType } from './audioUtils'

// Voice doesn't benefit from music-grade bitrates — a low bitrate keeps
// files small (more headroom under the 24MB/quota caps) with no real
// transcription-quality loss for speech.
const LOW_BITRATE_BPS = 24_000

export interface TranscodeResult {
  blob: Blob
  mimeType: string
  durationMs: number
}

/**
 * Re-encodes a picked audio file (uncompressed, or compressed but oversized)
 * into a low-bitrate compressed format the backend accepts, so the user
 * doesn't have to manually convert a file they already own before uploading.
 *
 * There's no WASM encoder here, so this uses the only re-encode path the
 * browser gives us natively: decode to an AudioBuffer, play it through a
 * MediaStreamDestination, and capture that stream with MediaRecorder. That
 * means this runs in real time — roughly as long as the audio's own
 * duration — since MediaRecorder only captures a live stream.
 */
export async function transcodeToCompressed(file: File): Promise<TranscodeResult> {
  if (typeof AudioContext === 'undefined' || typeof MediaRecorder === 'undefined') {
    throw new Error("This browser can't compress audio automatically.")
  }
  const mimeType = pickSupportedMimeType()
  if (!mimeType) {
    throw new Error("This browser can't produce a supported audio format.")
  }

  const arrayBuffer = await file.arrayBuffer()
  const audioCtx = new AudioContext()
  try {
    let audioBuffer: AudioBuffer
    try {
      audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
    } catch {
      throw new Error("Couldn't read that audio file.")
    }
    // Needed in browsers that suspend a freshly created context until it's
    // resumed within a user gesture — the file-picker's change event counts.
    await audioCtx.resume()

    const destination = audioCtx.createMediaStreamDestination()
    const source = audioCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(destination)

    const recorder = new MediaRecorder(destination.stream, { mimeType, audioBitsPerSecond: LOW_BITRATE_BPS })
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
      recorder.onerror = () => reject(new Error('Compression failed.'))
      source.onended = () => recorder.stop()
      recorder.start()
      source.start()
    })

    return { blob, mimeType, durationMs: audioBuffer.duration * 1000 }
  } finally {
    await audioCtx.close()
  }
}

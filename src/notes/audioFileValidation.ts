// Mirrors API.md's accepted list: mp3, m4a/aac, ogg, webm, opus, 3gp, amr, mp4.
// Uncompressed formats are explicitly rejected there too.
const ACCEPTED_EXTENSIONS = ['mp3', 'm4a', 'aac', 'ogg', 'webm', 'opus', '3gp', 'amr', 'mp4']
const REJECTED_EXTENSIONS = ['wav', 'aiff', 'aif', 'flac', 'pcm']

// Hard ceiling from OpenAI's transcription API (25MB) — see API.md.
export const MAX_AUDIO_BYTES = 24 * 1024 * 1024

export function extensionOf(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename)
  return match ? match[1].toLowerCase() : ''
}

export type UploadClassification = 'ok' | 'uncompressed' | 'oversized-compressed' | 'unsupported'

/**
 * Classifies a picked file for upload. 'uncompressed' and 'oversized-compressed'
 * are both cases the caller can try to fix by transcoding client-side before
 * falling back to the plain rejection message in validateAudioFile.
 */
export function classifyForUpload(file: File): UploadClassification {
  const ext = extensionOf(file.name)

  if (REJECTED_EXTENSIONS.includes(ext)) return 'uncompressed'

  const isRecognized =
    ACCEPTED_EXTENSIONS.includes(ext) ||
    // No recognizable extension — fall back to a loose MIME check (some
    // containers like 3gp/mp4 report as video/* even for audio-only content).
    (!ext && Boolean(file.type) && (file.type.startsWith('audio/') || file.type.startsWith('video/')))
  if (!isRecognized) return 'unsupported'

  return file.size > MAX_AUDIO_BYTES ? 'oversized-compressed' : 'ok'
}

/** Returns an error message if the file should be rejected, or null if it looks fine to upload. */
export function validateAudioFile(file: File): string | null {
  const classification = classifyForUpload(file)
  const ext = extensionOf(file.name)

  switch (classification) {
    case 'ok':
      return null
    case 'uncompressed':
      return `.${ext} files are uncompressed and aren't supported — try mp3, m4a, or ogg instead.`
    case 'oversized-compressed':
      return `That file is ${(file.size / (1024 * 1024)).toFixed(1)}MB — the limit is 24MB.`
    case 'unsupported':
      return ext ? `".${ext}" isn't a supported audio format.` : "That doesn't look like an audio file."
  }
}

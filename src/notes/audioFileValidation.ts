// Mirrors API.md's accepted list: mp3, m4a/aac, ogg, webm, opus, 3gp, amr, mp4.
// Uncompressed formats are explicitly rejected there too.
const ACCEPTED_EXTENSIONS = ['mp3', 'm4a', 'aac', 'ogg', 'webm', 'opus', '3gp', 'amr', 'mp4']
const REJECTED_EXTENSIONS = ['wav', 'aiff', 'aif', 'flac', 'pcm']

function extensionOf(filename: string): string {
  const match = /\.([a-z0-9]+)$/i.exec(filename)
  return match ? match[1].toLowerCase() : ''
}

/** Returns an error message if the file should be rejected, or null if it looks fine to upload. */
export function validateAudioFile(file: File): string | null {
  const ext = extensionOf(file.name)

  if (REJECTED_EXTENSIONS.includes(ext)) {
    return `.${ext} files are uncompressed and aren't supported — try mp3, m4a, or ogg instead.`
  }
  if (ext) {
    return ACCEPTED_EXTENSIONS.includes(ext) ? null : `".${ext}" isn't a supported audio format.`
  }
  // No recognizable extension — fall back to a loose MIME check (some
  // containers like 3gp/mp4 report as video/* even for audio-only content).
  if (file.type && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) return null
  return "That doesn't look like an audio file."
}

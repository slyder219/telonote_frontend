import { usePageMeta } from '../hooks/usePageMeta'
import { useNotes } from '../notes/useNotes'
import RecordButton from '../notes/RecordButton'
import NoteCard from '../notes/NoteCard'
import Banner from '../components/Banner'

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-border bg-surface p-4">
      <div className="h-3 w-24 rounded bg-border" />
      <div className="mt-4 h-3 w-full rounded bg-border" />
      <div className="mt-2 h-3 w-2/3 rounded bg-border" />
    </div>
  )
}

export default function Dashboard() {
  usePageMeta('Dashboard — Telonote', { noindex: true })
  const {
    notes,
    isLoadingInitial,
    loadError,
    bannerMessage,
    dismissBanner,
    uploadRecording,
    retryUpload,
    discardUpload,
    editTranscript,
    deleteNoteById,
    fetchAudioUrl,
  } = useNotes()

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 pb-16 sm:px-6">
      <RecordButton onComplete={uploadRecording} />

      {bannerMessage && (
        <div className="mb-4">
          <Banner message={bannerMessage} onDismiss={dismissBanner} />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {isLoadingInitial ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-4 text-center text-sm text-red-500">
            {loadError}
          </div>
        ) : notes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-ink-soft">
            No notes yet. Tap record to make your first one.
          </div>
        ) : (
          notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={editTranscript}
              onDelete={deleteNoteById}
              onRetryUpload={retryUpload}
              onDiscardUpload={discardUpload}
              onRequestAudio={fetchAudioUrl}
            />
          ))
        )}
      </div>
    </div>
  )
}

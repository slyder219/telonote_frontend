import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import * as passkeysApi from '../api/passkeys'
import type { Passkey, PreparedRegistration } from '../api/passkeys'
import { ApiError, NetworkError } from '../api/client'
import { useAuthenticatedRequest } from '../auth/useAuthenticatedRequest'
import Button from '../components/Button'
import TextField from '../components/TextField'

// Options are valid for 5 minutes on the server; refetch a little before that.
const OPTIONS_MAX_AGE_MS = 4 * 60 * 1000

function errorMessage(error: unknown): string {
  return error instanceof ApiError || error instanceof NetworkError
    ? error.message
    : 'Something went wrong. Please try again.'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

// Add, see and remove the passkeys on this account. Signing in with one comes later.
export default function PasskeysCard() {
  const callWithAuthRetry = useAuthenticatedRequest()
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [prepared, setPrepared] = useState<PreparedRegistration | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const startedLoading = useRef(false)
  const supported = passkeysApi.passkeysSupported()

  const load = () =>
    callWithAuthRetry((token) => passkeysApi.listPasskeys(token))
      .then(setPasskeys)
      .catch(() => setError("Couldn't load your passkeys. Refresh to try again."))

  useEffect(() => {
    if (startedLoading.current) return
    startedLoading.current = true
    callWithAuthRetry((token) => passkeysApi.listPasskeys(token))
      .then(setPasskeys)
      .catch(() => setError("Couldn't load your passkeys. Refresh to try again."))
  }, [callWithAuthRetry])

  // Fetch options as soon as the form opens, so the Create click can open the browser prompt directly
  // (Safari only allows it straight from a click, not after a network round trip).
  const prepare = async () => {
    setError('')
    try {
      setPrepared(await callWithAuthRetry((token) => passkeysApi.prepareRegistration(token)))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const startAdding = () => {
    setAdding(true)
    setSuccessMessage('')
    setPrepared(null)
    void prepare()
  }

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault()
    if (!prepared) return
    if (Date.now() - prepared.fetchedAt > OPTIONS_MAX_AGE_MS) {
      setError('That took a while — press Create passkey again.')
      setPrepared(null)
      void prepare()
      return
    }
    setError('')
    setBusy(true)
    try {
      const credential = await passkeysApi.createCredential(prepared)
      if (!credential) {
        // Dismissed: the options were used up, so get fresh ones for another try.
        setPrepared(null)
        void prepare()
        return
      }
      await callWithAuthRetry((token) =>
        passkeysApi.verifyRegistration(prepared.challengeId, credential, name.trim() || null, token),
      )
      setAdding(false)
      setName('')
      setPrepared(null)
      setSuccessMessage('Passkey added.')
      await load()
    } catch (err) {
      setError(errorMessage(err))
      setPrepared(null)
      void prepare()
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    setError('')
    setSuccessMessage('')
    setBusy(true)
    try {
      await callWithAuthRetry((token) => passkeysApi.deletePasskey(id, token))
      setConfirmingRemove(null)
      await load()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-base font-semibold text-ink">Passkeys</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Sign in with Face ID, Touch ID or your device passcode instead of a password. Passkeys sync through your
        password manager, like iCloud Keychain.
      </p>

      {!supported ? (
        <p className="mt-4 text-sm text-ink-soft">This browser doesn't support passkeys.</p>
      ) : (
        <>
          {passkeys && passkeys.length > 0 && (
            <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
              {passkeys.map((passkey) => (
                <li key={passkey.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{passkey.name || 'Passkey'}</p>
                    <p className="text-xs text-ink-soft">
                      Added {formatDate(passkey.created_at)}
                      {passkey.last_used_at ? ` · Last used ${formatDate(passkey.last_used_at)}` : ' · Not used yet'}
                      {passkey.backed_up ? ' · Synced' : ''}
                    </p>
                  </div>
                  {confirmingRemove === passkey.id ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        className="!px-3 !py-1.5 !text-sm !text-red-600"
                        onClick={() => void remove(passkey.id)}
                        disabled={busy}
                      >
                        Remove
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="!px-3 !py-1.5 !text-sm"
                        onClick={() => setConfirmingRemove(null)}
                        disabled={busy}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      className="!px-3 !py-1.5 !text-sm"
                      onClick={() => setConfirmingRemove(passkey.id)}
                      disabled={busy}
                    >
                      Remove…
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {passkeys && passkeys.length === 0 && !adding && (
            <p className="mt-4 text-sm text-ink-soft">No passkeys yet.</p>
          )}

          {adding ? (
            <form className="mt-6 flex flex-col gap-4" onSubmit={handleCreate} noValidate>
              <TextField
                id="passkeyName"
                label="Name (optional)"
                placeholder="e.g. MacBook, iPhone"
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <div className="flex flex-wrap gap-3">
                <Button type="submit" isLoading={busy} disabled={!prepared}>
                  {prepared ? 'Create passkey' : 'Getting ready…'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setAdding(false)} disabled={busy}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <Button type="button" variant="secondary" className="mt-6" onClick={startAdding}>
              Add a passkey
            </Button>
          )}
        </>
      )}

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      {successMessage && <p className="mt-4 text-sm text-green-600">{successMessage}</p>}
    </div>
  )
}

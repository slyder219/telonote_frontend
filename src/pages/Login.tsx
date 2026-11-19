import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError, NetworkError } from '../api/client'
import * as passkeysApi from '../api/passkeys'
import type { PreparedAuthentication } from '../api/passkeys'
import { usePageMeta } from '../hooks/usePageMeta'
import Button from '../components/Button'
import TextField from '../components/TextField'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Sign-in options are valid for 5 minutes on the server; keep a fresh set ready.
const PASSKEY_OPTIONS_REFRESH_MS = 4 * 60 * 1000

function messageFor(error: unknown): string {
  return error instanceof ApiError || error instanceof NetworkError
    ? error.message
    : 'Something went wrong. Please try again.'
}

export default function Login() {
  usePageMeta('Log in — Telonote', { noindex: true })
  const { login, loginWithPasskey } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const passkeysSupported = passkeysApi.passkeysSupported()
  const [passkeyOptions, setPasskeyOptions] = useState<PreparedAuthentication | null>(null)
  const [isPasskeySigningIn, setIsPasskeySigningIn] = useState(false)

  // Fetched ahead and kept fresh, so the button opens the browser's passkey prompt straight from the click
  // (Safari only allows it directly from a user gesture, not after a network round trip).
  useEffect(() => {
    if (!passkeysSupported) return
    let cancelled = false
    const load = () =>
      passkeysApi
        .prepareAuthentication()
        .then((prepared) => {
          if (!cancelled) setPasskeyOptions(prepared)
        })
        .catch(() => undefined) // the button just stays disabled; password sign-in is unaffected
    void load()
    const timer = setInterval(load, PASSKEY_OPTIONS_REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [passkeysSupported])

  const handlePasskey = async () => {
    if (!passkeyOptions) return
    setFormError('')
    setIsPasskeySigningIn(true)
    const prepared = passkeyOptions
    try {
      const credential = await passkeysApi.getAssertion(prepared)
      if (!credential) return // dismissed
      await loginWithPasskey(prepared.challengeId, credential)
      navigate('/dashboard')
    } catch (error) {
      setFormError(messageFor(error))
    } finally {
      setIsPasskeySigningIn(false)
      // Each set of options works once: get the next one ready.
      setPasskeyOptions(null)
      passkeysApi.prepareAuthentication().then(setPasskeyOptions).catch(() => undefined)
    }
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')

    const nextErrors: typeof errors = {}
    if (!EMAIL_PATTERN.test(email)) nextErrors.email = 'Enter a valid email address.'
    if (!password) nextErrors.password = 'Enter your password.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (error) {
      setFormError(messageFor(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col px-6 py-14 sm:py-20">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1.5 text-sm text-ink-soft">Log in to pick up where you left off.</p>

      <form className="mt-8 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        {formError && <p className="text-sm text-red-500">{formError}</p>}

        <Button type="submit" fullWidth isLoading={isSubmitting} className="mt-2">
          Log in
        </Button>
      </form>

      {passkeysSupported && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-soft">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            isLoading={isPasskeySigningIn}
            disabled={!passkeyOptions || isSubmitting}
            onClick={() => void handlePasskey()}
          >
            Log in with a passkey
          </Button>
        </>
      )}

      <p className="mt-6 text-center text-sm text-ink-soft">
        Don't have an account?{' '}
        <Link to="/signup" className="font-medium text-brand-600 hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  )
}

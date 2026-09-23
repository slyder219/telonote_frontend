import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { usePageMeta } from '../hooks/usePageMeta'
import * as authApi from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { useAuthenticatedRequest } from '../auth/useAuthenticatedRequest'
import { ApiError, NetworkError } from '../api/client'
import Button from '../components/Button'
import TextField from '../components/TextField'

interface FormErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

function errorMessage(error: unknown): string {
  return error instanceof ApiError || error instanceof NetworkError
    ? error.message
    : 'Something went wrong. Please try again.'
}

const CODE_LENGTH = 6
// Notes' resend cooldown - only used after a 429, since a successful send
// returns retry_after_seconds itself.
const DEFAULT_RESEND_SECONDS = 30

// Links this account to a Notes phone number (the WhatsApp notes app). The
// number must be proven with a code sent to it over WhatsApp before it's
// saved; once set, every note gets an "Import to Notes" action on the dashboard.
function NotesPhoneCard() {
  const { user, refreshAccessToken } = useAuth()
  const callWithAuthRetry = useAuthenticatedRequest()
  const savedPhone = user?.notes_phone_number ?? null

  const [phone, setPhone] = useState('')
  // Set once a code has been sent - the card is on the code step while this is non-null.
  const [pendingPhone, setPendingPhone] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [resendIn, setResendIn] = useState(0)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  const run = async (action: () => Promise<void>) => {
    setError('')
    setSuccessMessage('')
    setIsSubmitting(true)
    try {
      await action()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setIsSubmitting(false)
    }
  }

  const sendCode = (number: string) =>
    run(async () => {
      try {
        const sent = await callWithAuthRetry((token) => authApi.requestNotesPhoneCode(number, token))
        setPendingPhone(sent.phone_number)
        setResendIn(sent.retry_after_seconds)
      } catch (err) {
        // 429 = a code was sent moments ago and is still valid, so go to the
        // code step anyway rather than stranding the user on the phone step.
        if (err instanceof ApiError && err.status === 429) {
          setPendingPhone(number)
          setResendIn(DEFAULT_RESEND_SECONDS)
        }
        throw err
      } finally {
        setCode('')
      }
    })

  const verify = (value: string) => {
    if (!pendingPhone) return
    void run(async () => {
      try {
        await callWithAuthRetry((token) => authApi.verifyNotesPhoneCode(pendingPhone, value, token))
      } catch (err) {
        // Clear it so typing the next attempt auto-submits again.
        setCode('')
        throw err
      }
      // Refreshing re-fetches the user, so notes_phone_number updates everywhere.
      await refreshAccessToken()
      setPendingPhone(null)
      setPhone('')
      setCode('')
      setSuccessMessage('Notes phone number linked. Your notes can now be imported to Notes.')
    })
  }

  const handlePhoneSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!phone.trim()) {
      setError('Enter your Notes phone number.')
      return
    }
    void sendCode(phone)
  }

  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH)
    setCode(digits)
    // Submit as soon as the last digit lands (typed, pasted or autofilled).
    if (digits.length === CODE_LENGTH && !isSubmitting) verify(digits)
  }

  const handleCodeSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (code.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code.`)
      return
    }
    verify(code)
  }

  const changeNumber = () => {
    setPendingPhone(null)
    setCode('')
    setError('')
  }

  const handleRemove = () =>
    run(async () => {
      await callWithAuthRetry((token) => authApi.removeNotesPhone(token))
      await refreshAccessToken()
      setSuccessMessage('Notes phone number removed.')
    })

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-base font-semibold text-ink">Notes phone number</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {savedPhone ? (
          <>
            Linked to <span className="font-medium text-ink">+{savedPhone}</span>. Notes can be imported to Notes from
            each note's menu.
          </>
        ) : (
          'Link the phone number you use with Notes to import your telonote notes into it.'
        )}
      </p>

      {pendingPhone ? (
        <form className="mt-6 flex flex-col gap-4" onSubmit={handleCodeSubmit} noValidate>
          <p className="text-sm text-ink-soft">
            We sent a {CODE_LENGTH}-digit code over WhatsApp to{' '}
            <span className="font-medium text-ink">+{pendingPhone.replace(/\D/g, '')}</span>.
          </p>
          <TextField
            id="notesPhoneCode"
            label="Verification code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            placeholder="123456"
            className="tracking-[0.3em]"
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            autoFocus
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Button type="submit" isLoading={isSubmitting}>
              Verify
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void sendCode(pendingPhone)}
              disabled={isSubmitting || resendIn > 0}
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </Button>
            <Button type="button" variant="ghost" onClick={changeNumber} disabled={isSubmitting}>
              Use a different number
            </Button>
          </div>
        </form>
      ) : (
        <form className="mt-6 flex flex-col gap-4" onSubmit={handlePhoneSubmit} noValidate>
          <TextField
            id="notesPhone"
            label={savedPhone ? 'Change number' : 'Phone number'}
            type="tel"
            autoComplete="tel"
            placeholder="+1 555 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

          <div className="mt-2 flex gap-3">
            <Button type="submit" isLoading={isSubmitting}>
              Send code
            </Button>
            {savedPhone && (
              <Button type="button" variant="secondary" onClick={handleRemove} disabled={isSubmitting}>
                Remove
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  )
}

export default function Account() {
  usePageMeta('Account — Telonote', { noindex: true })

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError('')
    setSuccessMessage('')

    const nextErrors: FormErrors = {}
    if (!currentPassword) nextErrors.currentPassword = 'Enter your current password.'
    if (newPassword.length < 8) nextErrors.newPassword = 'Use at least 8 characters.'
    if (confirmPassword !== newPassword) nextErrors.confirmPassword = 'Passwords do not match.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await authApi.changePassword(currentPassword, newPassword)
      setSuccessMessage('Your password has been changed.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      setFormError(errorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 sm:pb-12">
      <Link to="/dashboard" className="text-sm font-medium text-brand-400 hover:underline">
        ← Back to notes
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">Account</h1>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-base font-semibold text-ink">Change password</h2>
        <p className="mt-1 text-sm text-ink-soft">You'll stay signed in on this device.</p>

        <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <TextField
            id="currentPassword"
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            error={errors.currentPassword}
          />
          <TextField
            id="newPassword"
            label="New password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
          />
          <TextField
            id="confirmPassword"
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />

          {formError && <p className="text-sm text-red-500">{formError}</p>}
          {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

          <Button type="submit" isLoading={isSubmitting} className="mt-2 self-start">
            Change password
          </Button>
        </form>
      </div>

      <NotesPhoneCard />
    </div>
  )
}

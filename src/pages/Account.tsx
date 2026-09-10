import { useState } from 'react'
import type { FormEvent } from 'react'
import { usePageMeta } from '../hooks/usePageMeta'
import * as authApi from '../api/auth'
import { ApiError, NetworkError } from '../api/client'
import Button from '../components/Button'
import TextField from '../components/TextField'

interface FormErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
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
      setFormError(
        error instanceof ApiError || error instanceof NetworkError
          ? error.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6 sm:pb-12">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Account</h1>

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
    </div>
  )
}

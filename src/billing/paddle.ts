import { initializePaddle } from '@paddle/paddle-js'
import type { Paddle, Environments } from '@paddle/paddle-js'
import type { CheckoutInfo } from '../api/billing'

// initializePaddle loads Paddle.js and opens a websocket-ish connection —
// only ever do that once per page load, and reuse it for every checkout.
let paddlePromise: Promise<Paddle | undefined> | null = null

function getPaddle(environment: Environments): Promise<Paddle | undefined> {
  const token = import.meta.env.VITE_PADDLE_CLIENT_TOKEN as string | undefined
  if (!token) {
    return Promise.reject(
      new Error('Checkout is not configured for this build (missing VITE_PADDLE_CLIENT_TOKEN).'),
    )
  }
  if (!paddlePromise) paddlePromise = initializePaddle({ environment, token })
  return paddlePromise
}

/**
 * Opens Paddle's hosted checkout overlay for the given price. `customData`
 * is passed through unchanged — it's the only way Paddle's webhook can be
 * linked back to this user server-side, so it must reach Paddle intact.
 */
export async function openCheckout(priceId: string, info: CheckoutInfo) {
  const paddle = await getPaddle(info.environment as Environments)
  if (!paddle) throw new Error("Couldn't load checkout — try again in a moment.")
  paddle.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    customer: { email: info.customer_email },
    customData: info.custom_data,
  })
}

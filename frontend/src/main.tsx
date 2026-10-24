import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { translationsReady } from './i18n'
import App from './App.tsx'
import { GoogleOAuthProvider } from '@react-oauth/google'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()

if (!googleClientId) {
  console.warn('Google authentication is disabled: VITE_GOOGLE_CLIENT_ID is not configured.')
}

/**
 * Translations are resolved before the first paint: only the default language is
 * inlined, so a returning visitor who picked another one would otherwise see the
 * fallback language flash before their dictionary arrives.
 */
async function bootstrap() {
  try {
    await translationsReady
  } catch {
    // A failed locale download must never leave the app unmounted — the inlined
    // default language is enough to render.
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {googleClientId ? (
        <GoogleOAuthProvider clientId={googleClientId}>
          <App />
        </GoogleOAuthProvider>
      ) : (
        <App />
      )}
    </StrictMode>,
  )
}

void bootstrap()

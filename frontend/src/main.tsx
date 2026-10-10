import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import { translationsReady } from './i18n'
import App from './App.tsx'

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
      <App />
    </StrictMode>,
  )
}

void bootstrap()

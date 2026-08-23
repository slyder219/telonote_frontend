import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages is a static host: it 404s on any direct request to a
// client-side route (e.g. /login). Serving a copy of index.html as 404.html
// lets the SPA boot and React Router take over from the real URL.
function spaFallback404() {
  return {
    name: 'spa-fallback-404',
    closeBundle() {
      copyFileSync('dist/index.html', 'dist/404.html')
    },
  }
}

// Vite only auto-loads env vars from specifically-named files (.env,
// .env.local, etc.) — `.env.clientside` is a deliberately different name
// (this holds values that are genuinely safe to expose in the built bundle,
// like Paddle's client-side token, so it's committed to the repo rather than
// gitignored like `.env`). Reading it by hand and injecting it via `define`
// makes `import.meta.env.VITE_PADDLE_CLIENT_TOKEN` resolve like any other
// Vite env var, without Vite needing to know about the filename.
function loadClientsideEnvDefines(): Record<string, string> {
  const path = '.env.clientside'
  if (!existsSync(path)) return {}
  const defines: Record<string, string> = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (!match) continue
    const [, key, rawValue] = match
    const value = rawValue.replace(/^['"]|['"]$/g, '')
    defines[`import.meta.env.${key}`] = JSON.stringify(value)
  }
  return defines
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback404()],
  define: loadClientsideEnvDefines(),
})

import {
  AZLyrics,
  Genius,
  GitHub,
  ListeningResult,
  LyricsOvh,
  Lrclib,
  Musixmatch,
  ParolesNet,
  Provider,
  SearchParams,
  SongLyrics,
  findByLyricsSnippet,
} from './providers'
import { createURLWithQuery, getUserId, normalizeLRC, transcribeWithWhisper, Env as WhisperEnv } from './utils'

export interface Env extends WhisperEnv {
  MANIFEST?: string
  SERVICE_WORKER?: string
}

const cache = caches.default

const headMeta = `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#0f172a">
<meta name="background-color" content="#0f172a">
<meta name="color-scheme" content="dark">
<meta name="description" content="Trouvez les paroles de vos chansons ou identifiez un morceau par audio.">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Lyrics Finder">
<link rel="manifest" href="/manifest.json">
<link rel="apple-touch-icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 180 180'%3E%3Crect width='180' height='180' rx='40' fill='%2338bdf8'/%3E%3Ctext x='90' y='130' font-size='110' text-anchor='middle'%3E%F0%9F%8E%B5%3C/text%3E%3C/svg%3E">
<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}
if (window.matchMedia('(display-mode: standalone)').matches && 'BeforeInstallPromptEvent' in window) {
  // PWA install prompt handled by browser
}
<\/script>`

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
${headMeta}
<title>Lyrics Finder</title>
<style>
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; padding-bottom: 2rem; background: #0f172a; color: #e2e8f0; }
  h1 { color: #38bdf8; }
  input, button { font-size: 1rem; padding: .65rem; border-radius: .4rem; border: none; margin: .35rem 0; width: 100%; box-sizing: border-box; }
  button { background: #38bdf8; color: #0f172a; cursor: pointer; font-weight: bold; }
  button:disabled { opacity: .6; cursor: not-allowed; }
  pre { background: #1e293b; padding: 1rem; border-radius: .4rem; white-space: pre-wrap; word-break: break-word; min-height: 4rem; }
  .tabs { display: flex; gap: .5rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .tab { background: #334155; color: white; flex: 1; min-width: 120px; border: none; }
  .tab.active { background: #38bdf8; color: #0f172a; }
  .hidden { display: none; }
  .hint { font-size: .85rem; color: #94a3b8; margin-top: .25rem; }
  .tag { display: inline-block; background: #334155; color: #94a3b8; padding: .15rem .5rem; border-radius: 1rem; font-size: .75rem; margin-bottom: .5rem; }
  .recording { animation: pulse 1.2s infinite; background: #ef4444 !important; color: white !important; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.6} }
  #installBtn { background: #22c55e; }
</style>
</head>
<body>
  <h1>🎵 Lyrics Finder</h1>
  <button id="installBtn" class="hidden" onclick="installApp()">📲 Installer l'application</button>
  <div class="tabs">
    <button class="tab active" id="tabText" onclick="switchTab('text')">Paroles par titre</button>
    <button class="tab" id="tabListen" onclick="switchTab('listen')">🎙 Identifier</button>
    <button class="tab" id="tabAudio" onclick="switchTab('audio')">Transcrire</button>
  </div>

  <section id="panelText">
    <input id="artist" placeholder="Nom de l'artiste">
    <input id="title" placeholder="Titre de la chanson">
    <button onclick="searchLyrics()">Rechercher les paroles</button>
    <p class="hint">Sources : lyrics.ovh, Genius, AZLyrics, SongLyrics, Musixmatch, Paroles.net, lrclib</p>
    <pre id="resultText">Les paroles apparaîtront ici...</pre>
  </section>

  <section id="panelListen" class="hidden">
    <button id="listenBtn" onclick="toggleListen()">🎙 Appuyer pour écouter</button>
    <p class="hint">Écoute 10 secondes, identifie le morceau et affiche les paroles.</p>
    <div id="listenInfo"></div>
    <pre id="resultListen">Le résultat apparaîtra ici...</pre>
  </section>

  <section id="panelAudio" class="hidden">
    <input type="file" id="audioFile" accept="audio/*">
    <button onclick="transcribeAudio()">Transcrire l'audio</button>
    <p class="hint">Transcription par Whisper sur Cloudflare Workers AI (max ~10 Mo).</p>
    <pre id="resultAudio">La transcription apparaîtra ici...</pre>
  </section>

<script>
let deferredInstallPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredInstallPrompt = e
  document.getElementById('installBtn').classList.remove('hidden')
})

async function installApp() {
  if (!deferredInstallPrompt) return
  deferredInstallPrompt.prompt()
  await deferredInstallPrompt.userChoice
  deferredInstallPrompt = null
  document.getElementById('installBtn').classList.add('hidden')
}

function switchTab(name) {
  ['Text','Listen','Audio'].forEach(t => {
    document.getElementById('panel' + t).classList.toggle('hidden', name !== t.toLowerCase())
    document.getElementById('tab' + t).classList.toggle('active', name === t.toLowerCase())
  })
}

async function searchLyrics() {
  const artist = document.getElementById('artist').value.trim()
  const name = document.getElementById('title').value.trim()
  const out = document.getElementById('resultText')
  if (!artist || !name) { out.textContent = 'Remplis les deux champs.'; return }
  out.textContent = 'Recherche en cours...'
  try {
    const res = await fetch('/api/lyrics?' + new URLSearchParams({ artist, name }))
    if (!res.ok) throw new Error('Paroles non trouvées')
    out.textContent = await res.text()
  } catch (e) {
    out.textContent = 'Erreur : ' + e.message
  }
}

let mediaRecorder, listenChunks = [], listenTimer = null

async function toggleListen() {
  const btn = document.getElementById('listenBtn')
  const out = document.getElementById('resultListen')
  const info = document.getElementById('listenInfo')

  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
    clearTimeout(listenTimer)
    return
  }

  listenChunks = []
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  mediaRecorder = new MediaRecorder(stream)
  mediaRecorder.ondataavailable = e => { if (e.data.size) listenChunks.push(e.data) }
  mediaRecorder.onstop = async () => {
    btn.classList.remove('recording')
    btn.textContent = '🎙 Appuyer pour écouter'
    out.textContent = 'Identification en cours...'
    const blob = new Blob(listenChunks, { type: 'audio/webm' })
    const form = new FormData()
    form.append('audio', new File([blob], 'listen.webm'))
    try {
      const res = await fetch('/api/listen', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Échec')
      info.innerHTML = '<span class="tag">' + (data.source || '') + '</span><br><strong>' +
        data.artistName + ' — ' + data.name + '</strong>'
      out.textContent = data.lyrics || '(paroles non disponibles)'
    } catch (e) {
      out.textContent = 'Erreur : ' + e.message
    }
    stream.getTracks().forEach(t => t.stop())
  }
  mediaRecorder.start(100)
  btn.classList.add('recording')
  btn.textContent = '⏹ Écoute en cours... appuyer pour arrêter'
  out.textContent = 'Écoute... chante ou joue la musique'
  info.innerHTML = ''
  listenTimer = setTimeout(() => mediaRecorder.stop(), 12000)
}

async function transcribeAudio() {
  const btn = document.querySelector('#panelAudio button')
  const file = document.getElementById('audioFile').files[0]
  const out = document.getElementById('resultAudio')
  if (!file) { out.textContent = 'Choisis un fichier audio.'; return }
  out.textContent = 'Transcription en cours...'
  btn.disabled = true
  try {
    const form = new FormData()
    form.append('audio', file)
    const res = await fetch('/api/transcribe', { method: 'POST', body: form })
    if (!res.ok) throw new Error((await res.text()) || 'Transcription échouée')
    out.textContent = await res.text()
  } catch (e) {
    out.textContent = 'Erreur : ' + e.message
  } finally {
    btn.disabled = false
  }
}
</script>
</body>
</html>
`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const jsonResponse = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders },
  })

const textResponse = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', ...corsHeaders },
  })

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    try {
      if (pathname === '/manifest.json') {
        const manifest = env.MANIFEST ?? JSON.stringify({
          name: 'Lyrics Finder',
          short_name: 'Lyrics',
          start_url: '/',
          display: 'standalone',
          background_color: '#0f172a',
          theme_color: '#0f172a',
          orientation: 'portrait',
          icons: [
            {
              src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' rx='32' fill='%2338bdf8'/%3E%3Ctext x='96' y='130' font-size='110' text-anchor='middle'%3E%F0%9F%8E%B5%3C/text%3E%3C/svg%3E",
              sizes: '192x192',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
            {
              src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='64' fill='%2338bdf8'/%3E%3Ctext x='256' y='350' font-size='300' text-anchor='middle'%3E%F0%9F%8E%B5%3C/text%3E%3C/svg%3E",
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        })
        return new Response(manifest, {
          headers: { 'content-type': 'application/manifest+json; charset=utf-8', ...corsHeaders },
        })
      }

      if (pathname === '/sw.js') {
        const sw = env.SERVICE_WORKER ?? `const CACHE_NAME='lyrics-finder-v1';const URLS_TO_CACHE=['/'];self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(URLS_TO_CACHE)))});self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match('/'))))});`
        return new Response(sw, {
          headers: { 'content-type': 'application/javascript; charset=utf-8', ...corsHeaders },
        })
      }

      if (pathname === '/') {
        return new Response(html, {
          headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache', ...corsHeaders },
        })
      }

      if (pathname === '/api/lyrics' && request.method === 'GET') {
        return handleLyrics(request, ctx)
      }

      if (pathname === '/api/listen' && request.method === 'POST') {
        return handleListen(request, env)
      }

      if (pathname === '/api/transcribe' && request.method === 'POST') {
        return handleTranscribe(request, env)
      }

      if (pathname === '/health') {
        return textResponse('ok')
      }

      return new Response('Not found', { status: 404, headers: corsHeaders })
    } catch (error: any) {
      return jsonResponse(JSON.stringify({ error: error.message || 'Unexpected error' }), 500)
    }
  },
}

async function handleLyrics(request: Request, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url)
  const rawName = url.searchParams.get('name') ?? ''
  const rawArtist = url.searchParams.get('artist') ?? ''

  if (!rawName || !rawArtist) {
    return textResponse('Missing name or artist', 400)
  }

  const name = rawName.toLowerCase()
  const artist = rawArtist.toLowerCase()

  const cacheKey = new URL(
    createURLWithQuery(new URL('https://cache/'), { name, artist }),
    request.url,
  ).toString()

  const cached = await cache.match(cacheKey)
  if (cached) return cached

  const searchParams: SearchParams = { name, artist, rawName, rawArtist }

  const providers: Provider[] = [
    new LyricsOvh(),
    new Genius(),
    new AZLyrics(),
    new SongLyrics(),
    new Musixmatch(),
    new GitHub(),
    new ParolesNet(),
    new Lrclib(),
  ]

  let lyrics: string | undefined
  for (const provider of providers) {
    try {
      lyrics = await provider.getBestMatched(searchParams)
      if (lyrics) break
    } catch {
      // try next provider
    }
  }

  if (lyrics == null) {
    return new Response('Not found', {
      status: 404,
      headers: { 'content-type': 'text/plain', 'cache-control': 'no-cache', ...corsHeaders },
    })
  }

  const response = new Response(normalizeLRC(lyrics), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      'x-user-id': await getUserId(request),
      ...corsHeaders,
    },
  })

  ctx.waitUntil(cache.put(cacheKey, response.clone()))

  return response
}

async function handleTranscribe(request: Request, env: Env): Promise<Response> {
  if (!env.AI) {
    return textResponse('AI binding is not configured. Add [ai] binding = "AI" in wrangler.toml', 500)
  }

  try {
    const formData = await request.formData()
    const audio = formData.get('audio')

    if (!audio || !(audio instanceof File)) {
      return textResponse('Missing audio file', 400)
    }

    const text = await transcribeWithWhisper(audio, env)
    return textResponse(text)
  } catch (error: any) {
    return textResponse(`Transcription error: ${error.message || error}`, 500)
  }
}

async function handleListen(request: Request, env: Env): Promise<Response> {
  if (!env.AI) {
    return jsonResponse(JSON.stringify({ error: 'AI binding is not configured' }), 500)
  }

  try {
    const formData = await request.formData()
    const audio = formData.get('audio')

    if (!audio || !(audio instanceof File)) {
      return jsonResponse(JSON.stringify({ error: 'Missing audio file' }), 400)
    }

    const snippet = await transcribeWithWhisper(audio, env)

    if (!snippet.trim()) {
      return jsonResponse(JSON.stringify({ error: 'No voice detected' }), 422)
    }

    const matched = await findByLyricsSnippet(snippet)

    if (!matched) {
      return jsonResponse(JSON.stringify({ error: 'Could not identify song', transcription: snippet }), 404)
    }

    const result: ListeningResult = {
      ...matched,
      source: 'lrclib.net (detected by lyrics)',
    }

    return jsonResponse(JSON.stringify(result))
  } catch (error: any) {
    return jsonResponse(JSON.stringify({ error: error.message || 'Listen error' }), 500)
  }
}

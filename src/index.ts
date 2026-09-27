import {
  AZLyrics,
  Genius,
  GitHub,
  LyricsOvh,
  Musixmatch,
  ParolesNet,
  Provider,
  SearchParams,
  SongLyrics,
} from './providers'
import { createURLWithQuery, getUserId, normalizeLRC, transcribeWithWhisper, Env as WhisperEnv } from './utils'

export interface Env extends WhisperEnv {}

const cache = caches.default

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Lyrics Finder</title>
<style>
  body { font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1rem; background: #0f172a; color: #e2e8f0; }
  h1 { color: #38bdf8; }
  input, button { font-size: 1rem; padding: .65rem; border-radius: .4rem; border: none; margin: .35rem 0; width: 100%; box-sizing: border-box; }
  button { background: #38bdf8; color: #0f172a; cursor: pointer; font-weight: bold; }
  button:disabled { opacity: .6; cursor: not-allowed; }
  pre { background: #1e293b; padding: 1rem; border-radius: .4rem; white-space: pre-wrap; word-break: break-word; min-height: 4rem; }
  .tabs { display: flex; gap: .5rem; margin-bottom: 1rem; }
  .tab { background: #334155; color: white; flex: 1; border: none; }
  .tab.active { background: #38bdf8; color: #0f172a; }
  .hidden { display: none; }
  .hint { font-size: .85rem; color: #94a3b8; margin-top: .25rem; }
</style>
</head>
<body>
  <h1>🎵 Lyrics Finder</h1>
  <div class="tabs">
    <button class="tab active" id="tabText" onclick="switchTab('text')">Paroles par titre</button>
    <button class="tab" id="tabAudio" onclick="switchTab('audio')">Paroles par audio</button>
  </div>

  <section id="panelText">
    <input id="artist" placeholder="Nom de l'artiste">
    <input id="title" placeholder="Titre de la chanson">
    <button onclick="searchLyrics()">Rechercher les paroles</button>
    <p class="hint">Sources : lyrics.ovh, Genius, AZLyrics, SongLyrics, Musixmatch, Paroles.net...</p>
    <pre id="resultText">Les paroles apparaîtront ici...</pre>
  </section>

  <section id="panelAudio" class="hidden">
    <input type="file" id="audioFile" accept="audio/*">
    <button onclick="transcribeAudio()">Transcrire l'audio</button>
    <p class="hint">Transcription par Whisper sur Cloudflare Workers AI (max ~10 Mo, plus lent).</p>
    <pre id="resultAudio">La transcription apparaîtra ici...</pre>
  </section>

<script>
function switchTab(name) {
  document.getElementById('panelText').classList.toggle('hidden', name !== 'text')
  document.getElementById('panelAudio').classList.toggle('hidden', name !== 'audio')
  document.getElementById('tabText').classList.toggle('active', name === 'text')
  document.getElementById('tabAudio').classList.toggle('active', name === 'audio')
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
      if (pathname === '/') {
        return new Response(html, {
          headers: { 'content-type': 'text/html; charset=utf-8', ...corsHeaders },
        })
      }

      if (pathname === '/api/lyrics' && request.method === 'GET') {
        return handleLyrics(request, ctx)
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

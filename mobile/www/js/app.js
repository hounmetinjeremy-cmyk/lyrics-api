const API_BASE = 'https://lyrics-api.hounmetinjeremy.workers.dev'

function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
}

function showMessage(id, htmlOrText, type = 'info') {
  const el = document.getElementById(id)
  if (!el) return
  el.innerHTML = `
    <div class="message ${type}">
      ${String(htmlOrText).replace(/\n/g, '<br>')}
    </div>
  `
}

function formatLyrics(data) {
  const lines = (data.lyrics || 'Aucune parole trouvée').split('\n')
  return `
    <div class="song-info">
      <h3>${escapeHtml(data.name || data.title || 'Titre inconnu')} — ${escapeHtml(data.artist || 'Artiste inconnu')}</h3>
      ${data.album ? `<p>Album : ${escapeHtml(data.album)}</p>` : ''}
    </div>
    <pre>${escapeHtml(lines.slice(0, 40).join('\n'))}${lines.length > 40 ? '\n...' : ''}</pre>
  `
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'))
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`)
  const panel = document.getElementById(`panel-${tabName}`)
  if (tab) tab.classList.add('active')
  if (panel) panel.classList.add('active')
}

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    switchTab(tab.getAttribute('data-tab'))
  })
})

const btnSearch = document.getElementById('btnSearch')
const artistInput = document.getElementById('artist')
const titleInput = document.getElementById('title')
const resultText = document.getElementById('resultText')

async function fetchLyrics(artist, title) {
  const url = `${API_BASE}/api/lyrics?artist=${encodeURIComponent(artist)}&name=${encodeURIComponent(title)}`
  console.log(`[Lyrics API] GET ${url}`)

  let res
  try {
    res = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } })
  } catch (networkErr) {
    console.error('[Lyrics API] Network error:', networkErr)
    throw new Error(`Network error: ${networkErr.name || 'FetchError'} — ${networkErr.message}`)
  }

  console.log(`[Lyrics API] Response status: ${res.status} ${res.statusText}`)
  console.log(`[Lyrics API] Content-Type: ${res.headers.get('content-type')}`)

  const bodyText = await res.text()
  console.log(`[Lyrics API] Body preview: ${bodyText.slice(0, 200)}`)

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${bodyText.slice(0, 200)}`)
  }

  try {
    return JSON.parse(bodyText)
  } catch (jsonErr) {
    console.warn('[Lyrics API] JSON parse failed, falling back to plain text', jsonErr)
    return { name: title, artist, album: '', lyrics: bodyText }
  }
}

if (btnSearch) {
  btnSearch.addEventListener('click', async () => {
    const artist = (artistInput?.value || '').trim()
    const title = (titleInput?.value || '').trim()

    if (!artist || !title) {
      showMessage('resultText', 'Veuillez saisir un artiste et un titre.', 'error')
      return
    }

    showMessage('resultText', 'Recherche en cours...', 'info')
    btnSearch.disabled = true

    try {
      const data = await fetchLyrics(artist, title)
      resultText.innerHTML = formatLyrics(data)
    } catch (err) {
      console.error('[Search error]', err)
      showMessage('resultText', `<strong>Erreur recherche :</strong><br>${escapeHtml(err.message)}<br><br>Vérifie ta connexion internet et réessaie.`, 'error')
    } finally {
      btnSearch.disabled = false
    }
  })
}

const btnListen = document.getElementById('listenBtn')
const resultListen = document.getElementById('resultListen')
let isListening = false
let mediaRecorder
let recordedChunks = []

const MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/aac'
]

function getSupportedMimeType() {
  for (const t of MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

function stopListening() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  }
  isListening = false
  if (btnListen) {
    btnListen.textContent = 'Appuyer pour écouter'
    btnListen.disabled = false
  }
}

async function startListening() {
  if (isListening) return
  isListening = true
  recordedChunks = []

  if (btnListen) {
    btnListen.disabled = true
    btnListen.textContent = 'Écoute en cours...'
  }
  showMessage('resultListen', 'Préparation du micro...', 'info')

  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (err) {
    console.error('[Micro error]', err)
    showMessage('resultListen', `<strong>Erreur micro :</strong><br>${escapeHtml(err.name)} — ${escapeHtml(err.message)}<br><br>Vérifie les autorisations micro dans Paramètres > Applications > Lyrics Finder.`, 'error')
    stopListening()
    return
  }

  const mimeType = getSupportedMimeType()
  console.log(`[Listen] Supported MIME type: ${mimeType || 'default'}`)

  try {
    mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  } catch (err) {
    console.error('[MediaRecorder error]', err)
    showMessage('resultListen', `<strong>Erreur enregistrement :</strong><br>${escapeHtml(err.message)}`, 'error')
    stopListening()
    return
  }

  mediaRecorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data)
  }

  mediaRecorder.onstop = async () => {
    const tracks = stream.getTracks()
    tracks.forEach(t => t.stop())

    if (recordedChunks.length === 0) {
      showMessage('resultListen', 'Aucun son enregistré. Vérifie que le micro fonctionne.', 'error')
      stopListening()
      return
    }

    const blob = new Blob(recordedChunks, { type: mimeType || 'audio/wav' })
    console.log(`[Listen] Recorded blob size: ${blob.size} bytes, type: ${blob.type}`)
    await sendAudio(blob)
  }

  mediaRecorder.onerror = e => {
    console.error('[MediaRecorder error]', e)
    showMessage('resultListen', `<strong>Erreur MediaRecorder :</strong><br>${escapeHtml(e.message || 'Unknown')}`, 'error')
    stopListening()
  }

  mediaRecorder.start()
  showMessage('resultListen', 'Écoute en cours... (10 secondes)', 'info')

  setTimeout(() => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop()
      showMessage('resultListen', 'Analyse en cours...', 'info')
    }
  }, 10000)
}

async function sendAudio(blob) {
  if (btnListen) btnListen.disabled = true
  showMessage('resultListen', 'Envoi du son au serveur...', 'info')

  const formData = new FormData()
  const ext = blob.type.includes('webm') ? 'webm' : blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'wav'
  formData.append('audio', blob, `recording.${ext}`)

  const url = `${API_BASE}/api/listen`
  console.log(`[Listen API] POST ${url}`)

  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      body: formData
    })
  } catch (networkErr) {
    console.error('[Listen API] Network error:', networkErr)
    showMessage('resultListen', `<strong>Erreur réseau :</strong><br>${escapeHtml(networkErr.message)}`, 'error')
    stopListening()
    return
  }

  console.log(`[Listen API] Status: ${res.status} ${res.statusText}`)

  const text = await res.text()
  console.log(`[Listen API] Body: ${text.slice(0, 200)}`)

  let data
  try {
    data = JSON.parse(text)
  } catch (jsonErr) {
    console.error('[Listen API] JSON parse error:', jsonErr)
    showMessage('resultListen', `<strong>Erreur serveur :</strong><br>HTTP ${res.status} ${res.statusText}<br>${escapeHtml(text.slice(0, 200))}<br><br>La réponse n'est pas au format JSON.`, 'error')
    stopListening()
    return
  }

  if (!res.ok || data.error) {
    showMessage('resultListen', `<strong>Erreur serveur :</strong><br>${escapeHtml(data.error || `HTTP ${res.status}`)}`, 'error')
    stopListening()
    return
  }

  if (!data.name || !data.lyrics) {
    showMessage('resultListen', 'Chanson non identifiée. Essaye de chanter ou de faire jouer la musique plus fort.', 'error')
    stopListening()
    return
  }

  resultListen.innerHTML = formatLyrics(data)
  stopListening()
  switchTab('text')
}

if (btnListen) {
  btnListen.addEventListener('click', () => {
    if (isListening) {
      stopListening()
      showMessage('resultListen', 'Écoute annulée.', 'info')
    } else {
      startListening()
    }
  })
}

function openListenTab() {
  switchTab('listen')
  if (btnListen) btnListen.click()
}

if (new URLSearchParams(window.location.search).get('openListen')) {
  if (document.readyState === 'loading') {
    window.addEventListener('load', openListenTab)
  } else {
    openListenTab()
  }
}

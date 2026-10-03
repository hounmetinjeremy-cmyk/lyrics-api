const API_BASE = 'https://lyrics-api.hounmetinjeremy.workers.dev'

function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]))
}

function showMessage(id, text, type = 'info') {
  const el = document.getElementById(id)
  if (!el) return
  el.textContent = text
  el.classList.toggle('error', type === 'error')
}

function formatLyrics(data, artist, title) {
  const lines = (data.lyrics || 'Aucune parole trouvée').split('\n')
  return `
    <div class="song-info">
      <h3>${escapeHtml(data.name || title)} — ${escapeHtml(data.artist || artist)}</h3>
      ${data.album ? `<p>Album : ${escapeHtml(data.album)}</p>` : ''}
    </div>
    <pre>${escapeHtml(lines.slice(0, 40).join('\n'))}${lines.length > 40 ? '\n...' : ''}</pre>
  `
}

// Navigation onglets
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

// Recherche paroles
const btnSearch = document.getElementById('btnSearch')
const artistInput = document.getElementById('artist')
const titleInput = document.getElementById('title')
const resultText = document.getElementById('resultText')

if (btnSearch) {
  btnSearch.addEventListener('click', async () => {
    const artist = (artistInput?.value || '').trim()
    const title = (titleInput?.value || '').trim()
    if (!artist || !title) {
      showMessage('resultText', 'Veuillez saisir un artiste et un titre.', 'error')
      return
    }
    resultText.textContent = 'Recherche en cours...'
    try {
      const res = await fetch(`${API_BASE}/api/lyrics?artist=${encodeURIComponent(artist)}&name=${encodeURIComponent(title)}`)
      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Paroles introuvables')
      }
      resultText.innerHTML = formatLyrics(data, artist, title)
    } catch (err) {
      showMessage('resultText', 'Erreur : ' + err.message, 'error')
    }
  })
}

// Écoute audio
let isListening = false
let mediaRecorder = null
let recordedChunks = []
let currentStream = null
let listenTimeout = null

const btnListen = document.getElementById('btnListen')
const pulseRing = document.getElementById('pulseRing')
const listenStatus = document.getElementById('listenStatus')
const resultListen = document.getElementById('resultListen')

async function startListening() {
  if (isListening) return
  isListening = true
  recordedChunks = []

  if (btnListen) {
    btnListen.disabled = true
    btnListen.textContent = '⏹ Arrêter l\'écoute'
  }
  if (pulseRing) pulseRing.classList.add('active')
  if (listenStatus) listenStatus.textContent = 'Demande de permission microphone...'

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    currentStream = stream

    if (listenStatus) listenStatus.textContent = 'Écoute en cours... (10 secondes maximum)'

    const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
    mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) recordedChunks.push(e.data)
    }
    mediaRecorder.onstop = async () => {
      const blob = new Blob(recordedChunks, { type: mimeType })
      await sendAudio(blob)
      stopAllTracks(stream)
    }

    mediaRecorder.start()
    listenTimeout = setTimeout(() => stopListening(), 10000)
  } catch (err) {
    console.error(err)
    let message = 'Erreur micro : '
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      message += 'Permission refusée. Vérifie Paramètres > Applications > Lyrics Finder > Microphone.'
    } else if (err.name === 'NotFoundError') {
      message += 'Aucun microphone détecté.'
    } else {
      message += err.name + (err.message ? ' — ' + err.message : '')
    }
    if (listenStatus) listenStatus.textContent = message
    resetListenUI()
  }
}

function stopListening() {
  if (listenTimeout) {
    clearTimeout(listenTimeout)
    listenTimeout = null
  }
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop()
  } else {
    resetListenUI()
  }
}

function stopAllTracks(stream) {
  if (stream) stream.getTracks().forEach(t => t.stop())
}

function resetListenUI() {
  isListening = false
  if (btnListen) {
    btnListen.disabled = false
    btnListen.textContent = '🎙️ Appuyer pour écouter'
  }
  if (pulseRing) pulseRing.classList.remove('active')
}

async function sendAudio(blob) {
  try {
    if (listenStatus) listenStatus.textContent = 'Identification en cours...'
    const formData = new FormData()
    formData.append('audio', blob, 'recording.webm')

    const res = await fetch(`${API_BASE}/api/listen`, {
      method: 'POST',
      body: formData
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      throw new Error(data.error || 'Identification impossible')
    }
    if (resultListen) resultListen.innerHTML = formatLyrics(data, data.artist || 'Inconnu', data.name || 'Inconnu')
    if (listenStatus) listenStatus.textContent = '✅ Trouvé !'
  } catch (err) {
    showMessage('resultListen', 'Erreur : ' + err.message, 'error')
    if (listenStatus) listenStatus.textContent = '❌ Échec de l\'identification'
  }
  resetListenUI()
}

if (btnListen) {
  btnListen.addEventListener('click', () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  })
}

// Ouverture depuis Quick Settings Tile
function openListenTab() {
  switchTab('listen')
  setTimeout(() => {
    if (btnListen && !isListening) btnListen.click()
  }, 500)
}

if (new URLSearchParams(window.location.search).get('openListen')) {
  window.addEventListener('load', openListenTab)
}

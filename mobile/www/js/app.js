const API_BASE = 'https://lyrics-api.hounmetinjeremy.workers.dev'

// Navigation onglets
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
    tab.classList.add('active')
    const panelId = tab.getAttribute('data-tab')
    document.getElementById(panelId).classList.add('active')
  })
})

// Toolbar title
const title = document.getElementById('page-title')
title.textContent = 'Lyrics Finder'

// Chargement initial
const searchInputArtist = document.getElementById('search-artist')
const searchInputName = document.getElementById('search-name')
const searchButton = document.getElementById('search-button')
const lyricsResult = document.getElementById('lyrics-result')

const listenTabBtn = document.querySelector('[data-tab="listen"]')
const listenStatus = document.getElementById('listen-status')

async function fetchLyrics(artist, name) {
  const res = await fetch(`${API_BASE}/api/lyrics?artist=${encodeURIComponent(artist)}&name=${encodeURIComponent(name)}`)
  if (!res.ok) throw new Error((await res.json()).error || 'Pas de paroles trouvées')
  return res.json()
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]))
}

function displayLyrics(data, artist, name) {
  const lines = data.lyrics.split('\n').filter(Boolean).slice(0, 40)
  lyricsResult.innerHTML = `
    <div class="song-header">
      <h2>${escapeHtml(data.name || name)}</h2>
      <h3>${escapeHtml(data.artist || artist)}</h3>
      ${data.album ? `<p class="meta">Album : ${escapeHtml(data.album)}</p>` : ''}
    </div>
    <pre class="lyrics-text">${escapeHtml(lines.join('\n'))}${data.lyrics.split('\n').length > 40 ? '\n...' : ''}</pre>
  `
}

searchButton.addEventListener('click', async () => {
  const artist = searchInputArtist.value.trim()
  const name = searchInputName.value.trim()
  if (!artist || !name) return
  lyricsResult.innerHTML = '<p class="loading">Recherche en cours...</p>'
  try {
    const data = await fetchLyrics(artist, name)
    displayLyrics(data, artist, name)
  } catch (e) {
    lyricsResult.innerHTML = `<p class="error">${escapeHtml(e.message)}</p>`
  }
})

// === Quick Settings Tile integration ===
function handleQuickTileOpen() {
  // Focus listen tab
  listenTabBtn.click()
  startListening()
}

function startListening() {
  listenStatus.textContent = '🎙️ Écoute en cours... Demande d\'autorisation micro'
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => {
      listenStatus.textContent = '🎧 Écoute 10 secondes...'
      startRecording()
    })
    .catch(err => {
      listenStatus.textContent = `❌ Micro non autorisé : ${err.message}`
    })
}

let mediaRecorder
let chunks = []

function startRecording() {
  chunks = []
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    mediaRecorder = new MediaRecorder(stream)
    mediaRecorder.ondataavailable = e => chunks.push(e.data)
    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      await sendListen(blob)
    }
    mediaRecorder.start()
    setTimeout(() => mediaRecorder.stop(), 10000)
  })
}

async function sendListen(blob) {
  listenStatus.textContent = '🔍 Identification...'
  try {
    const res = await fetch(`${API_BASE}/api/listen`, { method: 'POST', body: blob })
    if (!res.ok) throw new Error('Échec identification')
    const data = await res.json()
    if (data.artist && data.name) {
      document.querySelector('[data-tab="search"]').click()
      searchInputArtist.value = data.artist
      searchInputName.value = data.name
      const lyrics = await fetchLyrics(data.artist, data.name)
      displayLyrics(lyrics, data.artist, data.name)
      listenStatus.textContent = '✅ Trouvé !'
    } else {
      listenStatus.textContent = '❌ Chanson non identifiée'
    }
  } catch (e) {
    listenStatus.textContent = `❌ Erreur : ${e.message}`
  }
}

// Bouton écoute manuel
document.getElementById('listen-button').addEventListener('click', () => {
  document.querySelector('[data-tab="listen"]').click()
  startListening()
})

// Gestion de l'ouverture via Quick Settings Tile / notification
document.addEventListener('deviceready', () => {
  const intent = (window.cordova && window.cordova.plugins && window.cordova.plugins.broadcastIntent) || null
  if (intent && intent.extras) {
    if (intent.extras.openListen === true || intent.extras.openListen === 'true') {
      handleQuickTileOpen()
    }
  }
}, false)

// Fallback si ouverture en web avec URL param ?openListen=1
if (new URLSearchParams(window.location.search).get('openListen')) {
  window.addEventListener('load', () => {
    handleQuickTileOpen()
  })
}

const API_BASE = 'https://lyrics-api.hounmetinjeremy.workers.dev'

// Navigation onglets
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'))
    tab.classList.add('active')
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active')
  })
})

// Recherche paroles par titre
document.getElementById('btnSearch').addEventListener('click', async () => {
  const artist = document.getElementById('artist').value.trim()
  const name = document.getElementById('title').value.trim()
  const result = document.getElementById('resultText')
  const btn = document.getElementById('btnSearch')

  if (!artist || !name) {
    result.textContent = 'Remplis les deux champs.'
    return
  }

  btn.disabled = true
  result.textContent = 'Recherche en cours...'

  try {
    const res = await fetch(`${API_BASE}/api/lyrics?artist=${encodeURIComponent(artist)}&name=${encodeURIComponent(name)}`)
    if (!res.ok) throw new Error('Paroles non trouvées')
    result.textContent = await res.text()
  } catch (e) {
    result.textContent = 'Erreur : ' + e.message
  } finally {
    btn.disabled = false
  }
})

// Mode écouter (Shazam-like)
let isRecording = false
let mediaRecorder = null
let audioChunks = []

const btnListen = document.getElementById('btnListen')
const pulseRing = document.getElementById('pulseRing')
const listenStatus = document.getElementById('listenStatus')
const resultListen = document.getElementById('resultListen')

btnListen.addEventListener('click', async () => {
  if (isRecording) return
  await startListening()
})

async function startListening() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      isRecording = false
      pulseRing.classList.remove('active')
      btnListen.textContent = '🎙️ Appuyer pour écouter'
      listenStatus.textContent = 'Analyse en cours...'

      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      await sendAudio(audioBlob)

      stream.getTracks().forEach(track => track.stop())
    }

    mediaRecorder.start()
    isRecording = true
    pulseRing.classList.add('active')
    btnListen.textContent = '⏹️ Arrêter l\'écoute'
    listenStatus.textContent = 'Écoute en cours... parle ou joue de la musique'

    // Arrêt auto après 10 secondes
    setTimeout(() => {
      if (isRecording && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop()
      }
    }, 10000)

  } catch (e) {
    listenStatus.textContent = 'Erreur micro : ' + e.message
  }
}

async function sendAudio(audioBlob) {
  resultListen.textContent = ''

  try {
    const formData = new FormData()
    formData.append('audio', audioBlob, 'record.webm')

    const res = await fetch(`${API_BASE}/api/listen`, {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()

    if (!res.ok || !data.lyrics) {
      throw new Error(data.error || 'Aucune musique ou paroles trouvées')
    }

    resultListen.innerHTML = `
      <div class="song-info">
        <h3>${escapeHtml(data.title || 'Titre inconnu')}</h3>
        <p>${escapeHtml(data.artist || 'Artiste inconnu')}</p>
      </div>
      ${escapeHtml(data.lyrics)}
    `
    listenStatus.textContent = '✅ Trouvé !'
  } catch (e) {
    resultListen.textContent = 'Erreur : ' + e.message
    listenStatus.textContent = 'Échec de la détection'
  }
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

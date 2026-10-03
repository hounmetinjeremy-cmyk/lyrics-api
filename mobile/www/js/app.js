const API_BASE = 'https://lyrics-api.hounmetinjeremy.workers.dev'

function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;' }[c]))
}

function showMessage(id, text, type = 'info') {
  const el = document.getElementById(id)
  if (!el) return
  el.innerHTML = String(text).replace(/\n/g, '<br>')
  el.className = 'result ' + (type === 'error' ? 'error' : type === 'success' ? 'success' : '')
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
  tab.addEventListener('click', () => switchTab(tab.getAttribute('data-tab')))
})

const btnSearch = document.getElementById('btnSearch')
const artistInput = document.getElementById('artist')
const titleInput = document.getElementById('title')
const btnListen = document.getElementById('btnListen')

if (btnSearch) {
  btnSearch.addEventListener('click', async () => {
    const artist = (artistInput?.value || '').trim()
    const title = (titleInput?.value || '').trim()
    const out = document.getElementById('resultText')
    if (!artist || !title) {
      showMessage('resultText', 'Veuillez saisir un artiste et un titre.', 'error')
      return
    }
    showMessage('resultText', 'Recherche en cours...')
    btnSearch.disabled = true

    const url = `${API_BASE}/api/lyrics?artist=${encodeURIComponent(artist)}&name=${encodeURIComponent(title)}`
    console.log('[Search] Fetching', url)

    try {
      const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json, text/plain' } })
      console.log('[Search] Response status:', res.status)
      const contentType = res.headers.get('content-type') || ''
      const textBody = await res.text()
      console.log('[Search] Response body preview:', textBody.slice(0, 200))

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${textBody || res.statusText}`)
      }

      let data
      if (contentType.includes('application/json')) {
        try {
          data = JSON.parse(textBody)
        } catch (jsonErr) {
          throw new Error(`Réponse JSON invalide: ${jsonErr.message}\nCorps: ${textBody.slice(0, 200)}`)
        }
      } else {
        data = { name: title, artist, album: '', lyrics: textBody }
      }

      const lyrics = (data.lyrics || data.text || textBody || 'Aucune parole trouvée').trim()
      const lines = lyrics.split('\n').filter(Boolean)
      showMessage('resultText', `
        <div class="song-info">
          <h3>${escapeHtml(data.name || title)} — ${escapeHtml(data.artist || artist)}</h3>
          ${data.album ? `<p>Album : ${escapeHtml(data.album)}</p>` : ''}
        </div>
        <pre>${escapeHtml(lines.slice(0, 40).join('\n'))}${lines.length > 40 ? '\n...' : ''}</pre>
      `, 'success')
    } catch (err) {
      console.error('[Search] Error:', err)
      showMessage('resultText', `<strong>Erreur :</strong><br>${escapeHtml(err.message || err)}${err.stack ? '<br><small>' + escapeHtml(err.stack) + '</small>' : ''}`, 'error')
    } finally {
      btnSearch.disabled = false
    }
  })
}

let isListening = false
let mediaRecorder = null
let recordedChunks = []

async function startListening() {
  if (isListening) return
  isListening = true
  recordedChunks = []
  showMessage('resultListen', '🎙️ Écoute en cours... Parlez ou jouez la musique.')

  try {
    console.log('[Listen] Requesting microphone...')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    console.log('[Listen] Microphone acquired')

    const mimeType = MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg'
    console.log('[Listen] Using mimeType:', mimeType)

    mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) recordedChunks.push(e.data)
    }
    mediaRecorder.onstop = () => {
      console.log('[Listen] Recording stopped. Chunks:', recordedChunks.length)
      stream.getTracks().forEach(t => t.stop())
      const ext = mimeType.split('/')[1] || 'webm'
      sendAudio(new Blob(recordedChunks, { type: mimeType }), ext)
    }
    mediaRecorder.onerror = e => {
      console.error('[Listen] MediaRecorder error:', e)
      showMessage('resultListen', `Erreur enregistrement : ${e.message || e}`, 'error')
      isListening = false
      if (btnListen) btnListen.textContent = '🎙️ Appuyer pour écouter'
    }

    mediaRecorder.start(100)
    console.log('[Listen] Recorder started')

    setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        console.log('[Listen] Stopping after 10s')
        mediaRecorder.stop()
      }
    }, 10000)
  } catch (err) {
    console.error('[Listen] Microphone error:', err)
    showMessage('resultListen', `<strong>Erreur micro :</strong><br>${escapeHtml(err.message || err)}`, 'error')
    isListening = false
    if (btnListen) btnListen.textContent = '🎙️ Appuyer pour écouter'
  }
}

async function sendAudio(blob, ext) {
  if (!blob || blob.size === 0) {
    showMessage('resultListen', 'Aucun audio capturé.', 'error')
    isListening = false
    if (btnListen) btnListen.textContent = '🎙️ Appuyer pour écouter'
    return
  }
  showMessage('resultListen', '⏳ Envoi de l\'audio en cours...')

  const formData = new FormData()
  formData.append('audio', blob, `recording.${ext}`)

  console.log('[Listen] Sending audio, size:', blob.size, 'type:', blob.type)

  try {
    const res = await fetch(`${API_BASE}/api/listen`, { method: 'POST', body: formData })
    const text = await res.text()
    console.log('[Listen] Response status:', res.status, 'body preview:', text.slice(0, 200))

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
    }

    let data
    try {
      data = JSON.parse(text)
    } catch (jsonErr) {
      throw new Error(`Réponse JSON invalide: ${jsonErr.message}\nCorps: ${text.slice(0, 200)}`)
    }

    if (data.error) {
      throw new Error(data.error)
    }

    if (data.artist && data.name) {
      artistInput.value = data.artist
      titleInput.value = data.name
      switchTab('text')
      showMessage('resultListen', `✅ Trouvé : <strong>${escapeHtml(data.name)}</strong> — ${escapeHtml(data.artist)}`, 'success')
      btnSearch?.click()
    } else {
      showMessage('resultListen', `Résultat incomplet : ${escapeHtml(JSON.stringify(data))}`, 'error')
    }
  } catch (err) {
    console.error('[Listen] Send error:', err)
    showMessage('resultListen', `<strong>Erreur analyse :</strong><br>${escapeHtml(err.message || err)}`, 'error')
  } finally {
    isListening = false
    if (btnListen) btnListen.textContent = '🎙️ Appuyer pour écouter'
  }
}

if (btnListen) {
  btnListen.addEventListener('click', () => {
    if (!isListening) {
      btnListen.textContent = '⏹️ Appuyer pour arrêter'
      startListening()
    } else if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop()
    }
  })
}

function openListenTab() {
  switchTab('listen')
  if (btnListen && !isListening) btnListen.click()
}

if (new URLSearchParams(window.location.search).get('openListen')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', openListenTab)
  } else {
    openListenTab()
  }
}

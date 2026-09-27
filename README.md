# Lyrics API

A Cloudflare Worker that finds song lyrics from multiple free sources and can transcribe audio with Whisper.

## Features

- 🎤 **Text search**: artist + title → lyrics
- 📚 **Multi-source lyrics**: LyricsOvh, Genius, AZLyrics, SongLyrics, Musixmatch, Paroles.net, GitHub LRC
- 🎙️ **Audio transcription**: upload an audio file and get lyrics via Cloudflare Workers AI (Whisper)
- 🌐 **Built-in web UI**: open the worker URL to search lyrics or transcribe audio
- 💯 **100 % free**: no paid API keys required

## Routes

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Web interface |
| `GET` | `/api/lyrics?name=Titre&artist=Artiste` | Search lyrics by artist and title |
| `POST` | `/api/transcribe` | Transcribe audio with Whisper (multipart/form-data, field `audio`) |

## Local development

```bash
# 1. Clone your fork
git clone https://github.com/hounmetinjeremy-cmyk/lyrics-api.git
cd lyrics-api

# 2. Install dependencies
npm install

# 3. Start local dev server
npm run dev
```

Open [http://localhost:8787](http://localhost:8787) in your browser.

## Test the API

```bash
# Search lyrics
curl "http://localhost:8787/api/lyrics?artist=ive&name=after%20like"

# Transcribe audio (Whisper works only in the cloud or with --remote)
curl -X POST -F "audio=@chanson.mp3" "http://localhost:8787/api/transcribe"
```

## Deploy to Cloudflare Workers

```bash
# Login once (browser)
npx wrangler login

# Deploy
npm run deploy
```

After deployment, Wrangler will print the production URL.

## Notes

- The **AI transcription** (`/api/transcribe`) uses the Cloudflare Workers AI binding. It currently works on the real Workers platform, not fully in local dev.
- Some lyrics sites may block Worker IPs; the code switches to the next provider automatically.

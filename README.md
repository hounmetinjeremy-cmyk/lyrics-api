# Lyrics API

A Cloudflare Worker that finds song lyrics from multiple free sources and can transcribe audio with Whisper.

## Features

- 🔎 **Text search**: artist + title → lyrics
- 🌐 **Multi-source lyrics**: LyricsOvh, Genius, AZLyrics, SongLyrics, Musixmatch, Paroles.net, GitHub LRC
- 🎤 **Audio transcription**: upload an audio file and get lyrics via Cloudflare Workers AI (Whisper)
- 🖥️ **Built-in web UI**: open the worker URL to search lyrics or transcribe audio
- 💰 **100 % free**: no paid API keys

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Authenticate wrangler

```bash
npx wrangler login
```

Then select the Cloudflare account you want to use.

### 3. Run locally

```bash
npm run dev
```

Open: http://localhost:8787/

### 4. Deploy

```bash
npm run deploy
```

After deployment, wrangler prints the public URL.

## API usage

### Search lyrics

```bash
curl "https://your-worker.your-subdomain.workers.dev/api/lyrics?artist=Daft+Punk&name=Get+Lucky"
```

### Transcribe audio

```bash
curl -F "audio=@song.mp3" "https://your-worker.your-subdomain.workers.dev/api/transcribe"
```

## Notes

- Workers AI must be enabled on your Cloudflare account.
- The free Workers AI plan has limits (file size, daily requests). Keep audio files under ~10 MB for best results.
- Transcribing noisy music is harder than clean speech. The model works best when the vocals are clear.

# Lyrics API

A Cloudflare Worker that returns synced/unsynced song lyrics from multiple free sources.

Forked from [lujjjh/lyrics-api](https://github.com/lujjjh/lyrics-api).

## Sources

The API tries the following providers in order:

1. [Lyrics.ovh](https://lyrics.ovh/) – public lyrics API
2. [Genius](https://genius.com/) – lyrics scraping
3. GitHub LRC repository – for custom synced lyrics
4. [Paroles.net](https://www.paroles.net/) – French lyrics scraping

## Usage

```
GET /?name=Song%20Title&artist=Artist%20Name
```

Response: plain text lyrics.

## Deploy

```bash
npm install
npm run publish
```

You will need the [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) configured with your Cloudflare account.

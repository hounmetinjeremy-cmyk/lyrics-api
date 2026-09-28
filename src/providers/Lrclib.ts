import { fetchJSON } from '../utils'
import { Provider, SearchParams } from './Provider'

const BASE_URL = 'https://lrclib.net/api'

export interface LrclibSearchResult {
  id: number
  name: string
  artistName: string
  albumName: string
  duration?: number
  plainLyrics?: string
  syncedLyrics?: string
}

export class Lrclib implements Provider {
  private async search(query: string) {
    const encoded = encodeURIComponent(query.trim().slice(0, 120))
    const results = await fetchJSON<LrclibSearchResult[]>(
      `${BASE_URL}/search?q=${encoded}`,
      {
        headers: {
          'user-agent': 'LyricsFinder/1.0',
          accept: 'application/json',
        },
      },
    )
    return results?.[0]
  }

  async getBestMatched({ name, artist }: SearchParams) {
    const result = await this.search(`${artist} ${name}`)
    return result?.plainLyrics
  }
}

export interface ListeningResult {
  artistName: string
  name: string
  albumName?: string
  lyrics: string
  source: string
}

export async function findByLyricsSnippet(snippet: string): Promise<ListeningResult | undefined> {
  const encoded = encodeURIComponent(snippet.trim().slice(0, 200))
  const results = await fetchJSON<LrclibSearchResult[]>(
    `${BASE_URL}/search?q=${encoded}`,
    {
      headers: {
        'user-agent': 'LyricsFinder/1.0',
        accept: 'application/json',
      },
    },
  )
  if (!results || results.length === 0) return

  const best = results[0]
  return {
    artistName: best.artistName,
    name: best.name,
    albumName: best.albumName,
    lyrics: best.plainLyrics ?? best.syncedLyrics ?? '',
    source: 'lrclib.net',
  }
}

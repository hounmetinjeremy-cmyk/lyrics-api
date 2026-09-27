import { createURLWithQuery, fetchJSON, fetchText } from '../utils'
import { Provider, SearchParams } from './Provider'
import { stripHtml } from './utils'

const BASE_URL = 'https://genius.com'

export class Genius implements Provider {
  private async search(artist: string, name: string): Promise<string | undefined> {
    const url = createURLWithQuery(new URL('/api/search', BASE_URL), {
      q: `${artist} ${name}`,
    })
    const data = await fetchJSON<{ response?: { hits?: { result: { url: string } }[] } }>(url)
    return data?.response?.hits?.[0]?.result?.url
  }

  async getBestMatched({ name, artist }: SearchParams): Promise<string | undefined> {
    const songUrl = await this.search(artist, name)
    if (!songUrl) return

    const html = await fetchText(songUrl, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    })

    const matches = [
      ...html.matchAll(/data-lyrics-container="true"[^>]*>([\s\S]*?)<\/div>/gi),
    ]
    if (!matches.length) return

    const lyrics = matches.map((m) => stripHtml(m[1])).filter(Boolean).join('\n\n')
    return lyrics || undefined
  }
}

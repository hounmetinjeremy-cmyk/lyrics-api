import { createURLWithQuery, fetchText } from '../utils'
import { Provider, SearchParams } from './Provider'
import { slugifyHyphen, stripHtml } from './utils'

const BASE_URL = 'https://www.musixmatch.com'

export class Musixmatch implements Provider {
  private async search(artist: string, name: string): Promise<string | undefined> {
    const url = createURLWithQuery(new URL('/search', BASE_URL), { q: `${artist} ${name}` })
    const html = await fetchText(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    // Find first track href.
    const match = html.match(/href="(\/lyrics\/[^"]+)"/)
    return match ? `${BASE_URL}${match[1]}` : undefined
  }

  async getBestMatched({ name, artist }: SearchParams) {
    try {
      const songUrl = await this.search(artist, name)
      if (!songUrl) return
      const html = await fetchText(songUrl, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })
      // Musixmatch lyrics are loaded via hydrated JSON; try to extract directly first.
      const m = html.match(/"lyrics":\s*"((?:\\"|[^"])+)"/)
      if (m) {
        return m[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .trim()
      }
      // Fallback to any visible lyrics span.
      const body = html.replace(/<script[\s\S]*?<\/script>/gi, '')
      const match = body.match(/<div class="lyrics[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
      return match ? stripHtml(match[1]) : undefined
    } catch {
      return
    }
  }
}

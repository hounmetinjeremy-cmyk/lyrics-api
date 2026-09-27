import { createURLWithQuery, fetchJSON, fetchText } from '../utils'
import { Provider, SearchParams } from './Provider'

const BASE_URL = 'https://genius.com'

export class Genius implements Provider {
  private async search(artist: string, name: string) {
    const url = createURLWithQuery(new URL('/api/search', BASE_URL), {
      q: `${artist} ${name}`,
    })
    const { response } = await fetchJSON<{ response?: { hits?: { result: { url: string; title: string; primary_artist: { name: string } } }[] } }>(url)
    return response?.hits?.[0]?.result?.url
  }

  async getBestMatched({ name, artist }: SearchParams) {
    const songUrl = await this.search(artist, name)
    if (!songUrl) return

    const html = await fetchText(songUrl)
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    // New Genius layout uses [data-lyrics-container="true"].
    const containers = doc.querySelectorAll('[data-lyrics-container="true"]')
    if (!containers.length) return

    const lyrics = Array.from(containers)
      .map((c) => c.textContent?.trim())
      .filter(Boolean)
      .join('\n\n')

    return lyrics || undefined
  }
}

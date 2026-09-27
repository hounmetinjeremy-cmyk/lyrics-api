import { createURLWithQuery, fetchText } from '../utils'
import { Provider, SearchParams } from './Provider'
import { stripHtml } from './utils'

const BASE_URL = 'https://www.songlyrics.com'

export class SongLyrics implements Provider {
  private async search(artist: string, name: string): Promise<string | undefined> {
    const url = createURLWithQuery(new URL('/index.php', BASE_URL), {
      section: 'search',
      searchW: `${artist} ${name}`,
      submit: 'Search',
    })
    const response = await fetchText(url)
    // First result link from the search result table.
    const match = response.match(/<a href="([^"]+)"[^>]*class="[^"]*song-link[^"]*"/)
    return match ? match[1] : undefined
  }

  async getBestMatched({ name, artist }: SearchParams) {
    try {
      const songUrl = await this.search(artist, name)
      if (!songUrl) return
      const html = await fetchText(songUrl)
      const match = html.match(/<p id="songLyricsDiv"[^>]*>([\s\S]*?)<\/p>/i)
      if (!match) return
      return stripHtml(match[1])
    } catch {
      return
    }
  }
}

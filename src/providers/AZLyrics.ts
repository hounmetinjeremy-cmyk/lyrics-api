import { fetchText } from '../utils'
import { Provider, SearchParams } from './Provider'
import { cleanForUrl, stripHtml } from './utils'

const BASE_URL = 'https://www.azlyrics.com'

export class AZLyrics implements Provider {
  async getBestMatched({ name, artist }: SearchParams) {
    const url = `${BASE_URL}/lyrics/${cleanForUrl(artist)}/${cleanForUrl(name)}.html`
    try {
      const html = await fetchText(url, {
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      })

      // AZLyrics wraps lyrics in a comment + container with no class.
      const match = html.match(/<!-- Usage of azlyrics\.com content by any third-party lyrics provider is prohibited by our licensing agreement\. Sorry about that\. -->\s*<div[^>]*>([\s\S]*?)<\/div>/i)
      if (!match) return
      return stripHtml(match[1])
    } catch {
      return
    }
  }
}

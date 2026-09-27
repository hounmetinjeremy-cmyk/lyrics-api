import { fetchText } from '../utils'
import { Provider, SearchParams } from './Provider'
import { slugifyHyphen, stripHtml } from './utils'

const BASE_URL = 'https://www.paroles.net'

export class ParolesNet implements Provider {
  async getBestMatched({ name, artist }: SearchParams) {
    const url = `${BASE_URL}/${slugifyHyphen(artist)}/paroles-${slugifyHyphen(name)}`
    try {
      const html = await fetchText(url)
      // The lyrics are inside the .song-text wrapper.
      const match = html.match(/<div class="song-text"[^>]*>([\s\S]*?)<\/div>\s*<div class="song-info"/i)
      if (!match) return
      return stripHtml(match[1])
    } catch {
      return
    }
  }
}

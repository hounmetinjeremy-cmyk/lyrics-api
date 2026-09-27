import { fetchText } from '../utils'
import { Provider, SearchParams } from './Provider'

const BASE_URL = 'https://www.paroles.net'

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export class ParolesNet implements Provider {
  async getBestMatched({ name, artist }: SearchParams) {
    const url = `${BASE_URL}/${slugify(artist)}/paroles-${slugify(name)}`
    try {
      const html = await fetchText(url)
      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      // Class used by paroles.net to wrap the song lyrics.
      const container = doc.querySelector('.song-text') || doc.querySelector('[class*="lyrics"]')
      return container?.textContent?.trim() || undefined
    } catch {
      return
    }
  }
}

import { fetchJSON } from '../utils'
import { Provider, SearchParams } from './Provider'

export class LyricsOvh implements Provider {
  async getBestMatched({ name, artist }: SearchParams) {
    const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(name)}`
    const { lyrics } = await fetchJSON<{ lyrics: string }>(url)
    return lyrics
  }
}

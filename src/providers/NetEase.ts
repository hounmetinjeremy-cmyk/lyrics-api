import { createURLWithQuery, fetchJSON } from '../utils'
import { Provider, SearchParams } from './Provider'

const BASE_URL = 'https://music.163.com/api/'

interface ArtistInfo {
  id: number
  name: string
}

const headers = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36',
  cookie: 'NMTID=',
}

export class NetEase implements Provider {
  private async getArtistInfo(artist: string): Promise<ArtistInfo | undefined> {
    const {
      result: { artists },
    } = await fetchJSON<{ result: { artists?: ArtistInfo[] } }>(
      createURLWithQuery(new URL('search/pc', BASE_URL), { s: artist, offset: '0', limit: '1', type: '100' }),
      { headers },
    )
    if (!artists || artists.length === 0) return
    return artists[0]
  }

  async getBestMatched({ name, artist }: SearchParams) {
    const artistInfo = await this.getArtistInfo(artist)
    if (!artistInfo) return
    const artistId = artistInfo.id
    const {
      result: { songs },
    } = await fetchJSON<{ result: { songs?: { id: number; name: string }[] } }>(
      createURLWithQuery(new URL('search/pc', BASE_URL), { s: `${artist} ${name}` }),
      { headers },
    )
    if (!songs || songs.length === 0) return
    const matched = songs.find((song) => song.name.toLowerCase().includes(name.toLowerCase())) ?? songs[0]
    const {
      lrc: { lyric },
    } = await fetchJSON<{ lrc?: { lyric?: string } }>(
      createURLWithQuery(new URL('song/lyric', BASE_URL), { id: String(matched.id), lv: '1' }),
      { headers },
    )
    return lyric
  }
}

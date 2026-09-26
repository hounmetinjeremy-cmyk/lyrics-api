import { Provider } from '.'
import { createURLWithQuery, fetchJSON } from '../utils'
import { SearchParams } from './Provider'

const BASE_URL = 'https://c.y.qq.com/'

interface ArtistInfo {
  mid: string
  name: string
}

export class QQMusic implements Provider {
  private async getArtistInfo(artist: string): Promise<ArtistInfo | undefined> {
    const {
      data: { singer },
    } = await fetchJSON<{ data?: { singer?: { mid: string; name: string }[] } }>(
      createURLWithQuery(new URL('splcloud/fcgi-bin/smartbox_new.fcg', BASE_URL), { key: artist }),
    )
    if (!singer || singer.length === 0) return
    return singer[0]
  }

  async getBestMatched({ name, artist }: SearchParams) {
    const artistInfo = await this.getArtistInfo(artist)
    if (!artistInfo) return
    const {
      data: { list },
    } = await fetchJSON<{ data?: { list?: { songmid: string; songname: string }[] } }>(
      createURLWithQuery(new URL('soso/fcgi-bin/client_search_cp', BASE_URL), {
        ct: '24',
        qqmusic_ver: '1298',
        new_json: '1',
        remoteplace: 'txt.yqq.song',
        searchid: '',
        t: '0',
        aggr: '1',
        cr: '1',
        catZhida: '1',
        lossless: '0',
        flag_qc: '0',
        p: '1',
        n: '10',
        w: `${artist} ${name}`,
      }),
    )
    if (!list || list.length === 0) return
    const matched = list.find((item) => item.songname.toLowerCase().includes(name.toLowerCase())) ?? list[0]
    const {
      lyric: { lyric },
    } = await fetchJSON<{ lyric?: { lyric?: string } }>(
      createURLWithQuery(new URL('lyric/fcgi-bin/fcg_query_lyric_new.fcg', BASE_URL), {
        songmid: matched.songmid,
        g_tk: '5381',
      }),
    )
    if (lyric == null) return
    return Buffer.from(lyric, 'base64').toString('utf-8')
  }
}

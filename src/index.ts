import { GitHub, NetEase, Provider, QQMusic, SearchParams } from './providers'
import { createURLWithQuery, getUserId, normalizeLRC } from './utils'

const cache = caches.default

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event))
})

const notFound = () =>
  new Response('Not found', {
    status: 404,
    headers: {
      'content-type': 'text/plain',
      'cache-control': 'no-cache',
    },
  })

const handleRequest = async (event: FetchEvent) => {
  const { request } = event
  const { pathname } = new URL(request.url)
  const lyricsUrl = createURLWithQuery(new URL(pathname, request.url), {} as Record<string, string>)
  const cacheKey = new Request(lyricsUrl, request)
  let response = await cache.match(cacheKey)
  if (response) return response
  response = await resolveLyrics(request)
  if (!response) return notFound()
  event.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}

const resolveLyrics = async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const rawName = searchParams.get('name') ?? ''
  const rawArtist = searchParams.get('artist') ?? ''
  if (!rawName || !rawArtist) return

  const [name, artist] = [rawName, rawArtist].map((text) => text.replace(/\(.*\)|\[.*\]/g, '').trim())
  const searchParamsObj: SearchParams = { name, artist, rawName, rawArtist }

  for (const provider of [new GitHub(), new NetEase(), new QQMusic()] as Provider[]) {
    try {
      const lyrics = await provider.getBestMatched(searchParamsObj)
      if (lyrics) {
        return new Response(normalizeLRC(lyrics), {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'max-age=86400',
          },
        })
      }
    } catch (e) {}
  }

  const userId = await getUserId(request)
  await logToLogflare({ name, artist, userId })
}

const logToLogflare = async (payload: any) => {
  if (typeof LOGFLARE_SOURCE === 'undefined' || typeof LOGFLARE_API_KEY === 'undefined') return
  fetch('https://api.logflare.app/logs/json', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': LOGFLARE_API_KEY,
    },
    body: JSON.stringify([payload]),
  })
}

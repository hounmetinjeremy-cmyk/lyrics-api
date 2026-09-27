import {
  AZLyrics,
  Genius,
  GitHub,
  LyricsOvh,
  Musixmatch,
  ParolesNet,
  Provider,
  SearchParams,
  SongLyrics,
} from './providers'
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

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  if (pathname !== '/') {
    return notFound()
  }

  const { searchParams } = new URL(request.url)
  const rawName = searchParams.get('name') ?? ''
  const rawArtist = searchParams.get('artist') ?? ''

  if (!rawName || !rawArtist) {
    return new Response('Missing name or artist', {
      status: 400,
      headers: { 'content-type': 'text/plain' },
    })
  }

  const name = rawName.toLowerCase()
  const artist = rawArtist.toLowerCase()

  const cacheKey = new URL(
    createURLWithQuery(new URL('https://cache/'), { name, artist }),
    request.url,
  ).toString()

  let response = await cache.match(cacheKey)
  if (response) return response

  const searchParamsObj: SearchParams = { name, artist, rawName, rawArtist }

  const providers: Provider[] = [
    new LyricsOvh(),
    new Genius(),
    new AZLyrics(),
    new SongLyrics(),
    new Musixmatch(),
    new GitHub(),
    new ParolesNet(),
  ]

  let lyrics: string | undefined
  for (const provider of providers) {
    try {
      lyrics = await provider.getBestMatched(searchParamsObj)
      if (lyrics) break
    } catch {
      // Try next provider.
    }
  }

  if (lyrics == null) {
    return notFound()
  }

  const normalizedLyrics = normalizeLRC(lyrics)

  response = new Response(normalizedLyrics, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
      'x-user-id': await getUserId(request),
    },
  })

  event.waitUntil(cache.put(cacheKey, response.clone()))

  return response
}

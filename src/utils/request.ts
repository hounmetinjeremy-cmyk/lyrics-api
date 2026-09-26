export const createURLWithQuery = (url: string | URL, query: Record<string, string>): string => {
  url = new URL(String(url))
  for (const [name, value] of Object.entries(query)) url.searchParams.append(name, value)
  return String(url)
}

const assertResponseOk = (response: Response): Response => {
  if (!response.ok) throw new Error(`unexpected status code: ${response.status}`)
  return response
}

export function withTimeout<F extends (...args: any[]) => any>(this: any, f: F, timeout: number) {
  const that = this
  return function (...args: Parameters<F>): Promise<ReturnType<F>> {
    return Promise.race([
      f.apply(that, args),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout)),
    ]) as Promise<ReturnType<F>>
  }
}

export const fetchText = async (input: string, init?: RequestInit): Promise<string> =>
  assertResponseOk(await withTimeout(fetch, 5000)(input, init)).text()

export const fetchJSON = async <T>(input: string, init?: RequestInit): Promise<T> =>
  assertResponseOk(await withTimeout(fetch, 5000)(input, init)).json()

export const NASA_PDS_SEARCH_URL = 'https://pds.nasa.gov/api/search/1/products'

const PDS_FILE_HOSTS = new Set([
  'pds-geosciences.wustl.edu',
  'imbrium.mit.edu',
])

export interface PdsSearchResult {
  queryUrl: string
  raw: unknown
}

async function checkedFetch(url: URL): Promise<Response> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`NASA PDS request failed with HTTP ${response.status} ${response.statusText}: ${url.href}`)
  }
  return response
}

export async function searchPdsProducts(keywords: string, limit = 20): Promise<PdsSearchResult> {
  const url = new URL(NASA_PDS_SEARCH_URL)
  url.search = new URLSearchParams({ keywords, limit: String(limit) }).toString()
  const response = await checkedFetch(url)
  let raw: unknown
  try {
    raw = await response.json() as unknown
  } catch (error) {
    throw new Error(`NASA PDS Search API returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
  return { queryUrl: url.href, raw }
}

export async function fetchPdsLabel(urlString: string): Promise<string> {
  const url = validatePdsUrl(urlString)
  const response = await checkedFetch(url)
  return response.text()
}

export async function fetchPdsProduct(urlString: string): Promise<ArrayBuffer> {
  const url = validatePdsUrl(urlString)
  const response = await checkedFetch(url)
  return response.arrayBuffer()
}

function validatePdsUrl(urlString: string): URL {
  const url = new URL(urlString)
  if (url.protocol !== 'https:' || !PDS_FILE_HOSTS.has(url.hostname)) {
    throw new Error(`Refusing a non-NASA planetary data URL: ${url.href}`)
  }
  return url
}

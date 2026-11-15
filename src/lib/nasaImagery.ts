import type { Planet } from '@/types'

interface NasaImageItem {
  href?: string
  data?: Array<{ title?: string; media_type?: string }>
  links?: Array<{ href?: string; rel?: string }>
}

interface NasaSearchResponse {
  collection?: { items?: NasaImageItem[] }
}

function requireOk(response: Response, resource: string): void {
  if (!response.ok) {
    throw new Error(`NASA ${resource} request failed (${response.status}).`)
  }
}

export async function fetchPlanetImage(planet: Planet, signal: AbortSignal) {
  const query =
    planet === 'mars'
      ? 'Mars globe'
      : 'Moon'
  const searchUrl = new URL('https://images-api.nasa.gov/search')
  searchUrl.searchParams.set('q', query)
  searchUrl.searchParams.set('media_type', 'image')
  searchUrl.searchParams.set('page_size', '30')

  const searchResponse = await fetch(searchUrl, { signal })
  requireOk(searchResponse, 'Image Library')
  const searchData = (await searchResponse.json()) as NasaSearchResponse
  const items = (searchData.collection?.items ?? []).filter(
    (item) => item.href && item.data?.[0]?.media_type === 'image',
  )

  if (items.length === 0) {
    throw new Error(`NASA Image Library returned no images for ${planet}.`)
  }

  const preferredItem =
    items.find((item) => /planet|global|globe|full disk|nearside/i.test(item.data?.[0]?.title ?? '')) ??
    items[0]
  const preview = preferredItem.links?.find((link) => link.rel === 'preview')?.href

  if (!preview) {
    throw new Error(`NASA Image Library returned no preview for ${planet}.`)
  }

  const collectionResponse = await fetch(preferredItem.href!, { signal })
  requireOk(collectionResponse, 'Image Asset')
  const collection = (await collectionResponse.json()) as string[]
  const assetUrl =
    collection.find((url) => /~large\.(jpg|png)$/i.test(url)) ??
    collection.find((url) => /~medium\.(jpg|png)$/i.test(url)) ??
    preview

  return {
    url: assetUrl.replace(/^http:/, 'https:'),
    title: preferredItem.data?.[0]?.title ?? `${planet} image`,
    source: 'NASA Image and Video Library',
  }
}

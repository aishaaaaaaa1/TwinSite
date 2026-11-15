import type { IncomingMessage, ServerResponse } from 'node:http'

const GRANULE_ID = /^NASADEM_HGT_[ns]\d{2}[ew]\d{3}$/i
const NASADEM_BASE_URL = 'https://data.lpdaac.earthdatacloud.nasa.gov/lp-prod-protected/NASADEM_HGT.001'

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
): Promise<void> {
  if (request.method !== 'GET') {
    response.writeHead(405, { Allow: 'GET' })
    response.end('Method not allowed.')
    return
  }

  const token = request.headers.authorization?.match(/^Bearer\s+(\S+)$/i)?.[1]
  if (!token) {
    response.writeHead(401, { 'Cache-Control': 'no-store' })
    response.end('NASA Earthdata bearer token is required.')
    return
  }

  const granuleId = request.url?.split('?')[0]?.split('/').pop()
  if (!granuleId || !GRANULE_ID.test(granuleId)) {
    response.writeHead(400, { 'Cache-Control': 'no-store' })
    response.end('Invalid NASADEM granule identifier.')
    return
  }

  try {
    const url = `${NASADEM_BASE_URL}/${granuleId}/${granuleId}.zip`
    const nasaResponse = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      redirect: 'follow',
    })
    if (new URL(nasaResponse.url).hostname !== 'data.lpdaac.earthdatacloud.nasa.gov') {
      response.writeHead(401, { 'Cache-Control': 'no-store' })
      response.end('NASA Earthdata did not authorize this NASADEM download. Check the user token.')
      return
    }
    if (!nasaResponse.ok) {
      response.writeHead(nasaResponse.status, { 'Cache-Control': 'no-store' })
      response.end(`NASA Earthdata download failed with HTTP ${nasaResponse.status}.`)
      return
    }

    const archive = Buffer.from(await nasaResponse.arrayBuffer())
    if (archive[0] !== 0x50 || archive[1] !== 0x4b) {
      response.writeHead(502, { 'Cache-Control': 'no-store' })
      response.end('NASA returned an invalid NASADEM ZIP archive.')
      return
    }
    response.writeHead(200, {
      'Cache-Control': 'no-store',
      'Content-Length': String(archive.byteLength),
      'Content-Type': 'application/zip',
    })
    response.end(archive)
  } catch (error) {
    response.writeHead(502, { 'Cache-Control': 'no-store' })
    response.end(`NASA Earthdata proxy failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

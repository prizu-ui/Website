export function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

export async function readRawBody(req) {
  if (req.body !== undefined) {
    if (Buffer.isBuffer(req.body)) return req.body
    if (typeof req.body === 'string') return Buffer.from(req.body, 'utf8')
    return Buffer.from(JSON.stringify(req.body), 'utf8')
  }
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body
  }
  const raw = await readRawBody(req)
  if (!raw.length) return {}
  try {
    return JSON.parse(raw.toString('utf8'))
  } catch {
    return {}
  }
}

export function getPathAndQuery(req) {
  const host = req.headers.host || 'localhost'
  const url = new URL(req.url || '/', `http://${host}`)
  const rewrittenPath = url.searchParams.get('__path')
  let pathname = url.pathname
  if (rewrittenPath !== null) {
    pathname = `/api/${rewrittenPath.replace(/^\/+/, '')}`
    url.searchParams.delete('__path')
  }
  return {
    pathname,
    searchParams: url.searchParams,
  }
}

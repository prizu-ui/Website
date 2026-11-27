import { getPathAndQuery, sendJson } from '../server/http.js'
import { handleStoreRoutes } from '../server/routes/store.js'
import { handleAdminRoutes } from '../server/routes/admin.js'

export default async function handler(req, res) {
  try {
    const { pathname, searchParams } = getPathAndQuery(req)

    const storeHandled = await handleStoreRoutes(req, res, pathname, searchParams)
    if (storeHandled !== null) return

    const adminHandled = await handleAdminRoutes(req, res, pathname)
    if (adminHandled !== null) return

    return sendJson(res, 404, { success: false, error: `API route not found: ${pathname}` })
  } catch (err) {
    console.error('[API error]', err)
    return sendJson(res, 500, { success: false, error: err?.message || 'Internal server error' })
  }
}

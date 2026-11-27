import { requireAdmin } from '../supabase.js'
import { readJsonBody, sendJson } from '../http.js'

const BUCKET = 'product-images'
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

export async function handleAdminRoutes(req, res, pathname) {
  if (!pathname.startsWith('/api/admin')) return null

  const auth = await requireAdmin(req)
  if (auth.errorStatus) {
    return sendJson(res, auth.errorStatus, { success: false, error: auth.errorMessage })
  }
  const { supabase, admin } = auth

  // GET /api/admin/me
  if (pathname === '/api/admin/me' && req.method === 'GET') {
    return sendJson(res, 200, { success: true, data: admin })
  }

  // GET /api/admin/bootstrap — loads full admin dataset in one call
  if (pathname === '/api/admin/bootstrap' && req.method === 'GET') {
    const [
      { data: categories },
      { data: products },
      { data: deliveryMethods },
      { data: sameDayPincodes },
      { data: coupons },
      { data: orders },
    ] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase
        .from('products')
        .select(
          '*, variants:product_variants(*, images:variant_images(*)), category:categories(*), combo_items!combo_product_id(*, product:product_id(*, variants:product_variants(*, images:variant_images(*))))'
        )
        .order('created_at', { ascending: false }),
      supabase.from('delivery_methods').select('*').order('sort_order'),
      supabase.from('same_day_delivery_pincodes').select('*').order('pincode'),
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase
        .from('orders')
        .select('*, order_items(*), gst_invoice:gst_invoices(*)')
        .order('created_at', { ascending: false }),
    ])

    return sendJson(res, 200, {
      success: true,
      data: {
        categories: categories || [],
        products: products || [],
        deliveryMethods: deliveryMethods || [],
        sameDayPincodes: sameDayPincodes || [],
        coupons: coupons || [],
        orders: orders || [],
      },
    })
  }

  // POST /api/admin/upload — upload base64 dataUrl to Supabase Storage
  if (pathname === '/api/admin/upload' && req.method === 'POST') {
    const { dataUrl, fileName, contentType } = await readJsonBody(req)
    if (!dataUrl || typeof dataUrl !== 'string') {
      return sendJson(res, 400, { success: false, error: 'Missing image payload' })
    }
    const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
    if (!match) {
      return sendJson(res, 400, { success: false, error: 'Invalid base64 image data' })
    }
    const mime = contentType || match[1]
    if (!ALLOWED_MIME.includes(mime)) {
      return sendJson(res, 400, { success: false, error: 'Unsupported image format' })
    }
    const buffer = Buffer.from(match[2], 'base64')
    if (buffer.length > 10 * 1024 * 1024) {
      return sendJson(res, 400, { success: false, error: 'Image exceeds 10 MB limit' })
    }

    const ext = (fileName?.split('.').pop() || mime.split('/')[1] || 'png').toLowerCase()
    const storagePath = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: mime, upsert: false })

    if (uploadErr) {
      return sendJson(res, 400, { success: false, error: uploadErr.message })
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)

    return sendJson(res, 200, { success: true, data: { url: publicUrl, storage_path: storagePath } })
  }

  // Categories CRUD
  if (pathname === '/api/admin/categories' && req.method === 'POST') {
    const body = await readJsonBody(req)
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        sort_order: Number(body.sort_order || 0),
        is_active: body.is_active !== false,
      })
      .select()
      .single()
    if (error) return sendJson(res, 400, { success: false, error: error.message })
    return sendJson(res, 200, { success: true, data })
  }

  if (pathname.startsWith('/api/admin/categories/')) {
    const id = pathname.slice('/api/admin/categories/'.length)
    if (req.method === 'PATCH') {
      const body = await readJsonBody(req)
      const { data, error } = await supabase
        .from('categories')
        .update({
          name: body.name,
          slug: body.slug,
          description: body.description || null,
          sort_order: Number(body.sort_order || 0),
        })
        .eq('id', id)
        .select()
        .single()
      if (error) return sendJson(res, 400, { success: false, error: error.message })
      return sendJson(res, 200, { success: true, data })
    }
    if (req.method === 'DELETE') {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) return sendJson(res, 400, { success: false, error: error.message })
      return sendJson(res, 200, { success: true })
    }
  }

  // Products CRUD
  if (pathname === '/api/admin/products' && req.method === 'POST') {
    const body = await readJsonBody(req)
    const { variants = [], combo_items = [], ...productFields } = body

    const { data: product, error: pErr } = await supabase
      .from('products')
      .insert({
        name: productFields.name,
        slug: productFields.slug,
        description: productFields.description || null,
        category_id: productFields.category_id || null,
        is_combo: !!productFields.is_combo,
        base_price: Number(productFields.base_price || 0),
        hsn_code: productFields.hsn_code || '6109',
        gst_rate: Number(productFields.gst_rate ?? 18),
        price_includes_gst: productFields.price_includes_gst !== false,
        is_active: productFields.is_active !== false,
        is_featured: !!productFields.is_featured,
        tags: productFields.tags || [],
      })
      .select()
      .single()

    if (pErr || !product) {
      return sendJson(res, 400, { success: false, error: pErr?.message || 'Failed to create product' })
    }

    for (let i = 0; i < variants.length; i += 1) {
      const v = variants[i]
      const { data: insertedVar, error: vErr } = await supabase
        .from('product_variants')
        .insert({
          product_id: product.id,
          name: v.name,
          attributes: v.attributes || {},
          price: Number(v.price || 0),
          compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
          stock: Number(v.stock || 0),
          allow_backorder: !!v.allow_backorder,
          sku: v.sku || null,
          is_active: v.is_active !== false,
          sort_order: i + 1,
        })
        .select()
        .single()
      if (vErr) return sendJson(res, 400, { success: false, error: vErr.message })

      const realImgs = (v.images || []).filter((img) => img.url)
      if (realImgs.length) {
        await supabase.from('variant_images').insert(
          realImgs.map((img, idx) => ({
            variant_id: insertedVar.id,
            url: img.url,
            storage_path: img.storage_path || null,
            alt: img.alt || product.name,
            sort_order: idx,
          }))
        )
      }
    }

    if (product.is_combo && combo_items.length) {
      await supabase.from('combo_items').insert(
        combo_items.map((ci) => ({
          combo_product_id: product.id,
          product_id: ci.product_id,
          quantity: Number(ci.quantity || 1),
        }))
      )
    }

    return sendJson(res, 200, { success: true, data: product })
  }

  if (pathname.startsWith('/api/admin/products/')) {
    const id = pathname.slice('/api/admin/products/'.length)
    if (req.method === 'PATCH') {
      const body = await readJsonBody(req)
      const { variants = [], combo_items = [], ...productFields } = body

      const { data: product, error: pErr } = await supabase
        .from('products')
        .update({
          name: productFields.name,
          slug: productFields.slug,
          description: productFields.description || null,
          category_id: productFields.category_id || null,
          is_combo: !!productFields.is_combo,
          base_price: Number(productFields.base_price || 0),
          hsn_code: productFields.hsn_code || '6109',
          gst_rate: Number(productFields.gst_rate ?? 18),
          price_includes_gst: productFields.price_includes_gst !== false,
          is_active: productFields.is_active !== false,
          is_featured: !!productFields.is_featured,
          tags: productFields.tags || [],
        })
        .eq('id', id)
        .select()
        .single()

      if (pErr || !product) {
        return sendJson(res, 400, { success: false, error: pErr?.message || 'Failed to update product' })
      }

      // Replace variants & images cleanly (preserve existing variant IDs if UUID)
      const { data: existingVars } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', id)

      const existingIds = new Set((existingVars || []).map((v) => v.id))
      const incomingUuidIds = new Set(
        variants.map((v) => v.id).filter((vid) => vid && existingIds.has(vid))
      )

      const toDelete = [...existingIds].filter((vid) => !incomingUuidIds.has(vid))
      if (toDelete.length) {
        await supabase.from('product_variants').delete().in('id', toDelete)
      }

      for (let i = 0; i < variants.length; i += 1) {
        const v = variants[i]
        const isExisting = v.id && existingIds.has(v.id)
        const payload = {
          product_id: id,
          name: v.name,
          attributes: v.attributes || {},
          price: Number(v.price || 0),
          compare_at_price: v.compare_at_price ? Number(v.compare_at_price) : null,
          stock: Number(v.stock || 0),
          allow_backorder: !!v.allow_backorder,
          sku: v.sku || null,
          is_active: v.is_active !== false,
          sort_order: i + 1,
        }

        let variantId = v.id
        if (isExisting) {
          const { error: uErr } = await supabase.from('product_variants').update(payload).eq('id', v.id)
          if (uErr) return sendJson(res, 400, { success: false, error: uErr.message })
        } else {
          const { data: ins, error: iErr } = await supabase
            .from('product_variants')
            .insert(payload)
            .select()
            .single()
          if (iErr) return sendJson(res, 400, { success: false, error: iErr.message })
          variantId = ins.id
        }

        await supabase.from('variant_images').delete().eq('variant_id', variantId)
        const realImgs = (v.images || []).filter((img) => img.url)
        if (realImgs.length) {
          await supabase.from('variant_images').insert(
            realImgs.map((img, idx) => ({
              variant_id: variantId,
              url: img.url,
              storage_path: img.storage_path || null,
              alt: img.alt || product.name,
              sort_order: idx,
            }))
          )
        }
      }

      await supabase.from('combo_items').delete().eq('combo_product_id', id)
      if (product.is_combo && combo_items.length) {
        await supabase.from('combo_items').insert(
          combo_items.map((ci) => ({
            combo_product_id: id,
            product_id: ci.product_id,
            quantity: Number(ci.quantity || 1),
          }))
        )
      }

      return sendJson(res, 200, { success: true, data: product })
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) return sendJson(res, 400, { success: false, error: error.message })
      return sendJson(res, 200, { success: true })
    }
  }

  // Coupons CRUD
  if (pathname === '/api/admin/coupons' && req.method === 'POST') {
    const body = await readJsonBody(req)
    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: String(body.code || '').toUpperCase().trim(),
        description: body.description || null,
        type: body.type,
        value: Number(body.value || 0),
        min_order_amount: Number(body.min_order_amount || 0),
        max_discount: body.max_discount ? Number(body.max_discount) : null,
        usage_limit: body.usage_limit ? Number(body.usage_limit) : null,
        is_active: body.is_active !== false,
        valid_from: body.valid_from || new Date().toISOString(),
        valid_until: body.valid_until || null,
        is_first_order_only: !!body.is_first_order_only,
        buy_quantity: body.buy_quantity ? Number(body.buy_quantity) : null,
        get_quantity: body.get_quantity ? Number(body.get_quantity) : null,
      })
      .select()
      .single()
    if (error) return sendJson(res, 400, { success: false, error: error.message })
    return sendJson(res, 200, { success: true, data })
  }

  if (pathname.startsWith('/api/admin/coupons/')) {
    const id = pathname.slice('/api/admin/coupons/'.length)
    if (req.method === 'PATCH') {
      const body = await readJsonBody(req)
      const { data, error } = await supabase
        .from('coupons')
        .update({
          code: String(body.code || '').toUpperCase().trim(),
          description: body.description || null,
          type: body.type,
          value: Number(body.value || 0),
          min_order_amount: Number(body.min_order_amount || 0),
          max_discount: body.max_discount ? Number(body.max_discount) : null,
          usage_limit: body.usage_limit ? Number(body.usage_limit) : null,
          is_active: body.is_active !== false,
          valid_from: body.valid_from || new Date().toISOString(),
          valid_until: body.valid_until || null,
          is_first_order_only: !!body.is_first_order_only,
          buy_quantity: body.buy_quantity ? Number(body.buy_quantity) : null,
          get_quantity: body.get_quantity ? Number(body.get_quantity) : null,
        })
        .eq('id', id)
        .select()
        .single()
      if (error) return sendJson(res, 400, { success: false, error: error.message })
      return sendJson(res, 200, { success: true, data })
    }
    if (req.method === 'DELETE') {
      const { error } = await supabase.from('coupons').delete().eq('id', id)
      if (error) return sendJson(res, 400, { success: false, error: error.message })
      return sendJson(res, 200, { success: true })
    }
  }

  // Delivery Methods update
  if (pathname.startsWith('/api/admin/delivery-methods/') && req.method === 'PATCH') {
    const id = pathname.slice('/api/admin/delivery-methods/'.length)
    const body = await readJsonBody(req)
    const { data, error } = await supabase
      .from('delivery_methods')
      .update({
        price: body.price !== undefined ? Number(body.price) : undefined,
        description: body.description,
        estimated_days: body.estimated_days,
        is_active: body.is_active,
        sort_order: body.sort_order !== undefined ? Number(body.sort_order) : undefined,
      })
      .eq('id', id)
      .select()
      .single()
    if (error) return sendJson(res, 400, { success: false, error: error.message })
    return sendJson(res, 200, { success: true, data })
  }

  // Same-day pincodes
  if (pathname === '/api/admin/same-day-pincodes') {
    if (req.method === 'POST') {
      const { pincode, area_name } = await readJsonBody(req)
      if (!/^\d{6}$/.test(String(pincode || ''))) {
        return sendJson(res, 400, { success: false, error: 'Enter a valid 6-digit pincode' })
      }
      const { data, error } = await supabase
        .from('same_day_delivery_pincodes')
        .insert({ pincode, area_name: area_name || null, is_active: true })
        .select()
        .single()
      if (error) return sendJson(res, 400, { success: false, error: error.message })
      return sendJson(res, 200, { success: true, data })
    }
    if (req.method === 'DELETE') {
      const { pincode } = await readJsonBody(req)
      const { error } = await supabase
        .from('same_day_delivery_pincodes')
        .delete()
        .eq('pincode', pincode)
      if (error) return sendJson(res, 400, { success: false, error: error.message })
      return sendJson(res, 200, { success: true })
    }
  }

  // Orders mark-paid
  if (pathname.startsWith('/api/admin/orders/') && pathname.endsWith('/mark-paid') && req.method === 'POST') {
    const id = pathname.slice('/api/admin/orders/'.length, -'/mark-paid'.length)
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .select('*, gst_invoice:gst_invoices(*)')
      .eq('id', id)
      .single()
    if (oErr || !order) {
      return sendJson(res, 404, { success: false, error: 'Order not found' })
    }

    const nowIso = new Date().toISOString()
    await supabase
      .from('orders')
      .update({ payment_status: 'PAID', payment_at: nowIso })
      .eq('id', id)

    let invoice = order.gst_invoice
    if (!invoice) {
      const { data: invoiceNum } = await supabase.rpc('generate_invoice_number', {
        has_gstin: !!order.customer_gstin,
      })
      const { data: invRow } = await supabase
        .from('gst_invoices')
        .insert({
          order_id: id,
          invoice_number: invoiceNum || `SO-SB-${Date.now()}`,
          invoice_date: nowIso,
        })
        .select()
        .single()
      invoice = invRow
    }

    return sendJson(res, 200, { success: true, data: { payment_status: 'PAID', gst_invoice: invoice } })
  }

  // Orders update
  if (pathname.startsWith('/api/admin/orders/') && req.method === 'PATCH') {
    const id = pathname.slice('/api/admin/orders/'.length)
    const body = await readJsonBody(req)
    const updates = {
      order_status: body.order_status,
      awb_number: body.awb_number || null,
      courier_name: body.courier_name || null,
    }
    if (body.order_status === 'SHIPPED') updates.shipped_at = new Date().toISOString()
    if (body.order_status === 'DELIVERED') updates.delivered_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) return sendJson(res, 400, { success: false, error: error.message })
    return sendJson(res, 200, { success: true, data })
  }

  return sendJson(res, 404, { success: false, error: `Unknown admin route: ${pathname}` })
}

import { getServiceClient } from '../supabase.js'
import { readJsonBody, sendJson } from '../http.js'
import {
  calculateGstFromExclusivePrice,
  calculateGstFromInclusivePrice,
  calculateOrderTax,
  round2,
} from '../../src/merch/gst.js'

function generateMerchantTransactionId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `SB${timestamp}${random}`
}

export async function handleStoreRoutes(req, res, pathname, searchParams) {
  // 1. GET /api/store/catalog
  if (pathname === '/api/store/catalog' && req.method === 'GET') {
    const supabase = getServiceClient()
    const [{ data: categories, error: catErr }, { data: products, error: prodErr }, { data: deliveryMethods, error: dmErr }] =
      await Promise.all([
        supabase.from('categories').select('*').eq('is_active', true).order('sort_order'),
        supabase
          .from('products')
          .select(
            '*, variants:product_variants(*, images:variant_images(*)), category:categories(*), combo_items!combo_product_id(*, product:product_id(*, variants:product_variants(*, images:variant_images(*))))'
          )
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabase.from('delivery_methods').select('*').eq('is_active', true).order('sort_order'),
      ])

    if (catErr || prodErr || dmErr) {
      return sendJson(res, 500, {
        success: false,
        error: catErr?.message || prodErr?.message || dmErr?.message || 'Failed to load catalog',
      })
    }

    return sendJson(res, 200, {
      success: true,
      data: {
        categories: categories || [],
        products: products || [],
        deliveryMethods: deliveryMethods || [],
      },
    })
  }

  // 2. GET /api/delivery-methods?pincode=...
  if (pathname === '/api/delivery-methods' && req.method === 'GET') {
    const supabase = getServiceClient()
    const pincode = searchParams.get('pincode')
    const { data: methods, error } = await supabase
      .from('delivery_methods')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')

    if (error) return sendJson(res, 500, { success: false, error: error.message })
    if (!methods?.length) return sendJson(res, 200, { success: true, data: [], sameDayEligible: false })

    if (pincode && /^\d{6}$/.test(pincode)) {
      const { data: eligible } = await supabase
        .from('same_day_delivery_pincodes')
        .select('pincode')
        .eq('pincode', pincode)
        .eq('is_active', true)
        .maybeSingle()

      const pincodeEligible = !!eligible
      return sendJson(res, 200, {
        success: true,
        data: methods.filter((m) => m.type !== 'SAME_DAY' || pincodeEligible),
        sameDayEligible: pincodeEligible,
      })
    }

    return sendJson(res, 200, {
      success: true,
      data: methods.filter((m) => m.type !== 'SAME_DAY'),
      sameDayEligible: false,
    })
  }

  // 3. POST /api/coupons/validate
  if (pathname === '/api/coupons/validate' && req.method === 'POST') {
    const { code, cartTotal, customerEmail } = await readJsonBody(req)
    if (!code) {
      return sendJson(res, 400, { success: false, error: 'Coupon code required' })
    }

    const supabase = getServiceClient()
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', String(code).toUpperCase().trim())
      .eq('is_active', true)
      .maybeSingle()

    if (!coupon) {
      return sendJson(res, 200, { success: false, error: 'Invalid or expired coupon code' })
    }

    const now = new Date()
    if (coupon.valid_from && now < new Date(coupon.valid_from)) {
      return sendJson(res, 200, { success: false, error: 'This coupon is not yet active' })
    }
    if (coupon.valid_until && now > new Date(coupon.valid_until)) {
      return sendJson(res, 200, { success: false, error: 'This coupon has expired' })
    }
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return sendJson(res, 200, { success: false, error: 'This coupon has reached its usage limit' })
    }
    if (Number(cartTotal) < Number(coupon.min_order_amount || 0)) {
      return sendJson(res, 200, {
        success: false,
        error: `Minimum order amount of ₹${coupon.min_order_amount} required`,
      })
    }

    if (coupon.is_first_order_only && customerEmail) {
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_email', customerEmail)
        .eq('payment_status', 'PAID')

      if ((count || 0) > 0) {
        return sendJson(res, 200, {
          success: false,
          error: 'This coupon is only for first-time orders',
        })
      }
    }

    let discountAmount = 0
    let message = ''
    switch (coupon.type) {
      case 'PERCENTAGE': {
        const disc = Number(cartTotal) * (Number(coupon.value) / 100)
        discountAmount = coupon.max_discount ? Math.min(disc, Number(coupon.max_discount)) : disc
        message = `${coupon.value}% off applied`
        if (coupon.max_discount && disc > Number(coupon.max_discount)) {
          message += ` (capped at ₹${coupon.max_discount})`
        }
        break
      }
      case 'FLAT': {
        discountAmount = Math.min(Number(coupon.value), Number(cartTotal))
        message = `₹${coupon.value} flat discount applied`
        break
      }
      case 'FREE_SHIPPING': {
        discountAmount = 0
        message = 'Free shipping applied!'
        break
      }
      case 'BUY_X_GET_Y': {
        discountAmount = 0
        message = `Buy ${coupon.buy_quantity} Get ${coupon.get_quantity} offer applied`
        break
      }
      default:
        break
    }

    return sendJson(res, 200, {
      success: true,
      data: {
        valid: true,
        discountAmount: round2(discountAmount),
        discountType: coupon.type,
        message,
        coupon,
      },
    })
  }

  // 4. POST /api/orders/create
  if (pathname === '/api/orders/create' && req.method === 'POST') {
    const { cartItems, checkoutData, couponCode } = await readJsonBody(req)
    if (!cartItems?.length) {
      return sendJson(res, 400, { success: false, error: 'Cart is empty' })
    }

    const supabase = getServiceClient()

    const { data: deliveryMethod, error: dmErr } = await supabase
      .from('delivery_methods')
      .select('*')
      .eq('id', checkoutData?.deliveryMethodId)
      .eq('is_active', true)
      .single()

    if (dmErr || !deliveryMethod) {
      return sendJson(res, 400, { success: false, error: 'Invalid delivery method' })
    }

    const variantIds = cartItems.map((i) => i.variantId)
    const { data: variants, error: varErr } = await supabase
      .from('product_variants')
      .select('*, product:products(id, name, hsn_code, gst_rate, price_includes_gst, is_active)')
      .in('id', variantIds)

    if (varErr || !variants?.length) {
      return sendJson(res, 400, { success: false, error: 'Failed to validate cart items' })
    }

    const lineItems = []
    for (const cartItem of cartItems) {
      const variant = variants.find((v) => v.id === cartItem.variantId)
      if (!variant || !variant.product?.is_active || !variant.is_active) {
        return sendJson(res, 400, {
          success: false,
          error: `Product "${cartItem.productName}" is no longer available`,
        })
      }
      if (!cartItem.isCombo && !variant.allow_backorder && variant.stock < cartItem.quantity) {
        return sendJson(res, 400, {
          success: false,
          error: `Insufficient stock for "${cartItem.productName} - ${cartItem.variantName}"`,
        })
      }
      lineItems.push({
        variant,
        cartItem,
        unitPrice: Number(variant.price),
        quantity: Number(cartItem.quantity),
        gstRate: Number(variant.product.gst_rate ?? 18),
        priceIncludesGst: variant.product.price_includes_gst ?? true,
      })
    }

    let coupon = null
    let discountAmount = 0
    if (couponCode) {
      const { data: couponData } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', String(couponCode).toUpperCase().trim())
        .eq('is_active', true)
        .maybeSingle()

      if (couponData) {
        const now = new Date()
        const validFrom = couponData.valid_from ? new Date(couponData.valid_from) : new Date(0)
        const validUntil = couponData.valid_until ? new Date(couponData.valid_until) : null
        if (
          now >= validFrom &&
          (!validUntil || now <= validUntil) &&
          (!couponData.usage_limit || couponData.usage_count < couponData.usage_limit)
        ) {
          const rawSubtotal = lineItems.reduce((sum, li) => {
            const inclusive = li.priceIncludesGst
              ? li.unitPrice
              : calculateGstFromExclusivePrice(li.unitPrice, li.gstRate).priceWithGst
            return sum + inclusive * li.quantity
          }, 0)

          if (rawSubtotal >= Number(couponData.min_order_amount || 0)) {
            if (couponData.is_first_order_only) {
              const { count } = await supabase
                .from('orders')
                .select('id', { count: 'exact', head: true })
                .eq('customer_email', checkoutData.customerEmail)
                .eq('payment_status', 'PAID')
              if ((count || 0) > 0) {
                return sendJson(res, 400, {
                  success: false,
                  error: 'This coupon is only valid for first-time orders',
                })
              }
            }
            coupon = couponData
            if (couponData.type === 'PERCENTAGE') {
              const disc = rawSubtotal * (Number(couponData.value) / 100)
              discountAmount = couponData.max_discount
                ? Math.min(disc, Number(couponData.max_discount))
                : disc
            } else if (couponData.type === 'FLAT') {
              discountAmount = Math.min(Number(couponData.value), rawSubtotal)
            }
          }
        }
      }
    }

    const shippingAmount = coupon?.type === 'FREE_SHIPPING' ? 0 : Number(deliveryMethod.price)
    const tax = calculateOrderTax(
      lineItems.map((li) => ({
        unitPrice: li.unitPrice,
        quantity: li.quantity,
        gstRate: li.gstRate,
        priceIncludesGst: li.priceIncludesGst,
      })),
      discountAmount,
      shippingAmount
    )

    const merchantTransactionId = generateMerchantTransactionId()

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        customer_name: checkoutData.customerName,
        customer_email: checkoutData.customerEmail,
        customer_phone: checkoutData.customerPhone,
        customer_gstin: checkoutData.gstin || null,
        shipping_address: checkoutData.shippingAddress,
        billing_address: checkoutData.billingAddress ?? checkoutData.shippingAddress,
        delivery_method_id: deliveryMethod.id,
        delivery_method_name: deliveryMethod.name,
        subtotal: tax.subtotal,
        discount_amount: tax.discountAmount,
        shipping_amount: tax.shippingAmount,
        taxable_amount: tax.taxableAmount,
        cgst_amount: tax.cgstAmount,
        sgst_amount: tax.sgstAmount,
        total: tax.total,
        coupon_id: coupon?.id || null,
        coupon_code: coupon?.code || null,
        payment_status: 'PENDING',
        payment_method: 'Pay at Event (Cash / UPI)',
        phonepe_merchant_transaction_id: merchantTransactionId,
        order_status: 'PLACED',
        notes: checkoutData.notes || null,
      })
      .select()
      .single()

    if (orderErr || !order) {
      return sendJson(res, 500, {
        success: false,
        error: orderErr?.message || 'Failed to create order',
      })
    }

    const orderItems = lineItems.map((li) => {
      const gst = li.priceIncludesGst
        ? calculateGstFromInclusivePrice(li.unitPrice, li.gstRate)
        : calculateGstFromExclusivePrice(li.unitPrice, li.gstRate)
      return {
        order_id: order.id,
        product_id: li.variant.product_id,
        variant_id: li.variant.id,
        product_name: li.variant.product.name,
        variant_name: li.variant.name,
        variant_attributes: li.variant.attributes || {},
        hsn_code: li.variant.product.hsn_code,
        quantity: li.quantity,
        unit_price: li.unitPrice,
        gst_rate: li.gstRate,
        cgst_amount: round2(gst.cgstAmount * li.quantity),
        sgst_amount: round2(gst.sgstAmount * li.quantity),
        total: round2((li.priceIncludesGst ? li.unitPrice : gst.priceWithGst) * li.quantity),
        image_url: li.cartItem.imageUrl || null,
        ...(li.cartItem.comboSelections ? { combo_selections: li.cartItem.comboSelections } : {}),
      }
    })

    const { data: insertedItems } = await supabase.from('order_items').insert(orderItems).select()

    // Decrement stock for non-combo items & increment coupon usage
    await Promise.all([
      ...lineItems
        .filter((li) => !li.cartItem.isCombo)
        .map((li) =>
          supabase.rpc('decrement_stock', {
            p_variant_id: li.variant.id,
            p_quantity: li.quantity,
          })
        ),
      coupon
        ? supabase
            .from('coupons')
            .update({ usage_count: (coupon.usage_count || 0) + 1 })
            .eq('id', coupon.id)
        : Promise.resolve(),
    ])

    return sendJson(res, 200, {
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        merchantTransactionId,
        total: tax.total,
        order: { ...order, order_items: insertedItems || orderItems, gst_invoice: null },
      },
    })
  }

  // 5. GET /api/orders/:id (accepts UUID id or order_number like SB-2026-0001)
  if (pathname.startsWith('/api/orders/') && req.method === 'GET') {
    const idOrNumber = decodeURIComponent(pathname.slice('/api/orders/'.length))
    if (!idOrNumber) return sendJson(res, 400, { success: false, error: 'Order id required' })

    const supabase = getServiceClient()
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber)
    const query = supabase
      .from('orders')
      .select('*, order_items(*), gst_invoice:gst_invoices(*), delivery_method:delivery_methods(*)')

    const { data: order, error } = isUuid
      ? await query.eq('id', idOrNumber).maybeSingle()
      : await query.ilike('order_number', idOrNumber).maybeSingle()

    if (error) return sendJson(res, 500, { success: false, error: error.message })
    if (!order) return sendJson(res, 404, { success: false, error: 'Order not found' })

    return sendJson(res, 200, { success: true, data: order })
  }

  // 6. GET /api/pincode-lookup/:pincode
  if (pathname.startsWith('/api/pincode-lookup/') && req.method === 'GET') {
    const pincode = pathname.slice('/api/pincode-lookup/'.length)
    if (!/^\d{6}$/.test(pincode)) {
      return sendJson(res, 400, { success: false, error: 'Invalid pincode' })
    }
    try {
      const resp = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      })
      if (!resp.ok) return sendJson(res, 502, { success: false, error: 'Lookup failed' })
      const data = await resp.json()
      const block = data?.[0]
      if (block?.Status !== 'Success' || !block.PostOffice?.length) {
        return sendJson(res, 404, { success: false, error: 'Pincode not found' })
      }
      const { District: district, State: state } = block.PostOffice[0]
      return sendJson(res, 200, { success: true, data: { district, state } })
    } catch {
      return sendJson(res, 502, { success: false, error: 'Lookup service unavailable' })
    }
  }

  return null
}

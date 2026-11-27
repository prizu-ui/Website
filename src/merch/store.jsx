import { useCallback, useEffect, useState } from 'react'
import { STORE_SETTINGS } from './storeConfig.js'
import { supabase } from './supabaseClient.js'
import { MerchContext } from './useMerch.js'
import { PINCODE_REGEX } from './utils.js'

const CART_STORAGE_KEY = 'sb-merch-cart-v2'
const RECENT_ORDER_IDS_KEY = 'sb-merch-recent-order-ids-v2'

function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage quota errors
  }
}

async function apiJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok && json.success === undefined) {
    return { success: false, error: json.error || `Request failed (${res.status})` }
  }
  return json
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read image file'))
    reader.readAsDataURL(file)
  })
}

export function MerchProvider({ children }) {
  const [cart, setCart] = useState(() => readStorage(CART_STORAGE_KEY, []))
  const [recentOrderIds, setRecentOrderIds] = useState(() =>
    readStorage(RECENT_ORDER_IDS_KEY, [])
  )

  // Public storefront data from Supabase
  const [storeCategories, setStoreCategories] = useState([])
  const [storeProducts, setStoreProducts] = useState([])
  const [storeDeliveryMethods, setStoreDeliveryMethods] = useState([])
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [recentOrders, setRecentOrders] = useState([])

  // Private admin session & data from Supabase
  const [adminUser, setAdminUser] = useState(null)
  const [adminToken, setAdminToken] = useState('')
  const [adminLoading, setAdminLoading] = useState(true)
  const [adminCategories, setAdminCategories] = useState([])
  const [adminProducts, setAdminProducts] = useState([])
  const [adminDeliveryMethods, setAdminDeliveryMethods] = useState([])
  const [sameDayPincodes, setSameDayPincodes] = useState([])
  const [coupons, setCoupons] = useState([])
  const [adminOrders, setAdminOrders] = useState([])

  useEffect(() => writeStorage(CART_STORAGE_KEY, cart), [cart])
  useEffect(() => writeStorage(RECENT_ORDER_IDS_KEY, recentOrderIds), [recentOrderIds])

  const refreshCatalog = useCallback(async () => {
    const res = await apiJson('/api/store/catalog')
    if (res.success && res.data) {
      setStoreCategories(res.data.categories || [])
      setStoreProducts(res.data.products || [])
      setStoreDeliveryMethods(res.data.deliveryMethods || [])
      setCatalogError('')
    } else {
      setCatalogError(res.error || 'Unable to load store catalog')
    }
    setLoadingCatalog(false)
  }, [])

  useEffect(() => {
    let active = true
    apiJson('/api/store/catalog').then((res) => {
      if (!active) return
      if (res.success && res.data) {
        setStoreCategories(res.data.categories || [])
        setStoreProducts(res.data.products || [])
        setStoreDeliveryMethods(res.data.deliveryMethods || [])
        setCatalogError('')
      } else {
        setCatalogError(res.error || 'Unable to load store catalog')
      }
      setLoadingCatalog(false)
    })
    return () => {
      active = false
    }
  }, [])

  // Hydrate recent orders saved in this browser from Supabase
  useEffect(() => {
    const ids = readStorage(RECENT_ORDER_IDS_KEY, [])
    if (!ids.length) return
    let active = true
    Promise.all(
      ids.slice(0, 10).map((oid) => apiJson(`/api/orders/${encodeURIComponent(oid)}`))
    ).then((results) => {
      if (!active) return
      const loaded = results.filter((r) => r.success && r.data).map((r) => r.data)
      if (loaded.length) {
        setRecentOrders(loaded)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const loadAdminBootstrap = useCallback(async (token) => {
    if (!token) return false
    const res = await apiJson('/api/admin/bootstrap', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.success || !res.data) return false
    setAdminCategories(res.data.categories || [])
    setAdminProducts(res.data.products || [])
    setAdminDeliveryMethods(res.data.deliveryMethods || [])
    setSameDayPincodes(res.data.sameDayPincodes || [])
    setCoupons(res.data.coupons || [])
    setAdminOrders(res.data.orders || [])
    return true
  }, [])

  // Restore Supabase Auth admin session on mount
  useEffect(() => {
    let active = true

    async function syncSession(session) {
      const token = session?.access_token
      if (!token) {
        if (!active) return
        setAdminUser(null)
        setAdminToken('')
        setAdminLoading(false)
        return
      }

      const me = await apiJson('/api/admin/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!active) return

      if (!me.success || !me.data) {
        setAdminUser(null)
        setAdminToken('')
        setAdminLoading(false)
        return
      }

      setAdminUser(me.data)
      setAdminToken(token)
      await loadAdminBootstrap(token)
      if (active) setAdminLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => {
      syncSession(data?.session || null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session)
    })

    return () => {
      active = false
      listener?.subscription?.unsubscribe()
    }
  }, [loadAdminBootstrap])

  // ─── Cart actions (matching nammaflutter-store/src/store/cart.ts) ───────────
  const addToCart = useCallback((newItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.variantId === newItem.variantId)
      if (existing) {
        const nextQty = existing.quantity + newItem.quantity
        const clampedQty =
          newItem.isCombo || newItem.allowBackorder ? nextQty : Math.min(nextQty, newItem.stock)
        return prev.map((i) =>
          i.variantId === newItem.variantId ? { ...i, quantity: clampedQty } : i
        )
      }
      return [...prev, newItem]
    })
  }, [])

  const removeFromCart = useCallback((variantId) => {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId))
  }, [])

  const updateCartQuantity = useCallback((variantId, quantity) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.variantId !== variantId))
      return
    }
    setCart((prev) =>
      prev.map((i) => {
        if (i.variantId !== variantId) return i
        const clamped = i.isCombo || i.allowBackorder ? quantity : Math.min(quantity, i.stock)
        return { ...i, quantity: clamped }
      })
    )
  }, [])

  const clearCart = useCallback(() => setCart([]), [])

  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0)
  const cartSubtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0)

  // ─── Public Storefront APIs ──────────────────────────────────────────────
  const getDeliveryMethodsForPincode = useCallback(
    (pincode) => {
      const clean = String(pincode || '').trim()
      const hasPin = PINCODE_REGEX.test(clean)
      const sameDayEligible = false
      const methods = storeDeliveryMethods.filter((m) =>
        m.is_active && (m.type !== 'SAME_DAY' || (hasPin && sameDayEligible))
      )
      return { methods, sameDayEligible }
    },
    [storeDeliveryMethods]
  )

  const fetchDeliveryMethods = useCallback(async (pincode) => {
    const query = PINCODE_REGEX.test(String(pincode || '').trim())
      ? `?pincode=${encodeURIComponent(String(pincode).trim())}`
      : ''
    const res = await apiJson(`/api/delivery-methods${query}`)
    if (!res.success) return null
    return {
      methods: res.data || [],
      sameDayEligible: !!res.sameDayEligible,
    }
  }, [])

  const validateCoupon = useCallback(async ({ code, cartTotal, customerEmail }) => {
    const res = await apiJson('/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, cartTotal, customerEmail }),
    })
    if (!res.success) {
      return { valid: false, error: res.error || 'Invalid coupon' }
    }
    return { valid: true, ...res.data }
  }, [])

  const createOrder = useCallback(
    async ({ cartItems, checkoutData, couponCode }) => {
      const res = await apiJson('/api/orders/create', {
        method: 'POST',
        body: JSON.stringify({ cartItems, checkoutData, couponCode }),
      })
      if (!res.success || !res.data?.order) {
        return { success: false, error: res.error || 'Failed to place order' }
      }
      const created = res.data.order
      setRecentOrders((prev) => [created, ...prev.filter((o) => o.id !== created.id)])
      setRecentOrderIds((prev) =>
        [created.id, ...prev.filter((id) => id !== created.id)].slice(0, 10)
      )
      refreshCatalog()
      return res
    },
    [refreshCatalog]
  )

  const fetchOrder = useCallback(async (idOrNumber) => {
    if (!idOrNumber) return null
    const res = await apiJson(`/api/orders/${encodeURIComponent(idOrNumber)}`)
    if (!res.success || !res.data) return null
    setRecentOrders((prev) => {
      const filtered = prev.filter((o) => o.id !== res.data.id)
      return [res.data, ...filtered]
    })
    return res.data
  }, [])

  // ─── Admin Auth & Mutations ──────────────────────────────────────────────
  const loginAdmin = useCallback(
    async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(email || '').trim(),
        password: String(password || ''),
      })
      if (error || !data?.session?.access_token) {
        return { success: false, error: error?.message || 'Invalid email or password' }
      }

      const token = data.session.access_token
      const me = await apiJson('/api/admin/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!me.success || !me.data) {
        await supabase.auth.signOut()
        return { success: false, error: me.error || 'Access denied: not an admin account' }
      }

      setAdminUser(me.data)
      setAdminToken(token)
      await loadAdminBootstrap(token)
      return { success: true }
    },
    [loadAdminBootstrap]
  )

  const logoutAdmin = useCallback(async () => {
    await supabase.auth.signOut()
    setAdminUser(null)
    setAdminToken('')
    setAdminCategories([])
    setAdminProducts([])
    setAdminDeliveryMethods([])
    setSameDayPincodes([])
    setCoupons([])
    setAdminOrders([])
  }, [])

  const adminRequest = useCallback(
    async (url, method, body) => {
      if (!adminToken) return { success: false, error: 'Admin session expired. Please sign in.' }
      const res = await apiJson(url, {
        method,
        headers: { Authorization: `Bearer ${adminToken}` },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
      if (res.success) {
        await Promise.all([loadAdminBootstrap(adminToken), refreshCatalog()])
      }
      return res
    },
    [adminToken, loadAdminBootstrap, refreshCatalog]
  )

  const uploadProductImage = useCallback(
    async (file) => {
      if (!file) return { success: false, error: 'No file selected' }
      if (!adminToken) return { success: false, error: 'Admin session expired' }
      try {
        const dataUrl = await fileToDataUrl(file)
        return await apiJson('/api/admin/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: JSON.stringify({
            dataUrl,
            fileName: file.name,
            contentType: file.type,
          }),
        })
      } catch (err) {
        return { success: false, error: err?.message || 'Upload failed' }
      }
    },
    [adminToken]
  )

  const saveCategory = useCallback(
    (payload, editId = null) =>
      editId
        ? adminRequest(`/api/admin/categories/${encodeURIComponent(editId)}`, 'PATCH', payload)
        : adminRequest('/api/admin/categories', 'POST', payload),
    [adminRequest]
  )

  const deleteCategory = useCallback(
    (id) => adminRequest(`/api/admin/categories/${encodeURIComponent(id)}`, 'DELETE'),
    [adminRequest]
  )

  const saveProduct = useCallback(
    (payload, editId = null) =>
      editId
        ? adminRequest(`/api/admin/products/${encodeURIComponent(editId)}`, 'PATCH', payload)
        : adminRequest('/api/admin/products', 'POST', payload),
    [adminRequest]
  )

  const deleteProduct = useCallback(
    (id) => adminRequest(`/api/admin/products/${encodeURIComponent(id)}`, 'DELETE'),
    [adminRequest]
  )

  const saveCoupon = useCallback(
    (payload, editId = null) =>
      editId
        ? adminRequest(`/api/admin/coupons/${encodeURIComponent(editId)}`, 'PATCH', payload)
        : adminRequest('/api/admin/coupons', 'POST', payload),
    [adminRequest]
  )

  const deleteCoupon = useCallback(
    (id) => adminRequest(`/api/admin/coupons/${encodeURIComponent(id)}`, 'DELETE'),
    [adminRequest]
  )

  const updateDeliveryMethod = useCallback(
    (id, updates) =>
      adminRequest(`/api/admin/delivery-methods/${encodeURIComponent(id)}`, 'PATCH', updates),
    [adminRequest]
  )

  const addSameDayPincode = useCallback(
    (pincode, areaName) =>
      adminRequest('/api/admin/same-day-pincodes', 'POST', {
        pincode,
        area_name: areaName,
      }),
    [adminRequest]
  )

  const removeSameDayPincode = useCallback(
    (pincode) => adminRequest('/api/admin/same-day-pincodes', 'DELETE', { pincode }),
    [adminRequest]
  )

  const updateOrder = useCallback(
    (id, updates) =>
      adminRequest(`/api/admin/orders/${encodeURIComponent(id)}`, 'PATCH', updates),
    [adminRequest]
  )

  const markOrderPaid = useCallback(
    (id) => adminRequest(`/api/admin/orders/${encodeURIComponent(id)}/mark-paid`, 'POST'),
    [adminRequest]
  )

  const adminLoggedIn = !!adminUser && !!adminToken

  const value = {
    cart,
    cartItemCount,
    cartSubtotal,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    loadingCatalog,
    catalogError,
    refreshCatalog,
    categories: adminLoggedIn ? adminCategories : storeCategories,
    products: storeProducts,
    rawProducts: adminLoggedIn ? adminProducts : storeProducts,
    deliveryMethods: adminLoggedIn ? adminDeliveryMethods : storeDeliveryMethods,
    sameDayPincodes,
    coupons,
    orders: adminLoggedIn ? adminOrders : recentOrders,
    settings: STORE_SETTINGS,
    adminLoggedIn,
    adminUser,
    adminLoading,
    validateCoupon,
    getDeliveryMethodsForPincode,
    fetchDeliveryMethods,
    createOrder,
    fetchOrder,
    loginAdmin,
    logoutAdmin,
    uploadProductImage,
    saveCategory,
    deleteCategory,
    saveProduct,
    deleteProduct,
    saveCoupon,
    deleteCoupon,
    updateDeliveryMethod,
    addSameDayPincode,
    removeSameDayPincode,
    updateOrder,
    markOrderPaid,
  }

  return <MerchContext.Provider value={value}>{children}</MerchContext.Provider>
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  FileTextIcon,
  MinusIcon,
  PackageIcon,
  PlusIcon,
  ShieldIcon,
  ShoppingCartIcon,
  TruckIcon,
} from '../../merch/MerchIcons.jsx'
import { MerchVisual } from '../../merch/MerchVisual.jsx'
import { ProductCard } from '../../merch/ProductCard.jsx'
import { useMerch } from '../../merch/useMerch.js'
import { formatCurrency } from '../../merch/utils.js'
import {
  BRUTAL_CARD,
  COLOR_SWATCH_CLASS,
  PILL_CHIP,
  PILL_INK,
  PILL_PRIMARY,
  PILL_SURFACE,
} from '../../merch/merchStyles.js'
import usePageTitle from '../../components/usePageTitle.js'

function isColorKey(key) {
  return key.toLowerCase() === 'color' || key.toLowerCase() === 'colour'
}

export default function MerchProductDetail() {
  const { slug } = useParams()
  const { products } = useMerch()

  const product = useMemo(
    () => products.find((p) => p.slug === slug && p.is_active),
    [products, slug]
  )

  usePageTitle(product ? `${product.name} — Merch` : 'Product Not Found')

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [slug])

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className={`${BRUTAL_CARD} p-10`}>
          <h1 className="font-display text-3xl font-bold text-primary mb-3">Product Not Found</h1>
          <p className="font-body text-muted mb-6">
            This merch item might be inactive or the link is outdated.
          </p>
          <Link to="/merch/products" className={PILL_PRIMARY}>
            Browse All Products <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    )
  }

  return <ProductDetailContent key={product.id} product={product} products={products} />
}

function ProductDetailContent({ product, products }) {
  const navigate = useNavigate()
  const { addToCart } = useMerch()

  const relatedProducts = useMemo(() => {
    if (!product.category_id) return []
    return products
      .filter((p) => p.is_active && p.category_id === product.category_id && p.id !== product.id)
      .slice(0, 4)
  }, [products, product])

  const activeVariants = useMemo(
    () => (product.variants || []).filter((v) => v.is_active !== false),
    [product]
  )

  const attributeKeys = useMemo(() => {
    const keys = new Set()
    activeVariants.forEach((v) => Object.keys(v.attributes || {}).forEach((k) => keys.add(k)))
    return Array.from(keys)
  }, [activeVariants])

  const [selectedAttrs, setSelectedAttrs] = useState(() => {
    const defaults = {}
    attributeKeys.forEach((key) => {
      const firstVal = activeVariants[0]?.attributes?.[key]
      if (firstVal) defaults[key] = firstVal
    })
    return defaults
  })

  const [comboSelections, setComboSelections] = useState(() => {
    if (!product.is_combo || !product.combo_items?.length) return {}
    const init = {}
    product.combo_items.forEach((ci) => {
      const variants = ci.product?.variants?.filter((v) => v.is_active !== false) || []
      if (variants.length) {
        const attrs = {}
        Object.keys(variants[0].attributes || {}).forEach((key) => {
          attrs[key] = variants[0].attributes[key]
        })
        init[ci.id] = attrs
      }
    })
    return init
  })

  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [addedToCart, setAddedToCart] = useState(false)
  const [showStickyBar, setShowStickyBar] = useState(false)
  const addToCartBtnRef = useRef(null)

  useEffect(() => {
    const el = addToCartBtnRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setShowStickyBar(!entry.isIntersecting), {
      threshold: 0,
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const selectedVariant = useMemo(() => {
    return (
      activeVariants.find((v) =>
        attributeKeys.every((key) => v.attributes?.[key] === selectedAttrs[key])
      ) || activeVariants[0]
    )
  }, [activeVariants, attributeKeys, selectedAttrs])

  function selectAttr(key, val) {
    setSelectedAttrs((prev) => ({ ...prev, [key]: val }))
    setActiveImageIdx(0)
  }

  const comboReady = useMemo(() => {
    if (!product?.is_combo) return true
    return (
      product.combo_items?.every((ci) => {
        const variants = ci.product?.variants?.filter((v) => v.is_active !== false) || []
        const attrKeys = [...new Set(variants.flatMap((v) => Object.keys(v.attributes || {})))]
        return attrKeys.every((key) => comboSelections[ci.id]?.[key])
      }) ?? true
    )
  }, [product, comboSelections])

  const images = useMemo(() => {
    if (!product) return []
    if (product.is_combo && product.combo_items?.length > 0) {
      return product.combo_items.map((ci) => {
        const ciVariants = ci.product?.variants?.filter((v) => v.is_active !== false) || []
        const selAttrs = comboSelections[ci.id] || {}
        const matched =
          ciVariants.find((v) =>
            Object.keys(selAttrs).every((k) => v.attributes?.[k] === selAttrs[k])
          ) || ciVariants[0]
        const firstImg = matched?.images?.[0] || null
        return {
          image: firstImg,
          name: ci.product?.name || '',
          color: selAttrs.color || matched?.attributes?.color || 'Maroon',
        }
      })
    }
    return (selectedVariant?.images || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }, [product, selectedVariant, comboSelections])

  const inStock = selectedVariant ? selectedVariant.allow_backorder || selectedVariant.stock > 0 : false
  const stockLabel = selectedVariant
    ? selectedVariant.stock <= 0
      ? selectedVariant.allow_backorder
        ? 'Pre-order available'
        : 'Out of stock'
      : selectedVariant.stock <= 5
        ? `Only ${selectedVariant.stock} left in stock`
        : 'In stock'
    : ''

  const attrOptions = {}
  attributeKeys.forEach((key) => {
    attrOptions[key] = [...new Set(activeVariants.map((v) => v.attributes?.[key]).filter(Boolean))]
  })

  const discountPct =
    selectedVariant?.compare_at_price && selectedVariant.compare_at_price > selectedVariant.price
      ? Math.round((1 - selectedVariant.price / selectedVariant.compare_at_price) * 100)
      : null

  function addSelectedToCart() {
    if (!selectedVariant || !inStock || !comboReady) return false

    const selections = product.is_combo
      ? product.combo_items?.map((ci) => {
          const variants = ci.product?.variants?.filter((v) => v.is_active !== false) || []
          const selAttrs = comboSelections[ci.id] || {}
          const selVariant =
            variants.find((v) =>
              Object.keys(selAttrs).every((k) => v.attributes?.[k] === selAttrs[k])
            ) || variants[0]
          return {
            comboItemId: ci.id,
            productId: ci.product_id,
            productName: ci.product?.name || '',
            variantId: selVariant?.id || null,
            variantName: selVariant?.name || '',
            variantAttributes: selAttrs,
          }
        })
      : undefined

    addToCart({
      variantId: selectedVariant.id,
      productId: product.id,
      productName: product.name,
      variantName: selectedVariant.name,
      variantAttributes: selectedVariant.attributes || {},
      price: selectedVariant.price,
      gstRate: product.gst_rate ?? 18,
      priceIncludesGst: product.price_includes_gst ?? true,
      quantity,
      imageUrl: product.is_combo ? images[0]?.image?.url || null : images[0]?.url || null,
      visualType: product.is_combo
        ? 'combo'
        : selectedVariant.images?.[0]?.visualType || 'tee',
      visualColor: selectedVariant.attributes?.color || 'Maroon',
      maxStock: selectedVariant.stock > 0 ? selectedVariant.stock : null,
      allowBackorder: selectedVariant.allow_backorder,
      isCombo: product.is_combo,
      comboSelections: selections,
    })
    return true
  }

  function handleAddToCart() {
    if (addedToCart) {
      navigate('/merch/cart')
      return
    }
    if (addSelectedToCart()) {
      setAddedToCart(true)
      setTimeout(() => setAddedToCart(false), 4000)
    }
  }

  function handleBuyNow() {
    if (!addedToCart && !addSelectedToCart()) return
    navigate('/merch/cart')
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 pb-24 md:px-12 max-sm:px-4">
      {/* Sticky mobile bar */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-ink bg-surface px-4 py-3 flex items-center gap-3 lg:hidden shadow-brutal">
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm font-bold text-ink truncate">{product.name}</p>
            <p className="font-display text-base font-bold text-primary">
              {formatCurrency(selectedVariant ? selectedVariant.price : product.base_price)}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock || !comboReady}
            className={addedToCart ? PILL_PRIMARY : PILL_INK}
          >
            {addedToCart ? 'View Cart →' : inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      )}

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="font-body text-sm text-muted mb-6 flex items-center gap-2 flex-wrap">
        <Link to="/merch/products" className="font-bold text-ink hover:underline">
          Products
        </Link>
        <span>/</span>
        {product.category && (
          <>
            <Link
              to={`/merch/products?category=${product.category.slug}`}
              className="font-bold text-ink hover:underline"
            >
              {product.category.name}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-ink font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14">
        {/* Image / Visual Gallery */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-square bg-surface border-2 border-ink rounded-2xl shadow-brutal overflow-hidden mb-3">
            {product.is_combo && images.length >= 2 ? (
              <div className="absolute inset-0 bg-primary flex flex-col justify-between p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border-2 border-ink bg-yellow px-3 py-1 font-body text-xs font-bold uppercase text-ink">
                    Bundle
                  </span>
                  {discountPct ? (
                    <span className="rounded-full border-2 border-ink bg-green px-3 py-1 font-body text-xs font-bold text-ink">
                      {discountPct}% OFF
                    </span>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-4 flex-1 items-center py-4 min-h-0">
                  {images.slice(0, 2).map((item, idx) => (
                    <div
                      key={idx}
                      className="h-full rounded-2xl border-2 border-ink bg-background overflow-hidden flex flex-col"
                    >
                      <div className="flex-1 min-h-0">
                        <MerchVisual
                          image={item.image}
                          productName={item.name}
                          color={item.color}
                        />
                      </div>
                      <p className="border-t-2 border-ink bg-surface px-2 py-1.5 font-body text-xs font-bold text-ink text-center line-clamp-1">
                        {item.name}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="font-display text-sm font-bold text-background text-center">
                  {product.name}
                </p>
              </div>
            ) : (
              <MerchVisual
                image={images[activeImageIdx]}
                productName={product.name}
                visualType={selectedVariant?.images?.[0]?.visualType || 'tee'}
                color={selectedVariant?.attributes?.color || 'Maroon'}
              />
            )}

            {discountPct && !product.is_combo && (
              <span className="absolute top-3 left-3 rounded-full border-2 border-ink bg-green px-3 py-1 font-body text-xs font-bold text-ink shadow-brutal-sm">
                {discountPct}% OFF
              </span>
            )}

            {!product.is_combo && images.length > 1 && (
              <span className="absolute bottom-3 right-3 rounded-full border-2 border-ink bg-surface px-3 py-1 font-body text-xs font-bold text-ink shadow-brutal-sm">
                {activeImageIdx + 1} / {images.length}
              </span>
            )}
          </div>

          {!product.is_combo && images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-16 h-16 rounded-xl border-2 border-ink overflow-hidden shrink-0 ${
                    idx === activeImageIdx ? 'ring-2 ring-primary shadow-brutal-sm' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <MerchVisual
                    image={img}
                    productName={product.name}
                    color={selectedVariant?.attributes?.color}
                    className="!p-1"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {product.category && (
            <p className="font-body text-xs font-bold uppercase tracking-widest text-primary mb-2">
              {product.category.name}
            </p>
          )}
          <h1 className="font-display text-3xl md:text-4xl font-bold text-ink leading-tight mb-1">
            {product.name}
          </h1>
          {selectedVariant?.sku && (
            <p className="font-body text-xs text-muted mb-4">SKU: {selectedVariant.sku}</p>
          )}

          {/* Price */}
          <div className="flex items-baseline gap-3 flex-wrap mb-1">
            <span className="font-display text-3xl font-bold text-primary">
              {formatCurrency(selectedVariant ? selectedVariant.price : product.base_price)}
            </span>
            {selectedVariant?.compare_at_price && selectedVariant.compare_at_price > selectedVariant.price && (
              <>
                <span className="font-body text-xl text-muted line-through">
                  {formatCurrency(selectedVariant.compare_at_price)}
                </span>
                <span className="rounded-full border-2 border-ink bg-green px-2.5 py-0.5 font-body text-xs font-bold text-ink">
                  {discountPct}% OFF
                </span>
              </>
            )}
          </div>
          <p className="font-body text-xs text-muted mb-5">
            {product.price_includes_gst === false
              ? `+ ${product.gst_rate ?? 18}% GST added at checkout`
              : 'Inclusive of all taxes'}
          </p>

          {/* Stock badge */}
          {selectedVariant && (
            <div
              className={`inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3.5 py-1 font-body text-xs font-bold mb-6 ${
                selectedVariant.stock > 0
                  ? 'bg-green text-ink'
                  : selectedVariant.allow_backorder
                    ? 'bg-yellow text-ink'
                    : 'bg-danger text-surface'
              }`}
            >
              {selectedVariant.stock > 0 ? (
                <CheckCircleIcon className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangleIcon className="w-3.5 h-3.5" />
              )}
              {stockLabel}
            </div>
          )}

          {/* Variant selectors (non-combo) */}
          {!product.is_combo &&
            attributeKeys.map((key) => (
              <div key={key} className="mb-6">
                <p className="font-body text-sm font-bold text-ink mb-2.5 capitalize">
                  {key}: <span className="font-normal text-muted">{selectedAttrs[key]}</span>
                </p>
                {isColorKey(key) ? (
                  <div className="flex flex-wrap gap-3">
                    {attrOptions[key].map((val) => {
                      const matches = activeVariants.filter((v) => v.attributes?.[key] === val)
                      const anyInStock = matches.some((v) => v.allow_backorder || v.stock > 0)
                      const isSelected = selectedAttrs[key] === val
                      return (
                        <button
                          key={val}
                          type="button"
                          title={val}
                          disabled={!anyInStock}
                          onClick={() => selectAttr(key, val)}
                          className={`relative inline-flex items-center gap-2 rounded-full border-2 border-ink px-3.5 py-1.5 font-body text-sm font-bold shadow-brutal-sm transition ${
                            !anyInStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                          } ${isSelected ? 'bg-accent-alt text-ink' : 'bg-surface text-ink hover:bg-background'}`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full border-2 border-ink ${
                              COLOR_SWATCH_CLASS[val.toLowerCase()] || 'bg-surface'
                            }`}
                          />
                          {val}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {attrOptions[key].map((val) => {
                      const matches = activeVariants.filter((v) => v.attributes?.[key] === val)
                      const anyInStock = matches.some((v) => v.allow_backorder || v.stock > 0)
                      const isSelected = selectedAttrs[key] === val
                      return (
                        <button
                          key={val}
                          type="button"
                          disabled={!anyInStock}
                          onClick={() => selectAttr(key, val)}
                          className={PILL_CHIP(isSelected)}
                        >
                          {val}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

          {/* Combo per-item customization */}
          {product.is_combo && product.combo_items?.length > 0 && (
            <div className="mb-6">
              <h2 className="font-display text-base font-bold text-ink mb-3">
                Customize your bundle
              </h2>
              <div className="space-y-3">
                {product.combo_items.map((ci, idx) => {
                  const ciVariants = ci.product?.variants?.filter((v) => v.is_active !== false) || []
                  const ciAttrKeys = [
                    ...new Set(ciVariants.flatMap((v) => Object.keys(v.attributes || {}))),
                  ]
                  const selAttrs = comboSelections[ci.id] || {}
                  return (
                    <div
                      key={ci.id}
                      className="bg-surface border-2 border-ink rounded-2xl shadow-brutal-sm p-4"
                    >
                      <p className="font-display text-sm font-bold text-ink mb-3 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full border-2 border-ink bg-accent text-ink text-xs flex items-center justify-center shrink-0 font-bold">
                          {idx + 1}
                        </span>
                        {ci.product?.name}
                      </p>

                      {ciAttrKeys.map((key) => {
                        const options = [
                          ...new Set(ciVariants.map((v) => v.attributes?.[key]).filter(Boolean)),
                        ]
                        return (
                          <div key={key} className="mb-3 last:mb-0">
                            <p className="font-body text-xs font-bold text-muted mb-2 capitalize">
                              {key}: <span className="text-ink">{selAttrs[key]}</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {options.map((val) => (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() =>
                                    setComboSelections((prev) => ({
                                      ...prev,
                                      [ci.id]: { ...selAttrs, [key]: val },
                                    }))
                                  }
                                  className={PILL_CHIP(selAttrs[key] === val)}
                                >
                                  {isColorKey(key) && (
                                    <span
                                      className={`w-3.5 h-3.5 rounded-full border border-ink ${
                                        COLOR_SWATCH_CLASS[val.toLowerCase()] || 'bg-surface'
                                      }`}
                                    />
                                  )}
                                  {val}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mb-6">
            <p className="font-body text-sm font-bold text-ink mb-2">Quantity</p>
            <div className="inline-flex items-center rounded-full border-2 border-ink bg-surface shadow-brutal-sm overflow-hidden">
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-11 h-11 flex items-center justify-center border-r-2 border-ink hover:bg-background"
              >
                <MinusIcon className="w-4 h-4" />
              </button>
              <span className="w-12 text-center font-display font-bold text-base">{quantity}</span>
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() =>
                  setQuantity((q) =>
                    selectedVariant && selectedVariant.stock > 0 && !selectedVariant.allow_backorder
                      ? Math.min(q + 1, selectedVariant.stock)
                      : q + 1
                  )
                }
                className="w-11 h-11 flex items-center justify-center border-l-2 border-ink hover:bg-background"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Add to Cart + Buy Now */}
          <div className="flex flex-wrap gap-3 mb-6">
            <button
              ref={addToCartBtnRef}
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock || !comboReady}
              className={`flex-1 ${addedToCart ? PILL_PRIMARY : PILL_INK}`}
            >
              <ShoppingCartIcon className="w-5 h-5" />
              {addedToCart
                ? 'Added — View Cart →'
                : inStock
                  ? 'Add to Cart'
                  : 'Out of Stock'}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!inStock || !comboReady}
              className={PILL_SURFACE}
            >
              Buy Now
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 bg-surface border-2 border-ink rounded-2xl shadow-brutal-sm p-4 mb-6">
            <div className="flex flex-col items-center text-center gap-1.5">
              <TruckIcon className="w-5 h-5 text-primary" />
              <span className="font-body text-xs font-bold text-ink">Free event pickup</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5">
              <FileTextIcon className="w-5 h-5 text-primary" />
              <span className="font-body text-xs font-bold text-ink">Full GST breakdown</span>
            </div>
            <div className="flex flex-col items-center text-center gap-1.5">
              <ShieldIcon className="w-5 h-5 text-primary" />
              <span className="font-body text-xs font-bold text-ink">Home delivery available</span>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="border-t-2 border-ink pt-5">
              <h2 className="font-display text-lg font-bold text-ink mb-2">About this product</h2>
              <p className="font-body text-sm text-muted leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Bundle contents */}
          {product.is_combo && product.combo_items?.length > 0 && (
            <div className="border-t-2 border-ink pt-5 mt-5">
              <h2 className="font-display text-lg font-bold text-ink mb-3">What&rsquo;s in this bundle</h2>
              <ul className="space-y-2">
                {product.combo_items.map((ci) => (
                  <li key={ci.id} className="flex items-center gap-3 font-body text-sm text-ink">
                    <span className="w-6 h-6 rounded-full border-2 border-ink bg-accent-alt flex items-center justify-center shrink-0">
                      <PackageIcon className="w-3.5 h-3.5 text-ink" />
                    </span>
                    <span>
                      {ci.quantity}× {ci.product?.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <div className="mt-14 border-t-2 border-ink pt-10">
          <h2 className="font-display text-2xl font-bold text-primary mb-6">You may also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} isCombo={rel.is_combo} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

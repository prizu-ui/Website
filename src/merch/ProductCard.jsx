import { Link } from 'react-router'
import { MerchVisual } from './MerchVisual.jsx'
import { COLOR_SWATCH_CLASS } from './merchStyles.js'
import { formatCurrency } from './utils.js'

export function ProductCard({ product, isCombo = false }) {
  const variants = (product.variants || []).filter((v) => v.is_active !== false)
  const firstVariant = variants[0]
  const firstImage = firstVariant?.images?.[0]

  const comboItemImages = isCombo
    ? (product.combo_items || [])
        .map((ci) => {
          const v = ci.product?.variants?.find((x) => x.is_active) || ci.product?.variants?.[0]
          return {
            image: v?.images?.[0] || null,
            name: ci.product?.name || '',
            color: v?.attributes?.color || 'Maroon',
          }
        })
        .filter((x) => x.name)
    : []

  const lowestPrice = variants.length
    ? Math.min(...variants.map((v) => v.price))
    : product.base_price

  const saleVariant = variants.find((v) => v.compare_at_price && v.compare_at_price > v.price)
  const discountPct = saleVariant?.compare_at_price
    ? Math.round((1 - lowestPrice / saleVariant.compare_at_price) * 100)
    : null

  const colorKey = Object.keys(firstVariant?.attributes || {}).find(
    (k) => k.toLowerCase() === 'color' || k.toLowerCase() === 'colour'
  )
  const uniqueColors = colorKey
    ? [...new Set(variants.map((v) => v.attributes?.[colorKey]).filter(Boolean))]
    : []

  return (
    <Link
      to={`/merch/products/${product.slug}`}
      className="group flex flex-col bg-surface border-2 border-ink rounded-2xl shadow-brutal overflow-hidden transition motion-reduce:transition-none hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {/* Image / Preview Area */}
      <div className="relative aspect-square border-b-2 border-ink bg-background overflow-hidden">
        {isCombo && comboItemImages.length >= 2 ? (
          <div className="absolute inset-0 bg-primary flex flex-col justify-between p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full border-2 border-ink bg-yellow px-2.5 py-0.5 font-body text-xs font-bold uppercase text-ink">
                Bundle
              </span>
              {discountPct ? (
                <span className="rounded-full border-2 border-ink bg-green px-2.5 py-0.5 font-body text-xs font-bold text-ink">
                  {discountPct}% OFF
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1 items-center py-2 min-h-0">
              {comboItemImages.slice(0, 2).map((item, idx) => (
                <div
                  key={idx}
                  className="h-full rounded-xl border-2 border-ink bg-background overflow-hidden flex flex-col"
                >
                  <div className="flex-1 min-h-0">
                    <MerchVisual
                      image={item.image}
                      productName={item.name}
                      color={item.color}
                      className="!p-1.5"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="font-display text-xs font-bold text-background text-center line-clamp-1">
              {product.name}
            </p>
          </div>
        ) : (
          <MerchVisual
            image={firstImage}
            productName={product.name}
            visualType={firstImage?.visualType || 'tee'}
            color={firstVariant?.attributes?.color || firstImage?.visualColor || 'Maroon'}
            className="transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {discountPct && !isCombo && (
          <span className="absolute top-2.5 right-2.5 rounded-full border-2 border-ink bg-green px-2.5 py-0.5 font-body text-xs font-bold text-ink shadow-brutal-sm">
            {discountPct}% OFF
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4">
        {product.category && (
          <p className="font-body text-xs font-bold uppercase tracking-wider text-muted mb-1">
            {product.category.name}
          </p>
        )}

        <h3 className="font-display text-base font-bold text-ink leading-snug line-clamp-2 mb-2.5">
          {product.name}
        </h3>

        {!isCombo && uniqueColors.length > 1 && (
          <div className="flex items-center gap-1.5 mb-3">
            {uniqueColors.slice(0, 6).map((color) => (
              <span
                key={color}
                title={color}
                className={`w-4 h-4 rounded-full border-2 border-ink inline-block shrink-0 ${
                  COLOR_SWATCH_CLASS[color.toLowerCase()] || 'bg-surface'
                }`}
              />
            ))}
            {uniqueColors.length > 6 && (
              <span className="font-body text-xs text-muted">+{uniqueColors.length - 6}</span>
            )}
          </div>
        )}

        {isCombo && product.combo_items?.length >= 2 && (
          <p className="font-body text-xs text-muted mb-3 line-clamp-1">
            {product.combo_items.map((ci) => ci.product?.name).filter(Boolean).join(' + ')}
          </p>
        )}

        <div className="mt-auto flex items-baseline gap-2 flex-wrap">
          <span className="font-display text-lg font-bold text-primary">
            {formatCurrency(lowestPrice)}
          </span>
          {saleVariant?.compare_at_price && (
            <span className="font-body text-sm text-muted line-through">
              {formatCurrency(saleVariant.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

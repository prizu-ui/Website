import { Link } from 'react-router'
import { useEffect } from 'react'
import { calculateGstFromInclusivePrice } from '../../merch/gst.js'
import { MinusIcon, PlusIcon, ShoppingBagIcon, TrashIcon } from '../../merch/MerchIcons.jsx'
import { MerchVisual } from '../../merch/MerchVisual.jsx'
import { useMerch } from '../../merch/useMerch.js'
import { formatCurrency } from '../../merch/utils.js'
import { BRUTAL_CARD, PILL_PRIMARY, PILL_SURFACE } from '../../merch/merchStyles.js'
import usePageTitle from '../../components/usePageTitle.js'

export default function MerchCart() {
  usePageTitle('Your Cart — Merch')
  const { cart, cartSubtotal, cartItemCount, removeFromCart, updateCartQuantity } = useMerch()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  const gstTotals = cart.reduce(
    (acc, item) => {
      const rate = item.gstRate ?? 18
      const inclusivePrice =
        item.priceIncludesGst === false ? item.price * (1 + rate / 100) : item.price
      const gst = calculateGstFromInclusivePrice(inclusivePrice, rate)
      acc.base += gst.basePrice * item.quantity
      acc.cgst += gst.cgstAmount * item.quantity
      acc.sgst += gst.sgstAmount * item.quantity
      return acc
    },
    { base: 0, cgst: 0, sgst: 0 }
  )

  if (!cart.length) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <div className={`${BRUTAL_CARD} p-10`}>
          <ShoppingBagIcon className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-ink mb-2">Your cart is empty</h1>
          <p className="font-body text-muted mb-8">
            Add some SheBuilds merch items to get started.
          </p>
          <Link to="/merch/products" className={PILL_PRIMARY}>
            Browse Products <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 pb-20 md:px-12 max-sm:px-4">
      <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-8">Your Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.map((item) => {
            const lineTotal =
              (item.priceIncludesGst === false
                ? item.price * (1 + (item.gstRate ?? 18) / 100)
                : item.price) * item.quantity

            return (
              <div
                key={item.variantId}
                className="flex gap-4 bg-surface border-2 border-ink rounded-2xl shadow-brutal-sm p-4"
              >
                <div className="w-24 h-24 rounded-xl border-2 border-ink bg-background overflow-hidden shrink-0">
                  <MerchVisual
                    image={item.imageUrl ? { url: item.imageUrl, alt: item.productName } : null}
                    productName={item.productName}
                    visualType={item.visualType || 'tee'}
                    color={item.visualColor || 'Maroon'}
                    className="!p-1.5"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-base font-bold text-ink truncate">
                    {item.productName}
                  </h2>
                  <p className="font-body text-sm text-muted">{item.variantName}</p>
                  {item.isCombo && (
                    <span className="inline-block mt-1 rounded-full border border-ink bg-yellow px-2 py-0.5 font-body text-xs font-bold text-ink">
                      COMBO
                    </span>
                  )}
                  {item.comboSelections?.map((sel, idx) => (
                    <p key={sel.comboItemId || idx} className="font-body text-xs text-muted mt-1">
                      {sel.productName || `Item ${idx + 1}`}:{' '}
                      {Object.values(sel.variantAttributes || {}).join(' / ')}
                    </p>
                  ))}

                  <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
                    <div className="inline-flex items-center rounded-full border-2 border-ink bg-background overflow-hidden">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => updateCartQuantity(item.variantId, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center border-r-2 border-ink hover:bg-surface"
                      >
                        <MinusIcon className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-9 text-center font-display text-sm font-bold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase quantity"
                        onClick={() => updateCartQuantity(item.variantId, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center border-l-2 border-ink hover:bg-surface"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="font-display text-lg font-bold text-primary">
                      {formatCurrency(lineTotal)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.variantId)}
                  className="self-start p-2 rounded-lg border-2 border-transparent hover:border-ink hover:bg-danger hover:text-surface text-muted transition"
                  aria-label="Remove item"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div>
          <div className={`${BRUTAL_CARD} p-6 sticky top-24`}>
            <h2 className="font-display text-xl font-bold text-ink mb-4">Order Summary</h2>

            <div className="space-y-2.5 mb-4 font-body text-sm">
              <div className="flex justify-between text-ink">
                <span>Base ({cartItemCount} items)</span>
                <span>{formatCurrency(Math.round(gstTotals.base * 100) / 100)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>CGST</span>
                <span>{formatCurrency(Math.round(gstTotals.cgst * 100) / 100)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>SGST</span>
                <span>{formatCurrency(Math.round(gstTotals.sgst * 100) / 100)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
            </div>

            <div className="border-t-2 border-ink pt-4 mb-6">
              <div className="flex justify-between font-display text-xl font-bold text-ink">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(cartSubtotal)}</span>
              </div>
              <p className="font-body text-xs text-muted mt-1">
                Incl. GST. Exact total &amp; coupons applied at checkout.
              </p>
            </div>

            <div className="space-y-3">
              <Link to="/merch/checkout" className={`${PILL_PRIMARY} w-full`}>
                Proceed to Checkout <span aria-hidden="true">→</span>
              </Link>
              <Link to="/merch/products" className={`${PILL_SURFACE} w-full`}>
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


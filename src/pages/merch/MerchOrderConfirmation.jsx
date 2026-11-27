import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { CheckCircleIcon, ClockIcon } from '../../merch/MerchIcons.jsx'
import { useMerch } from '../../merch/useMerch.js'
import { formatCurrency, formatDateTime } from '../../merch/utils.js'
import { BRUTAL_CARD, PILL_INK, PILL_PRIMARY, PILL_SURFACE } from '../../merch/merchStyles.js'
import usePageTitle from '../../components/usePageTitle.js'

export default function MerchOrderConfirmation() {
  usePageTitle('Order Placed! — Merch')
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { orders, fetchOrder } = useMerch()
  const [loadedKey, setLoadedKey] = useState('')

  const order = orders.find((o) => o.id === id || o.order_number === id)
  const isPending = searchParams.get('payment') === 'pending' && order?.payment_status !== 'PAID'

  useEffect(() => {
    if (!id || order) return
    let active = true
    fetchOrder(id).then(() => {
      if (active) setLoadedKey(id)
    })
    return () => {
      active = false
    }
  }, [id, order, fetchOrder])

  if (!order && id && loadedKey !== id) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className={`${BRUTAL_CARD} p-10`}>
          <p className="font-display text-xl font-bold text-primary">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className={`${BRUTAL_CARD} p-10`}>
          <h1 className="font-display text-3xl font-bold text-primary mb-3">Order Not Found</h1>
          <p className="font-body text-muted mb-6">
            We couldn&rsquo;t find that order. Please double-check your order number.
          </p>
          <Link to="/merch/products" className={PILL_PRIMARY}>
            Back to Store <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12 pb-20 max-sm:px-4">
      <div className={`${BRUTAL_CARD} p-6 md:p-8 text-center mb-6`}>
        {isPending ? (
          <>
            <div className="w-16 h-16 rounded-full border-2 border-ink bg-yellow flex items-center justify-center mx-auto mb-5">
              <ClockIcon className="w-8 h-8 text-ink" />
            </div>
            <h1 className="font-display text-3xl font-bold text-ink mb-2">Order Placed!</h1>
            <p className="font-body text-base text-ink mb-4">
              Thanks, <strong>{order.customer_name}</strong>! Your order is reserved.
            </p>
            <div className="bg-background border-2 border-ink rounded-2xl p-4 text-left mb-4">
              <p className="font-display text-sm font-bold text-ink mb-1">
                Payment pending — Pay at the event
              </p>
              <p className="font-body text-sm text-muted">
                Please pay <strong className="text-ink">{formatCurrency(order.total)}</strong> via
                Cash or UPI at the SheBuilds Tamil Nadu event. Your order{' '}
                <strong className="font-mono text-primary">#{order.order_number}</strong> is
                reserved for you.
              </p>
            </div>
            <p className="font-body text-xs text-muted">
              You will receive a GST invoice once your payment is confirmed.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full border-2 border-ink bg-green flex items-center justify-center mx-auto mb-5">
              <CheckCircleIcon className="w-8 h-8 text-ink" />
            </div>
            <h1 className="font-display text-3xl font-bold text-ink mb-2">Order Confirmed!</h1>
            <p className="font-body text-base text-ink mb-2">
              Thank you, <strong>{order.customer_name}</strong>!
            </p>
            <p className="font-body text-sm text-muted">
              Order #{order.order_number} · {formatDateTime(order.created_at)}
            </p>
          </>
        )}
      </div>

      {/* Order Summary Card */}
      <div className={`${BRUTAL_CARD} p-6 mb-6`}>
        <h2 className="font-display text-xl font-bold text-ink mb-4">Order Summary</h2>

        <div className="space-y-3 mb-4">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex justify-between gap-3 font-body text-sm">
              <div className="text-ink">
                <span className="font-bold">{item.product_name}</span> — {item.variant_name} ×
                {item.quantity}
                {item.combo_selections?.length > 0 && (
                  <div className="mt-1 space-y-0.5 text-xs text-muted">
                    {item.combo_selections.map((sel, idx) => (
                      <p key={sel.comboItemId || idx}>
                        {sel.productName}:{' '}
                        {sel.variantAttributes
                          ? Object.values(sel.variantAttributes).join(' / ')
                          : sel.variantName}
                      </p>
                    ))}
                  </div>
                )}
              </div>
              <span className="font-bold text-ink shrink-0">{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-ink pt-3 space-y-1.5 font-body text-sm">
          <div className="flex justify-between text-muted">
            <span>Shipping ({order.delivery_method_name})</span>
            <span>{order.shipping_amount === 0 ? 'Free' : formatCurrency(order.shipping_amount)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between font-bold text-primary">
              <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
              <span>−{formatCurrency(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted">
            <span>CGST + SGST</span>
            <span>{formatCurrency((order.cgst_amount || 0) + (order.sgst_amount || 0))}</span>
          </div>
          <div className="flex justify-between font-display text-lg font-bold text-ink pt-2 border-t-2 border-ink">
            <span>{isPending ? 'Total Due' : 'Total Paid'}</span>
            <span className="text-primary">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link to={`/merch/order/${order.id}`} className={`flex-1 ${PILL_INK}`}>
          Track Your Order <span aria-hidden="true">→</span>
        </Link>
        <Link to="/merch/products" className={`flex-1 ${PILL_SURFACE}`}>
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}

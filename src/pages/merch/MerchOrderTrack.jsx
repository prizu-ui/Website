import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  PackageIcon,
  ShoppingBagIcon,
  TruckIcon,
} from '../../merch/MerchIcons.jsx'
import { MerchVisual } from '../../merch/MerchVisual.jsx'
import { useMerch } from '../../merch/useMerch.js'
import { formatCurrency, formatDateTime } from '../../merch/utils.js'
import { BRUTAL_CARD, BRUTAL_INPUT, PILL_INK, PILL_PRIMARY } from '../../merch/merchStyles.js'
import usePageTitle from '../../components/usePageTitle.js'

const STATUS_STEPS = [
  { status: 'PLACED', label: 'Order Placed', icon: ClockIcon, timestampKey: 'created_at' },
  { status: 'PROCESSING', label: 'Processing', icon: PackageIcon, timestampKey: null },
  { status: 'SHIPPED', label: 'Shipped', icon: TruckIcon, timestampKey: 'shipped_at' },
  { status: 'DELIVERED', label: 'Delivered', icon: CheckCircleIcon, timestampKey: 'delivered_at' },
]

const STATUS_ORDER = ['PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED']

const STATUS_BADGE = {
  PLACED: { label: 'Order Placed', cls: 'bg-accent-alt text-ink' },
  PROCESSING: { label: 'Processing', cls: 'bg-lavender text-ink' },
  SHIPPED: { label: 'Shipped', cls: 'bg-yellow text-ink' },
  DELIVERED: { label: 'Delivered', cls: 'bg-green text-ink' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-danger text-surface' },
}

export default function MerchOrderTrack() {
  usePageTitle('Track Order — Merch')
  const { id } = useParams()
  const navigate = useNavigate()
  const { orders, settings, fetchOrder } = useMerch()
  const [lookupInput, setLookupInput] = useState('')
  const [loadedKey, setLoadedKey] = useState('')

  const order = id
    ? orders.find((o) => o.id === id || o.order_number?.toLowerCase() === id.toLowerCase())
    : null

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

  function handleSearch(e) {
    e.preventDefault()
    const q = lookupInput.trim()
    if (!q) return
    const match = orders.find(
      (o) => o.order_number?.toLowerCase() === q.toLowerCase() || o.id === q
    )
    if (match) navigate(`/merch/order/${match.id}`)
    else navigate(`/merch/order/${encodeURIComponent(q)}`)
  }

  if (!id) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12 pb-20 max-sm:px-4">
        <div className={`${BRUTAL_CARD} p-6 md:p-8 mb-8`}>
          <h1 className="font-display text-3xl font-bold text-primary mb-2">Track Your Order</h1>
          <p className="font-body text-sm text-muted mb-5">
            Enter your SheBuilds Merch order number (e.g. <span className="font-mono">SB-2026-0001</span>).
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              value={lookupInput}
              onChange={(e) => setLookupInput(e.target.value)}
              className={`${BRUTAL_INPUT} font-mono`}
              placeholder="SB-2026-0001"
            />
            <button type="submit" className={PILL_INK}>
              Track
            </button>
          </form>
        </div>

        <div className={`${BRUTAL_CARD} p-6`}>
          <h2 className="font-display text-lg font-bold text-ink mb-4">
            Recent Orders on This Device
          </h2>
          {orders.length === 0 ? (
            <p className="font-body text-sm text-muted">
              No orders placed in this browser yet.{' '}
              <Link to="/merch/products" className="font-bold text-primary underline">
                Browse merch →
              </Link>
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <Link
                  key={o.id}
                  to={`/merch/order/${o.id}`}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl border-2 border-ink bg-background hover:bg-surface transition"
                >
                  <div>
                    <p className="font-mono font-bold text-primary">{o.order_number}</p>
                    <p className="font-body text-xs text-muted">
                      {formatDateTime(o.created_at)} · {o.order_items.length} item(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-ink">{formatCurrency(o.total)}</p>
                    <span className="inline-block mt-1 rounded-full border border-ink bg-surface px-2.5 py-0.5 font-body text-xs font-bold text-ink">
                      {o.order_status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (id && !order && loadedKey !== id) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className={`${BRUTAL_CARD} p-10`}>
          <p className="font-display text-xl font-bold text-primary">Looking up order...</p>
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
            No matching order &ldquo;{id}&rdquo; was found. Please check the order number and try again.
          </p>
          <Link to="/merch/track" className={PILL_PRIMARY}>
            Try Another Order # <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    )
  }

  const currentStepIdx =
    order.order_status === 'CANCELLED' ? -1 : STATUS_ORDER.indexOf(order.order_status)
  const badge = STATUS_BADGE[order.order_status] || STATUS_BADGE.PLACED

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 pb-20 max-sm:px-4">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Order Tracking</h1>
          <p className="font-body text-sm text-muted mt-1">
            #{order.order_number} · {formatDateTime(order.created_at)}
          </p>
        </div>
        <span
          className={`rounded-full border-2 border-ink px-4 py-1.5 font-body text-xs font-bold ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>

      {order.payment_status === 'PENDING' && (
        <div className="bg-yellow border-2 border-ink rounded-2xl shadow-brutal-sm p-5 mb-6 flex items-start gap-3">
          <ClockIcon className="w-5 h-5 text-ink mt-0.5 shrink-0" />
          <div>
            <p className="font-display font-bold text-ink">Payment Pending</p>
            <p className="font-body text-sm text-ink mt-0.5">
              Please pay <strong>{formatCurrency(order.total)}</strong> via Cash or UPI at the
              SheBuilds Tamil Nadu event to complete your order.
            </p>
          </div>
        </div>
      )}

      {/* Timeline */}
      {order.order_status !== 'CANCELLED' ? (
        <div className={`${BRUTAL_CARD} p-6 mb-6`}>
          <div className="grid grid-cols-4 gap-2">
            {STATUS_STEPS.map((st, idx) => {
              const Icon = st.icon
              const completed = idx <= currentStepIdx
              const ts = st.timestampKey ? order[st.timestampKey] : null
              return (
                <div key={st.status} className="flex flex-col items-center text-center gap-1.5">
                  <div
                    className={`w-10 h-10 rounded-full border-2 border-ink flex items-center justify-center ${
                      completed ? 'bg-accent-alt text-ink' : 'bg-background text-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`font-display text-xs font-bold ${
                      completed ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    {st.label}
                  </span>
                  {ts && completed && (
                    <span className="font-body text-xs text-muted">{formatDateTime(ts)}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="bg-danger text-surface border-2 border-ink rounded-2xl p-5 mb-6">
          <p className="font-display font-bold text-lg">Order Cancelled</p>
          <p className="font-body text-sm mt-1">
            This order has been cancelled. Contact {settings.supportEmail} if you need help.
          </p>
        </div>
      )}

      {order.awb_number && (
        <div className={`${BRUTAL_CARD} p-5 mb-6`}>
          <p className="font-display font-bold text-ink mb-2">Shipment Tracking</p>
          <div className="grid grid-cols-2 gap-4 font-body text-sm">
            <div>
              <p className="text-xs text-muted">Courier</p>
              <p className="font-bold text-ink">{order.courier_name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted">AWB Number</p>
              <p className="font-mono font-bold text-ink">{order.awb_number}</p>
            </div>
          </div>
        </div>
      )}

      {/* Address & Payment */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className={`${BRUTAL_CARD} p-5`}>
          <p className="font-display font-bold text-ink text-sm mb-2">Delivery Address</p>
          <p className="font-body text-sm font-bold text-ink">{order.shipping_address.name}</p>
          <p className="font-body text-sm text-muted mt-1">
            {order.shipping_address.line1}
            {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}
            <br />
            {order.shipping_address.city}, {order.shipping_address.state} –{' '}
            {order.shipping_address.pincode}
          </p>
          <p className="font-body text-sm text-ink mt-2">{order.shipping_address.phone}</p>
        </div>

        <div className={`${BRUTAL_CARD} p-5`}>
          <p className="font-display font-bold text-ink text-sm mb-2">Payment</p>
          <span
            className={`inline-block rounded-full border-2 border-ink px-3 py-0.5 font-body text-xs font-bold mb-2 ${
              order.payment_status === 'PAID' ? 'bg-green text-ink' : 'bg-yellow text-ink'
            }`}
          >
            {order.payment_status}
          </span>
          <p className="font-body text-sm text-ink">Method: {order.payment_method}</p>
          {order.payment_at && (
            <p className="font-body text-xs text-muted mt-1">{formatDateTime(order.payment_at)}</p>
          )}
          {order.gst_invoice && (
            <p className="font-mono text-xs font-bold text-primary mt-2">
              GST Invoice: {order.gst_invoice.invoice_number}
            </p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className={`${BRUTAL_CARD} p-5 mb-6`}>
        <h2 className="font-display text-lg font-bold text-ink mb-4">Items</h2>
        <div className="space-y-4">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl border-2 border-ink bg-background overflow-hidden shrink-0">
                <MerchVisual
                  image={item.image_url ? { url: item.image_url, alt: item.product_name } : null}
                  productName={item.product_name}
                  visualType={item.visualType || 'tee'}
                  color={item.visualColor || 'Maroon'}
                  className="!p-1"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-bold text-ink truncate">
                  {item.product_name}
                </p>
                <p className="font-body text-xs text-muted">
                  {item.variant_name} · Qty {item.quantity}
                </p>
                {item.combo_selections?.map((sel, idx) => (
                  <p key={sel.comboItemId || idx} className="font-body text-xs text-muted">
                    {sel.productName}:{' '}
                    {sel.variantAttributes
                      ? Object.values(sel.variantAttributes).join(' / ')
                      : sel.variantName}
                  </p>
                ))}
              </div>
              <p className="font-display text-sm font-bold text-ink shrink-0">
                {formatCurrency(item.total)}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t-2 border-ink mt-5 pt-4 space-y-1.5 font-body text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal (excl. GST)</span>
            <span>{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between font-bold text-primary">
              <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ''}</span>
              <span>−{formatCurrency(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-muted">
            <span>CGST + SGST</span>
            <span>{formatCurrency((order.cgst_amount || 0) + (order.sgst_amount || 0))}</span>
          </div>
          <div className="flex justify-between text-muted">
            <span>Shipping ({order.delivery_method_name})</span>
            <span>{order.shipping_amount === 0 ? 'Free' : formatCurrency(order.shipping_amount)}</span>
          </div>
          <div className="flex justify-between font-display text-lg font-bold text-ink pt-2 border-t-2 border-ink">
            <span>{order.payment_status === 'PENDING' ? 'Total Due' : 'Total Paid'}</span>
            <span className="text-primary">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {order.notes && (
        <div className={`${BRUTAL_CARD} p-4 mb-6 flex items-start gap-3`}>
          <FileTextIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="font-body text-xs font-bold uppercase text-muted">Order Notes</p>
            <p className="font-body text-sm text-ink mt-0.5">{order.notes}</p>
          </div>
        </div>
      )}

      <div className="text-center">
        <Link to="/merch/products" className={PILL_PRIMARY}>
          <ShoppingBagIcon className="w-4 h-4" />
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}

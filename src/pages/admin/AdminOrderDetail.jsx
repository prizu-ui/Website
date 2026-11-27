import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useMerch } from '../../merch/useMerch.js'
import { formatCurrency, formatDateTime } from '../../merch/utils.js'
import { BRUTAL_CARD, BRUTAL_INPUT, PILL_INK, PILL_PRIMARY } from '../../merch/merchStyles.js'

export default function AdminOrderDetail() {
  const { id } = useParams()
  const { orders, updateOrder, markOrderPaid } = useMerch()
  const order = orders.find((o) => o.id === id)

  if (!order) {
    return (
      <div className={`${BRUTAL_CARD} p-8 text-center`}>
        <h1 className="font-display text-2xl font-bold text-primary mb-2">Order Not Found</h1>
        <Link to="/admin/orders" className="font-body text-sm font-bold text-ink underline">
          ← Back to Orders
        </Link>
      </div>
    )
  }

  return (
    <AdminOrderDetailInner
      key={`${order.id}-${order.order_status}-${order.payment_status}`}
      order={order}
      updateOrder={updateOrder}
      markOrderPaid={markOrderPaid}
    />
  )
}

function AdminOrderDetailInner({ order, updateOrder, markOrderPaid }) {
  const [status, setStatus] = useState(order.order_status || 'PLACED')
  const [awb, setAwb] = useState(order.awb_number || '')
  const [courier, setCourier] = useState(order.courier_name || '')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  async function handleSave() {
    setSaving(true)
    const res = await updateOrder(order.id, {
      order_status: status,
      awb_number: awb.trim() || null,
      courier_name: courier.trim() || null,
    })
    setSaving(false)
    setMsg(res?.success ? 'Order updated!' : res?.error || 'Update failed')
    setTimeout(() => setMsg(''), 3000)
  }

  async function handleMarkPaid() {
    if (!window.confirm('Mark this order as paid and generate GST invoice number?')) return
    setSaving(true)
    const res = await markOrderPaid(order.id)
    setSaving(false)
    setMsg(res?.success ? 'Marked as paid & GST invoice generated!' : res?.error || 'Failed to mark paid')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/orders" className="font-body text-sm font-bold text-ink hover:underline">
          ← Back to Orders
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3 mt-2">
          <div>
            <h1 className="font-display text-3xl font-bold text-primary">
              Order #{order.order_number}
            </h1>
            <p className="font-body text-xs text-muted">{formatDateTime(order.created_at)}</p>
          </div>
          <Link
            to={`/merch/order/${order.id}`}
            className="font-body text-sm font-bold text-primary underline"
          >
            Open Customer Tracking View →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className={`${BRUTAL_CARD} p-5`}>
            <h2 className="font-display text-lg font-bold text-ink mb-3">Items</h2>
            <div className="space-y-3">
              {order.order_items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-3 font-body text-sm border-b border-ink/10 pb-2 last:border-b-0"
                >
                  <div>
                    <p className="font-bold text-ink">
                      {item.product_name} ({item.variant_name}) ×{item.quantity}
                    </p>
                    {item.combo_selections?.map((sel, idx) => (
                      <p key={sel.comboItemId || idx} className="text-xs text-muted">
                        {sel.productName}:{' '}
                        {sel.variantAttributes
                          ? Object.values(sel.variantAttributes).join(' / ')
                          : sel.variantName}
                      </p>
                    ))}
                  </div>
                  <span className="font-bold text-ink shrink-0">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
            <div className="border-t-2 border-ink mt-4 pt-3 space-y-1 font-body text-sm">
              <div className="flex justify-between text-muted">
                <span>Subtotal (excl. GST)</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-primary font-bold">
                  <span>Discount ({order.coupon_code})</span>
                  <span>−{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted">
                <span>CGST + SGST</span>
                <span>{formatCurrency((order.cgst_amount || 0) + (order.sgst_amount || 0))}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Shipping ({order.delivery_method_name})</span>
                <span>{formatCurrency(order.shipping_amount)}</span>
              </div>
              <div className="flex justify-between font-display text-lg font-bold text-ink pt-2 border-t-2 border-ink">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>

          <div className={`${BRUTAL_CARD} p-5 grid sm:grid-cols-2 gap-4 font-body text-sm`}>
            <div>
              <h3 className="font-display font-bold text-ink mb-2">Customer</h3>
              <p className="font-bold text-ink">{order.customer_name}</p>
              <p className="text-muted">{order.customer_email}</p>
              <p className="text-muted">{order.customer_phone}</p>
              {order.customer_gstin && (
                <p className="font-mono text-xs mt-1">GSTIN: {order.customer_gstin}</p>
              )}
              {order.gst_invoice && (
                <p className="font-mono text-xs font-bold text-primary mt-1">
                  Invoice: {order.gst_invoice.invoice_number}
                </p>
              )}
            </div>
            <div>
              <h3 className="font-display font-bold text-ink mb-2">Shipping Address</h3>
              <p className="text-ink">
                {order.shipping_address.line1}
                {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}
                <br />
                {order.shipping_address.city}, {order.shipping_address.state} –{' '}
                {order.shipping_address.pincode}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className={`${BRUTAL_CARD} p-5 space-y-4 h-fit`}>
          <h2 className="font-display text-lg font-bold text-ink">Actions</h2>

          <div>
            <label className="block font-body text-xs font-bold text-muted mb-1">
              Order Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={BRUTAL_INPUT}
            >
              {['PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-body text-xs font-bold text-muted mb-1">AWB Number</label>
            <input
              value={awb}
              onChange={(e) => setAwb(e.target.value)}
              className={`${BRUTAL_INPUT} font-mono`}
              placeholder="1234567890"
            />
          </div>

          <div>
            <label className="block font-body text-xs font-bold text-muted mb-1">Courier</label>
            <input
              value={courier}
              onChange={(e) => setCourier(e.target.value)}
              className={BRUTAL_INPUT}
              placeholder="Delhivery / DTDC / Bluedart"
            />
          </div>

          <button type="button" onClick={handleSave} disabled={saving} className={`${PILL_INK} w-full`}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>

          {order.payment_status !== 'PAID' && (
            <button type="button" onClick={handleMarkPaid} disabled={saving} className={`${PILL_PRIMARY} w-full`}>
              ✓ Mark as Paid (Cash / UPI at Event)
            </button>
          )}

          {msg && <p className="font-body text-sm font-bold text-center text-primary">{msg}</p>}
        </div>
      </div>
    </div>
  )
}


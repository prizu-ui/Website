import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMerch } from '../../merch/useMerch.js'
import { formatCurrency, formatDate } from '../../merch/utils.js'
import { BRUTAL_CARD, BRUTAL_INPUT, PILL_SURFACE } from '../../merch/merchStyles.js'

export default function AdminOrders() {
  const { orders } = useMerch()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter((o) => {
      if (statusFilter && o.order_status !== statusFilter) return false
      if (paymentFilter && o.payment_status !== paymentFilter) return false
      if (q) {
        const hay = `${o.order_number} ${o.customer_name} ${o.customer_email}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [orders, query, statusFilter, paymentFilter])

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-primary">Orders</h1>

      <div className="flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search order #, name, or email..."
          className={`${BRUTAL_INPUT} sm:w-64`}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={`${BRUTAL_INPUT} sm:w-44`}
        >
          <option value="">All Statuses</option>
          {['PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className={`${BRUTAL_INPUT} sm:w-44`}
        >
          <option value="">All Payments</option>
          {['PENDING', 'PAID', 'FAILED', 'REFUNDED'].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {(query || statusFilter || paymentFilter) && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setStatusFilter('')
              setPaymentFilter('')
            }}
            className={PILL_SURFACE}
          >
            Clear
          </button>
        )}
      </div>

      <div className={`${BRUTAL_CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead className="bg-background border-b-2 border-ink text-xs uppercase text-muted">
              <tr>
                <th className="text-left px-4 py-3">Order #</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Delivery</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-ink/10">
              {filtered.map((order) => (
                <tr key={order.id} className="hover:bg-background/60">
                  <td className="px-4 py-3 font-mono font-bold text-primary">
                    <Link to={`/admin/orders/${order.id}`} className="hover:underline">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink">{order.customer_name}</p>
                    <p className="text-xs text-muted">{order.customer_email}</p>
                  </td>
                  <td className="px-4 py-3 font-bold text-ink">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border border-ink px-2.5 py-0.5 text-xs font-bold ${
                        order.payment_status === 'PAID' ? 'bg-green text-ink' : 'bg-yellow text-ink'
                      }`}
                    >
                      {order.payment_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full border border-ink bg-background px-2.5 py-0.5 text-xs font-bold text-ink">
                      {order.order_status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{order.delivery_method_name}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-10 text-center font-body text-sm text-muted">No orders found.</div>
          )}
        </div>
      </div>
    </div>
  )
}


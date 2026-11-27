import { useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangleIcon, ClockIcon, ShoppingCartIcon, ZapIcon } from '../../merch/MerchIcons.jsx'
import { useMerch } from '../../merch/useMerch.js'
import { formatCurrency, formatDate } from '../../merch/utils.js'
import { BRUTAL_CARD } from '../../merch/merchStyles.js'

export default function AdminDashboard() {
  const { orders, rawProducts } = useMerch()
  const [todayPrefix] = useState(() => new Date().toISOString().split('T')[0])

  const todayOrders = orders.filter((o) => o.created_at?.startsWith(todayPrefix))
  const todayRevenue = todayOrders
    .filter((o) => o.payment_status === 'PAID')
    .reduce((sum, o) => sum + (o.total || 0), 0)
  const pendingCount = orders.filter((o) => o.order_status === 'PLACED').length
  const lowStockCount = rawProducts.reduce(
    (count, p) =>
      count +
      (p.variants || []).filter((v) => v.is_active !== false && v.stock > 0 && v.stock <= 5).length,
    0
  )

  const stats = [
    { label: "Today's Orders", value: todayOrders.length, icon: ShoppingCartIcon, bg: 'bg-accent-alt' },
    { label: "Today's Revenue", value: formatCurrency(todayRevenue), icon: ZapIcon, bg: 'bg-green' },
    { label: 'Pending Orders', value: pendingCount, icon: ClockIcon, bg: 'bg-yellow' },
    { label: 'Low Stock Variants', value: lowStockCount, icon: AlertTriangleIcon, bg: 'bg-accent' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Dashboard</h1>
          <p className="font-body text-sm text-muted">Live Merch Store overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((st) => {
          const Icon = st.icon
          return (
            <div key={st.label} className={`${BRUTAL_CARD} p-4 flex items-center gap-3.5`}>
              <div
                className={`w-12 h-12 rounded-xl border-2 border-ink ${st.bg} flex items-center justify-center shrink-0`}
              >
                <Icon className="w-5 h-5 text-ink" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-2xl font-bold text-ink truncate">{st.value}</p>
                <p className="font-body text-xs text-muted">{st.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className={`${BRUTAL_CARD} overflow-hidden`}>
        <div className="flex items-center justify-between border-b-2 border-ink px-5 py-4 bg-background">
          <h2 className="font-display text-lg font-bold text-ink">Recent Orders</h2>
          <Link to="/admin/orders" className="font-body text-sm font-bold text-primary hover:underline">
            View all →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead className="bg-surface border-b-2 border-ink text-xs uppercase text-muted">
              <tr>
                <th className="text-left px-4 py-3">Order #</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Amount</th>
                <th className="text-left px-4 py-3">Payment</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-ink/10">
              {orders.slice(0, 10).map((order) => (
                <tr key={order.id} className="hover:bg-background/60">
                  <td className="px-4 py-3 font-mono font-bold text-primary">
                    <Link to={`/admin/orders/${order.id}`} className="hover:underline">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{order.customer_name}</td>
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
                  <td className="px-4 py-3 text-muted">{formatDate(order.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {orders.length === 0 && (
            <div className="p-8 text-center font-body text-sm text-muted">
              No orders yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


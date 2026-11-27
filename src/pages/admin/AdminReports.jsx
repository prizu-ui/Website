import { useMemo, useState } from 'react'
import { useMerch } from '../../merch/useMerch.js'
import { formatCurrency } from '../../merch/utils.js'
import { BRUTAL_CARD, PILL_CHIP, PILL_SURFACE } from '../../merch/merchStyles.js'

const TABS = [
  { id: 'sales', label: 'Sales' },
  { id: 'products', label: 'Products' },
  { id: 'gst', label: 'GST' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'inventory', label: 'Inventory' },
]

export default function AdminReports() {
  const { orders, rawProducts, coupons } = useMerch()
  const [tab, setTab] = useState('sales')

  const salesRows = useMemo(() => {
    const map = new Map()
    for (const o of orders) {
      const date = o.created_at.split('T')[0]
      const row = map.get(date) || { date, orders: 0, revenue: 0, cgst: 0, sgst: 0 }
      row.orders += 1
      row.revenue += o.total || 0
      row.cgst += o.cgst_amount || 0
      row.sgst += o.sgst_amount || 0
      map.set(date, row)
    }
    return Array.from(map.values())
  }, [orders])

  const productRows = useMemo(() => {
    const map = new Map()
    for (const o of orders) {
      for (const item of o.order_items || []) {
        const key = `${item.product_name}__${item.variant_name}`
        const row = map.get(key) || {
          product_name: item.product_name,
          variant_name: item.variant_name,
          quantity_sold: 0,
          revenue: 0,
        }
        row.quantity_sold += item.quantity || 0
        row.revenue += item.total || 0
        map.set(key, row)
      }
    }
    return Array.from(map.values())
  }, [orders])

  const gstRows = useMemo(() => {
    const map = new Map()
    for (const o of orders) {
      for (const item of o.order_items || []) {
        const key = `${item.hsn_code}__${item.gst_rate}`
        const row = map.get(key) || {
          hsn_code: item.hsn_code || '6109',
          gst_rate: item.gst_rate ?? 18,
          taxable_amount: 0,
          cgst_amount: 0,
          sgst_amount: 0,
          total_tax: 0,
        }
        const tax = (item.cgst_amount || 0) + (item.sgst_amount || 0)
        row.taxable_amount += (item.total || 0) - tax
        row.cgst_amount += item.cgst_amount || 0
        row.sgst_amount += item.sgst_amount || 0
        row.total_tax += tax
        map.set(key, row)
      }
    }
    return Array.from(map.values())
  }, [orders])

  const inventoryRows = useMemo(() => {
    const rows = []
    for (const p of rawProducts) {
      for (const v of p.variants || []) {
        rows.push({
          product_name: p.name,
          variant_name: v.name,
          sku: v.sku || '—',
          stock: v.stock ?? 0,
          allow_backorder: !!v.allow_backorder,
        })
      }
    }
    return rows
  }, [rawProducts])

  function downloadCsv() {
    let headers = []
    let rows = []
    if (tab === 'sales') {
      headers = ['Date', 'Orders', 'Revenue', 'CGST', 'SGST']
      rows = salesRows.map((r) => [r.date, r.orders, r.revenue, r.cgst, r.sgst])
    } else if (tab === 'products') {
      headers = ['Product', 'Variant', 'Qty Sold', 'Revenue']
      rows = productRows.map((r) => [r.product_name, r.variant_name, r.quantity_sold, r.revenue])
    } else if (tab === 'gst') {
      headers = ['HSN', 'GST %', 'Taxable', 'CGST', 'SGST', 'Total Tax']
      rows = gstRows.map((r) => [r.hsn_code, r.gst_rate, r.taxable_amount, r.cgst_amount, r.sgst_amount, r.total_tax])
    } else if (tab === 'coupons') {
      headers = ['Code', 'Type', 'Usage Count']
      rows = coupons.map((c) => [c.code, c.type, c.usage_count || 0])
    } else {
      headers = ['Product', 'Variant', 'SKU', 'Stock', 'Backorder']
      rows = inventoryRows.map((r) => [r.product_name, r.variant_name, r.sku, r.stock, r.allow_backorder])
    }
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shebuilds-merch-${tab}-report.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-primary">Reports</h1>
        <button type="button" onClick={downloadCsv} className={PILL_SURFACE}>
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={PILL_CHIP(tab === t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className={`${BRUTAL_CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          {tab === 'sales' && (
            <table className="w-full text-sm font-body">
              <thead className="bg-background border-b-2 border-ink text-xs uppercase text-muted">
                <tr>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Orders</th>
                  <th className="text-left px-4 py-3">Revenue</th>
                  <th className="text-left px-4 py-3">CGST</th>
                  <th className="text-left px-4 py-3">SGST</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/10">
                {salesRows.map((r) => (
                  <tr key={r.date}>
                    <td className="px-4 py-3 font-mono">{r.date}</td>
                    <td className="px-4 py-3 font-bold">{r.orders}</td>
                    <td className="px-4 py-3 font-bold">{formatCurrency(r.revenue)}</td>
                    <td className="px-4 py-3">{formatCurrency(r.cgst)}</td>
                    <td className="px-4 py-3">{formatCurrency(r.sgst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'products' && (
            <table className="w-full text-sm font-body">
              <thead className="bg-background border-b-2 border-ink text-xs uppercase text-muted">
                <tr>
                  <th className="text-left px-4 py-3">Product</th>
                  <th className="text-left px-4 py-3">Variant</th>
                  <th className="text-left px-4 py-3">Qty Sold</th>
                  <th className="text-left px-4 py-3">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/10">
                {productRows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-bold">{r.product_name}</td>
                    <td className="px-4 py-3 text-muted">{r.variant_name}</td>
                    <td className="px-4 py-3 font-bold">{r.quantity_sold}</td>
                    <td className="px-4 py-3 font-bold">{formatCurrency(r.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'gst' && (
            <table className="w-full text-sm font-body">
              <thead className="bg-background border-b-2 border-ink text-xs uppercase text-muted">
                <tr>
                  <th className="text-left px-4 py-3">HSN</th>
                  <th className="text-left px-4 py-3">GST %</th>
                  <th className="text-left px-4 py-3">Taxable</th>
                  <th className="text-left px-4 py-3">CGST</th>
                  <th className="text-left px-4 py-3">SGST</th>
                  <th className="text-left px-4 py-3">Total Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/10">
                {gstRows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-mono font-bold">{r.hsn_code}</td>
                    <td className="px-4 py-3">{r.gst_rate}%</td>
                    <td className="px-4 py-3">{formatCurrency(r.taxable_amount)}</td>
                    <td className="px-4 py-3">{formatCurrency(r.cgst_amount)}</td>
                    <td className="px-4 py-3">{formatCurrency(r.sgst_amount)}</td>
                    <td className="px-4 py-3 font-bold">{formatCurrency(r.total_tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'coupons' && (
            <table className="w-full text-sm font-body">
              <thead className="bg-background border-b-2 border-ink text-xs uppercase text-muted">
                <tr>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3">Used</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/10">
                {coupons.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-mono font-bold text-primary">{c.code}</td>
                    <td className="px-4 py-3">{c.type}</td>
                    <td className="px-4 py-3 font-bold">{c.usage_count || 0}</td>
                    <td className="px-4 py-3">{c.is_active ? 'Active' : 'Off'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'inventory' && (
            <table className="w-full text-sm font-body">
              <thead className="bg-background border-b-2 border-ink text-xs uppercase text-muted">
                <tr>
                  <th className="text-left px-4 py-3">Product</th>
                  <th className="text-left px-4 py-3">Variant</th>
                  <th className="text-left px-4 py-3">SKU</th>
                  <th className="text-left px-4 py-3">Stock</th>
                  <th className="text-left px-4 py-3">Backorder</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/10">
                {inventoryRows.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-bold">{r.product_name}</td>
                    <td className="px-4 py-3 text-muted">{r.variant_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{r.sku}</td>
                    <td className="px-4 py-3 font-bold">{r.stock}</td>
                    <td className="px-4 py-3">{r.allow_backorder ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {((tab === 'sales' && !salesRows.length) ||
            (tab === 'products' && !productRows.length) ||
            (tab === 'gst' && !gstRows.length)) && (
            <div className="p-8 text-center font-body text-sm text-muted">
              No order data recorded yet for this report.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


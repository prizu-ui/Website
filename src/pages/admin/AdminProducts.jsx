import { useState } from 'react'
import { Link } from 'react-router'
import { PlusIcon, TrashIcon } from '../../merch/MerchIcons.jsx'
import { useMerch } from '../../merch/useMerch.js'
import { formatCurrency } from '../../merch/utils.js'
import { BRUTAL_CARD, PILL_PRIMARY } from '../../merch/merchStyles.js'

export default function AdminProducts() {
  const { rawProducts, deleteProduct } = useMerch()
  const [error, setError] = useState('')

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return
    setError('')
    const res = await deleteProduct(id)
    if (!res?.success) {
      setError(res?.error || 'Failed to delete product')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-bold text-primary">Products</h1>
        <Link to="/admin/products/new" className={PILL_PRIMARY}>
          <PlusIcon className="w-4 h-4" />
          New Product
        </Link>
      </div>

      {error && <p className="font-body text-sm font-bold text-danger">{error}</p>}

      <div className={`${BRUTAL_CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-body">
            <thead className="bg-background border-b-2 border-ink text-xs uppercase text-muted">
              <tr>
                <th className="text-left px-4 py-3">Product</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Base Price</th>
                <th className="text-left px-4 py-3">Variants</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-ink/10">
              {rawProducts.map((p) => (
                <tr key={p.id} className="hover:bg-background/60">
                  <td className="px-4 py-3">
                    <p className="font-bold text-ink">{p.name}</p>
                    <p className="font-mono text-xs text-muted">{p.slug}</p>
                    <div className="flex gap-1.5 mt-1">
                      {p.is_combo && (
                        <span className="rounded-full border border-ink bg-yellow px-2 py-0.5 text-xs font-bold text-ink">
                          COMBO
                        </span>
                      )}
                      {p.is_featured && (
                        <span className="rounded-full border border-ink bg-accent-alt px-2 py-0.5 text-xs font-bold text-ink">
                          FEATURED
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3 font-bold text-ink">{formatCurrency(p.base_price)}</td>
                  <td className="px-4 py-3 text-muted">{p.variants?.length || 0} variants</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border border-ink px-2.5 py-0.5 text-xs font-bold ${
                        p.is_active ? 'bg-green text-ink' : 'bg-background text-muted'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/admin/products/${p.id}`}
                        className="font-bold text-primary hover:underline"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id, p.name)}
                        aria-label={`Delete ${p.name}`}
                        className="text-muted hover:text-danger"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


import { useState } from 'react'
import { PencilIcon, TrashIcon } from '../../merch/MerchIcons.jsx'
import { useMerch } from '../../merch/useMerch.js'
import { BRUTAL_CARD, BRUTAL_INPUT, PILL_INK, PILL_SURFACE } from '../../merch/merchStyles.js'

const EMPTY_COUPON = {
  code: '',
  description: '',
  type: 'PERCENTAGE',
  value: 10,
  min_order_amount: '',
  max_discount: '',
  usage_limit: '',
  is_active: true,
  valid_from: '',
  valid_until: '',
  is_first_order_only: false,
  buy_quantity: 2,
  get_quantity: 1,
}

export default function AdminCoupons() {
  const { coupons, saveCoupon, deleteCoupon } = useMerch()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ ...EMPTY_COUPON })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  function startEdit(c) {
    setEditing(c)
    setForm({
      code: c.code,
      description: c.description || '',
      type: c.type,
      value: c.value ?? 0,
      min_order_amount: c.min_order_amount ?? '',
      max_discount: c.max_discount ?? '',
      usage_limit: c.usage_limit ?? '',
      is_active: c.is_active !== false,
      valid_from: c.valid_from ? c.valid_from.split('T')[0] : '',
      valid_until: c.valid_until ? c.valid_until.split('T')[0] : '',
      is_first_order_only: !!c.is_first_order_only,
      buy_quantity: c.buy_quantity ?? 2,
      get_quantity: c.get_quantity ?? 1,
    })
  }

  function reset() {
    setEditing(null)
    setForm({ ...EMPTY_COUPON })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await saveCoupon(
      {
        code: form.code.toUpperCase().trim(),
        description: form.description.trim(),
        type: form.type,
        value: Number(form.value) || 0,
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : 0,
        max_discount: form.max_discount ? Number(form.max_discount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        is_active: !!form.is_active,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        is_first_order_only: !!form.is_first_order_only,
        buy_quantity: form.type === 'BUY_X_GET_Y' ? Number(form.buy_quantity) || 1 : null,
        get_quantity: form.type === 'BUY_X_GET_Y' ? Number(form.get_quantity) || 1 : null,
      },
      editing?.id || null
    )
    setSaving(false)
    if (!res?.success) {
      setError(res?.error || 'Failed to save coupon')
      return
    }
    setMsg(editing ? 'Coupon updated!' : 'Coupon created!')
    reset()
    setTimeout(() => setMsg(''), 2500)
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-primary">Coupons</h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className={`${BRUTAL_CARD} p-6`}>
          <h2 className="font-display text-lg font-bold text-ink mb-4">
            {editing ? 'Edit Coupon' : 'New Coupon'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-body text-xs font-bold text-muted mb-1">Code *</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className={`${BRUTAL_INPUT} font-mono uppercase`}
                  placeholder="SHEBUILDSNOV28"
                />
              </div>
              <div>
                <label className="block font-body text-xs font-bold text-muted mb-1">Type *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className={BRUTAL_INPUT}
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FLAT">Flat Amount</option>
                  <option value="FREE_SHIPPING">Free Shipping</option>
                  <option value="BUY_X_GET_Y">Buy X Get Y</option>
                </select>
              </div>
            </div>

            {form.type !== 'FREE_SHIPPING' && form.type !== 'BUY_X_GET_Y' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-body text-xs font-bold text-muted mb-1">
                    {form.type === 'PERCENTAGE' ? 'Discount %' : 'Discount Amount (₹)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: Number(e.target.value) }))}
                    className={BRUTAL_INPUT}
                  />
                </div>
                {form.type === 'PERCENTAGE' && (
                  <div>
                    <label className="block font-body text-xs font-bold text-muted mb-1">
                      Max Discount (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.max_discount}
                      onChange={(e) => setForm((f) => ({ ...f, max_discount: e.target.value }))}
                      className={BRUTAL_INPUT}
                      placeholder="Optional"
                    />
                  </div>
                )}
              </div>
            )}

            {form.type === 'BUY_X_GET_Y' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-body text-xs font-bold text-muted mb-1">
                    Buy Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.buy_quantity}
                    onChange={(e) => setForm((f) => ({ ...f, buy_quantity: e.target.value }))}
                    className={BRUTAL_INPUT}
                  />
                </div>
                <div>
                  <label className="block font-body text-xs font-bold text-muted mb-1">
                    Get Quantity (free)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.get_quantity}
                    onChange={(e) => setForm((f) => ({ ...f, get_quantity: e.target.value }))}
                    className={BRUTAL_INPUT}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-body text-xs font-bold text-muted mb-1">
                  Min Order (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.min_order_amount}
                  onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))}
                  className={BRUTAL_INPUT}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block font-body text-xs font-bold text-muted mb-1">
                  Max Uses
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.usage_limit}
                  onChange={(e) => setForm((f) => ({ ...f, usage_limit: e.target.value }))}
                  className={BRUTAL_INPUT}
                  placeholder="Unlimited"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-body text-xs font-bold text-muted mb-1">
                  Valid From
                </label>
                <input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                  className={BRUTAL_INPUT}
                />
              </div>
              <div>
                <label className="block font-body text-xs font-bold text-muted mb-1">
                  Valid Until
                </label>
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                  className={BRUTAL_INPUT}
                />
              </div>
            </div>

            <div>
              <label className="block font-body text-xs font-bold text-muted mb-1">
                Description
              </label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={BRUTAL_INPUT}
                placeholder="10% off for community members"
              />
            </div>

            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 font-body text-sm font-bold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="accent-primary"
                />
                Active
              </label>
              <label className="flex items-center gap-2 font-body text-sm font-bold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_first_order_only}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_first_order_only: e.target.checked }))
                  }
                  className="accent-primary"
                />
                First Order Only
              </label>
            </div>

            {error && <p className="font-body text-sm font-bold text-danger">{error}</p>}
            {msg && <p className="font-body text-sm font-bold text-primary">{msg}</p>}

            <div className="flex gap-2">
              <button type="submit" disabled={saving} className={`flex-1 ${PILL_INK}`}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
              {editing && (
                <button type="button" onClick={reset} className={PILL_SURFACE}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className={`${BRUTAL_CARD} overflow-hidden`}>
          <div className="border-b-2 border-ink bg-background px-5 py-4">
            <h2 className="font-display text-lg font-bold text-ink">All Coupons</h2>
          </div>
          <div className="divide-y-2 divide-ink/10">
            {coupons.map((c) => (
              <div key={c.id} className="p-4 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">{c.code}</span>
                    <span
                      className={`rounded-full border border-ink px-2 py-0.5 font-body text-xs font-bold ${
                        c.is_active ? 'bg-green text-ink' : 'bg-background text-muted'
                      }`}
                    >
                      {c.is_active ? 'Active' : 'Off'}
                    </span>
                  </div>
                  <p className="font-body text-xs text-ink mt-1">
                    {c.type === 'PERCENTAGE'
                      ? `${c.value}% off`
                      : c.type === 'FLAT'
                        ? `₹${c.value} off`
                        : c.type === 'FREE_SHIPPING'
                          ? 'Free Shipping'
                          : `Buy ${c.buy_quantity} Get ${c.get_quantity}`}
                    {c.min_order_amount ? ` · Min ₹${c.min_order_amount}` : ''}
                  </p>
                  <p className="font-body text-xs text-muted mt-0.5">
                    Used {c.usage_count || 0}
                    {c.usage_limit ? `/${c.usage_limit}` : ''} times
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    className="p-1.5 text-muted hover:text-primary"
                    aria-label={`Edit ${c.code}`}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`Delete coupon ${c.code}?`)) return
                      const res = await deleteCoupon(c.id)
                      if (!res?.success) setError(res?.error || 'Failed to delete coupon')
                    }}
                    className="p-1.5 text-muted hover:text-danger"
                    aria-label={`Delete ${c.code}`}
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


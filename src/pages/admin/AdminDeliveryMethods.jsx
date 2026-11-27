import { useState } from 'react'
import { useMerch } from '../../merch/useMerch.js'
import { BRUTAL_CARD, BRUTAL_INPUT, PILL_INK } from '../../merch/merchStyles.js'

function DeliveryMethodCard({ method, updateDeliveryMethod }) {
  const [draft, setDraft] = useState({
    is_active: method.is_active !== false,
    price: method.price ?? 0,
    estimated_days: method.estimated_days || '',
    sort_order: method.sort_order ?? 0,
    description: method.description || '',
  })
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    const res = await updateDeliveryMethod(method.id, {
      is_active: !!draft.is_active,
      price: Number(draft.price) || 0,
      estimated_days: draft.estimated_days,
      sort_order: Number(draft.sort_order) || 0,
      description: draft.description,
    })
    setSaving(false)
    setStatusMsg(res?.success ? 'Saved!' : res?.error || 'Failed to save')
    setTimeout(() => setStatusMsg(''), 2500)
  }

  return (
    <form onSubmit={handleSave} className={`${BRUTAL_CARD} p-5 space-y-4`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-ink">{method.name}</h2>
        <label className="flex items-center gap-2 font-body text-sm font-bold text-ink cursor-pointer">
          <input
            type="checkbox"
            checked={draft.is_active}
            onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
            className="accent-primary"
          />
          Active
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block font-body text-xs font-bold text-muted mb-1">Price (₹)</label>
          <input
            type="number"
            min={0}
            value={draft.price}
            onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
            className={BRUTAL_INPUT}
          />
        </div>
        <div>
          <label className="block font-body text-xs font-bold text-muted mb-1">Estimated Days</label>
          <input
            value={draft.estimated_days}
            onChange={(e) => setDraft((d) => ({ ...d, estimated_days: e.target.value }))}
            className={BRUTAL_INPUT}
          />
        </div>
        <div>
          <label className="block font-body text-xs font-bold text-muted mb-1">Sort Order</label>
          <input
            type="number"
            value={draft.sort_order}
            onChange={(e) => setDraft((d) => ({ ...d, sort_order: e.target.value }))}
            className={BRUTAL_INPUT}
          />
        </div>
      </div>
      <div>
        <label className="block font-body text-xs font-bold text-muted mb-1">Description</label>
        <input
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          className={BRUTAL_INPUT}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        {statusMsg ? (
          <p className="font-body text-xs font-bold text-primary">{statusMsg}</p>
        ) : (
          <span />
        )}
        <button type="submit" disabled={saving} className={PILL_INK}>
          {saving ? 'Saving...' : 'Save Method'}
        </button>
      </div>
    </form>
  )
}

export default function AdminDeliveryMethods() {
  const {
    deliveryMethods,
    sameDayPincodes,
    updateDeliveryMethod,
    addSameDayPincode,
    removeSameDayPincode,
  } = useMerch()

  const [newPincode, setNewPincode] = useState('')
  const [newAreaName, setNewAreaName] = useState('')
  const [pincodeMsg, setPincodeMsg] = useState('')

  async function handleAddPincode(e) {
    e.preventDefault()
    const res = await addSameDayPincode(newPincode.trim(), newAreaName.trim())
    if (res?.success) {
      setNewPincode('')
      setNewAreaName('')
      setPincodeMsg('Pincode added!')
    } else {
      setPincodeMsg(res?.error || 'Invalid pincode')
    }
    setTimeout(() => setPincodeMsg(''), 3000)
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold text-primary">Delivery Methods</h1>

      <div className="space-y-4">
        {deliveryMethods.map((m) => (
          <DeliveryMethodCard
            key={`${m.id}-${m.updated_at || ''}`}
            method={m}
            updateDeliveryMethod={updateDeliveryMethod}
          />
        ))}
      </div>

      {/* Optional Express / Pincode-gated Delivery Pincodes */}
      <div className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold text-ink">
            Special Pincode Allowlist (Optional)
          </h2>
          <p className="font-body text-sm text-muted">
            If you enable a SAME_DAY delivery method later, only pincodes listed here will see it at
            checkout.
          </p>
        </div>

        <form onSubmit={handleAddPincode} className={`${BRUTAL_CARD} p-5 flex flex-wrap gap-3 items-end`}>
          <div>
            <label className="block font-body text-xs font-bold text-muted mb-1">Pincode *</label>
            <input
              value={newPincode}
              onChange={(e) => setNewPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              placeholder="600001"
              className={`${BRUTAL_INPUT} w-36 font-mono`}
            />
          </div>
          <div className="flex-1 min-w-48">
            <label className="block font-body text-xs font-bold text-muted mb-1">Area Name</label>
            <input
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              placeholder="e.g. Chennai - Velachery"
              className={BRUTAL_INPUT}
            />
          </div>
          <button type="submit" className={PILL_INK}>
            + Add
          </button>
        </form>

        {pincodeMsg && <p className="font-body text-sm font-bold text-primary">{pincodeMsg}</p>}

        <div className={`${BRUTAL_CARD} overflow-hidden`}>
          {sameDayPincodes.length === 0 ? (
            <p className="p-5 font-body text-sm text-muted text-center">
              No pincodes configured yet.
            </p>
          ) : (
            <table className="w-full text-sm font-body">
              <thead className="bg-background border-b-2 border-ink text-xs uppercase text-muted">
                <tr>
                  <th className="text-left px-4 py-3">Pincode</th>
                  <th className="text-left px-4 py-3">Area</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-ink/10">
                {sameDayPincodes.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3 font-mono font-bold text-ink">{p.pincode}</td>
                    <td className="px-4 py-3 text-muted">{p.area_name || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeSameDayPincode(p.pincode)}
                        className="font-bold text-danger text-xs hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

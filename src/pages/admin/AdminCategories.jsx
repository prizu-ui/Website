import { useState } from 'react'
import { PencilIcon, TrashIcon } from '../../merch/MerchIcons.jsx'
import { useMerch } from '../../merch/useMerch.js'
import { slugify } from '../../merch/utils.js'
import { BRUTAL_CARD, BRUTAL_INPUT, PILL_INK, PILL_SURFACE } from '../../merch/merchStyles.js'

export default function AdminCategories() {
  const { categories, saveCategory, deleteCategory } = useMerch()
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', slug: '', description: '', sort_order: 0 })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  function startEdit(cat) {
    setEditing(cat)
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || '',
      sort_order: cat.sort_order ?? 0,
    })
  }

  function reset() {
    setEditing(null)
    setForm({ name: '', slug: '', description: '', sort_order: 0 })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await saveCategory(
      {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim(),
        sort_order: Number(form.sort_order) || 0,
      },
      editing?.id || null
    )
    setSaving(false)
    if (!res?.success) {
      setError(res?.error || 'Failed to save category')
      return
    }
    setMsg(editing ? 'Category updated!' : 'Category created!')
    reset()
    setTimeout(() => setMsg(''), 2500)
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-primary">Categories</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className={`${BRUTAL_CARD} p-6`}>
          <h2 className="font-display text-lg font-bold text-ink mb-4">
            {editing ? 'Edit Category' : 'New Category'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-body text-xs font-bold text-muted mb-1">Name *</label>
              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: editing ? f.slug : slugify(e.target.value),
                  }))
                }
                className={BRUTAL_INPUT}
              />
            </div>
            <div>
              <label className="block font-body text-xs font-bold text-muted mb-1">Slug *</label>
              <input
                required
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className={`${BRUTAL_INPUT} font-mono`}
              />
            </div>
            <div>
              <label className="block font-body text-xs font-bold text-muted mb-1">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className={`${BRUTAL_INPUT} resize-none`}
              />
            </div>
            <div>
              <label className="block font-body text-xs font-bold text-muted mb-1">Sort Order</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))}
                className={BRUTAL_INPUT}
              />
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
            <h2 className="font-display text-lg font-bold text-ink">All Categories</h2>
          </div>
          <div className="divide-y-2 divide-ink/10">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-display font-bold text-ink">{cat.name}</p>
                  <p className="font-mono text-xs text-muted">{cat.slug}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(cat)}
                    className="p-1.5 text-muted hover:text-primary"
                    aria-label={`Edit ${cat.name}`}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`Delete "${cat.name}"?`)) return
                      const res = await deleteCategory(cat.id)
                      if (!res?.success) setError(res?.error || 'Failed to delete category')
                    }}
                    className="p-1.5 text-muted hover:text-danger"
                    aria-label={`Delete ${cat.name}`}
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


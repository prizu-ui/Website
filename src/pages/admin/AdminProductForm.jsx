import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { PlusIcon, TrashIcon } from '../../merch/MerchIcons.jsx'
import { useMerch } from '../../merch/useMerch.js'
import { slugify } from '../../merch/utils.js'
import { BRUTAL_CARD, BRUTAL_INPUT, PILL_INK, PILL_PRIMARY, PILL_SURFACE } from '../../merch/merchStyles.js'

const EMPTY_VARIANT = {
  color: 'Maroon',
  size: 'M',
  sku: '',
  price: 599,
  compare_at_price: 0,
  stock: 10,
  allow_backorder: false,
  is_active: true,
  visualType: 'tee',
  images: [],
}

export default function AdminProductForm() {
  const { id } = useParams()
  const isNew = !id || id === 'new'
  const { rawProducts } = useMerch()
  const existing = !isNew ? rawProducts.find((p) => p.id === id) : null

  return (
    <AdminProductFormInner
      key={existing?.id || 'new'}
      isNew={isNew}
      existing={existing}
    />
  )
}

function AdminProductFormInner({ isNew, existing }) {
  const navigate = useNavigate()
  const { categories, rawProducts, saveProduct, uploadProductImage } = useMerch()

  const [form, setForm] = useState(() =>
    existing
      ? {
          name: existing.name || '',
          slug: existing.slug || '',
          description: existing.description || '',
          category_id: existing.category_id || '',
          hsn_code: existing.hsn_code || '6109',
          gst_rate: existing.gst_rate ?? 5,
          price_includes_gst: existing.price_includes_gst ?? true,
          is_combo: !!existing.is_combo,
          is_featured: !!existing.is_featured,
          is_active: existing.is_active !== false,
          tags: (existing.tags || []).join(', '),
        }
      : {
          name: '',
          slug: '',
          description: '',
          category_id: '',
          hsn_code: '6109',
          gst_rate: 5,
          price_includes_gst: true,
          is_combo: false,
          is_featured: false,
          is_active: true,
          tags: '',
        }
  )

  const [variants, setVariants] = useState(() =>
    existing?.variants?.length
      ? existing.variants.map((v) => ({
          id: v.id,
          color: v.attributes?.color || '',
          size: v.attributes?.size || '',
          sku: v.sku || '',
          price: v.price ?? 0,
          compare_at_price: v.compare_at_price || 0,
          stock: v.stock ?? 0,
          allow_backorder: !!v.allow_backorder,
          is_active: v.is_active !== false,
          visualType: v.images?.[0]?.visualType || 'tee',
          images: v.images || [],
        }))
      : [{ ...EMPTY_VARIANT }]
  )

  const [comboProductIds, setComboProductIds] = useState(() =>
    (existing?.combo_items || []).map((ci) => ci.product_id)
  )
  const [imageUrlInput, setImageUrlInput] = useState({})
  const [uploadingIdx, setUploadingIdx] = useState(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  function updateVariant(idx, key, val) {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, [key]: val } : v)))
  }

  async function handleFileUpload(idx, file) {
    if (!file) return
    setMsg('')
    setUploadingIdx(idx)
    const res = await uploadProductImage(file)
    setUploadingIdx(null)
    if (!res?.success || !res.data?.url) {
      setMsg(res?.error || 'Image upload failed')
      return
    }
    setVariants((prev) =>
      prev.map((v, i) =>
        i === idx
          ? {
              ...v,
              images: [
                ...(v.images || []).filter((img) => img.url),
                {
                  id: `img-${Date.now()}`,
                  url: res.data.url,
                  storage_path: res.data.storage_path,
                  alt: form.name || 'Product image',
                  sort_order: (v.images || []).length,
                },
              ],
            }
          : v
      )
    )
  }

  function addImageByUrl(idx) {
    const url = (imageUrlInput[idx] || '').trim()
    if (!url) return
    setVariants((prev) =>
      prev.map((v, i) =>
        i === idx
          ? {
              ...v,
              images: [
                ...(v.images || []).filter((img) => img.url),
                { id: `img-${Date.now()}`, url, alt: form.name, sort_order: (v.images || []).length },
              ],
            }
          : v
      )
    )
    setImageUrlInput((prev) => ({ ...prev, [idx]: '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setMsg('Product name is required')
      return
    }
    setMsg('')
    setSaving(true)

    const basePrice = variants.length ? Math.min(...variants.map((v) => Number(v.price) || 0)) : 0
    const normalizedVariants = variants.map((v, idx) => {
      const nameParts = [v.color, v.size].filter(Boolean)
      const images = (v.images || []).filter((img) => img.url)

      return {
        id: v.id || null,
        name: nameParts.join(' / ') || 'Default',
        attributes: {
          ...(v.color ? { color: v.color } : {}),
          ...(v.size ? { size: v.size } : {}),
        },
        sku: v.sku || null,
        price: Number(v.price) || 0,
        compare_at_price: Number(v.compare_at_price) > 0 ? Number(v.compare_at_price) : null,
        stock: Number(v.stock) || 0,
        allow_backorder: !!v.allow_backorder,
        is_active: v.is_active !== false,
        sort_order: idx + 1,
        images,
      }
    })

    const comboItems = form.is_combo
      ? comboProductIds.map((pid) => ({
          product_id: pid,
          quantity: 1,
        }))
      : []

    const res = await saveProduct(
      {
        name: form.name.trim(),
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim(),
        category_id: form.category_id || null,
        hsn_code: form.hsn_code.trim() || '6109',
        gst_rate: Number(form.gst_rate),
        price_includes_gst: !!form.price_includes_gst,
        is_combo: !!form.is_combo,
        is_featured: !!form.is_featured,
        is_active: !!form.is_active,
        base_price: basePrice,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        variants: normalizedVariants,
        combo_items: comboItems,
      },
      isNew ? null : existing?.id
    )

    setSaving(false)
    if (!res?.success) {
      setMsg(res?.error || 'Failed to save product')
      return
    }

    navigate('/admin/products')
  }

  const singleProducts = rawProducts.filter((p) => !p.is_combo && p.id !== existing?.id)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Link to="/admin/products" className="font-body text-sm font-bold text-ink hover:underline">
          ← Back to Products
        </Link>
        <h1 className="font-display text-3xl font-bold text-primary mt-1">
          {isNew ? 'New Product' : `Edit: ${existing?.name || 'Product'}`}
        </h1>
      </div>

      <div className={`${BRUTAL_CARD} p-6 space-y-4`}>
        <h2 className="font-display text-lg font-bold text-ink">Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block font-body text-xs font-bold text-muted mb-1">Product Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  name: e.target.value,
                  slug: isNew ? slugify(e.target.value) : f.slug,
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
            <label className="block font-body text-xs font-bold text-muted mb-1">Category</label>
            <select
              value={form.category_id}
              onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
              className={BRUTAL_INPUT}
            >
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block font-body text-xs font-bold text-muted mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={`${BRUTAL_INPUT} resize-none`}
            />
          </div>
          <div>
            <label className="block font-body text-xs font-bold text-muted mb-1">HSN Code</label>
            <input
              value={form.hsn_code}
              onChange={(e) => setForm((f) => ({ ...f, hsn_code: e.target.value }))}
              className={`${BRUTAL_INPUT} font-mono`}
            />
          </div>
          <div>
            <label className="block font-body text-xs font-bold text-muted mb-1">GST Rate (%)</label>
            <select
              value={form.gst_rate}
              onChange={(e) => setForm((f) => ({ ...f, gst_rate: Number(e.target.value) }))}
              className={BRUTAL_INPUT}
            >
              {[0, 5, 12, 18, 28].map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block font-body text-xs font-bold text-muted mb-1">
              Tags (comma separated)
            </label>
            <input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              className={BRUTAL_INPUT}
              placeholder="shebuilds, tee, community"
            />
          </div>
          <div className="sm:col-span-2 flex flex-wrap gap-5 pt-2">
            {[
              { key: 'is_active', label: 'Active' },
              { key: 'is_featured', label: 'Featured' },
              { key: 'is_combo', label: 'Combo Product' },
              { key: 'price_includes_gst', label: 'Price Includes GST' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 font-body text-sm font-bold text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                  className="w-4 h-4 accent-primary"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        {form.is_combo && (
          <div className="border-t-2 border-ink pt-4">
            <p className="font-display text-sm font-bold text-ink mb-2">
              Included Bundle Products (select 2+)
            </p>
            <div className="flex flex-wrap gap-2">
              {singleProducts.map((sp) => {
                const checked = comboProductIds.includes(sp.id)
                return (
                  <label
                    key={sp.id}
                    className={`inline-flex items-center gap-2 rounded-full border-2 border-ink px-3.5 py-1.5 font-body text-xs font-bold cursor-pointer ${
                      checked ? 'bg-accent-alt text-ink' : 'bg-background text-ink'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        setComboProductIds((prev) =>
                          e.target.checked ? [...prev, sp.id] : prev.filter((x) => x !== sp.id)
                        )
                      }}
                      className="accent-primary"
                    />
                    {sp.name}
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Variants */}
      <div className={`${BRUTAL_CARD} p-6 space-y-5`}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-ink">Variants</h2>
          <button
            type="button"
            onClick={() => setVariants((prev) => [...prev, { ...EMPTY_VARIANT }])}
            className={PILL_SURFACE}
          >
            <PlusIcon className="w-4 h-4" />
            Add Variant
          </button>
        </div>

        <div className="space-y-4">
          {variants.map((v, idx) => (
            <div key={idx} className="border-2 border-ink rounded-2xl bg-background p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-display text-sm font-bold text-ink">
                  Variant {idx + 1}{' '}
                  {(v.color || v.size) && (
                    <span className="font-body text-xs text-muted">
                      ({[v.color, v.size].filter(Boolean).join(' / ')})
                    </span>
                  )}
                </p>
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-muted hover:text-danger"
                    aria-label="Remove variant"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-body text-xs font-bold text-muted mb-1">Color</label>
                  <input
                    value={v.color}
                    onChange={(e) => updateVariant(idx, 'color', e.target.value)}
                    className={BRUTAL_INPUT}
                    placeholder="Maroon"
                  />
                </div>
                <div>
                  <label className="block font-body text-xs font-bold text-muted mb-1">Size</label>
                  <select
                    value={v.size}
                    onChange={(e) => updateVariant(idx, 'size', e.target.value)}
                    className={BRUTAL_INPUT}
                  >
                    <option value="">— None —</option>
                    {['XS', 'S', 'M', 'L', 'XL', '2XL', 'Free Size', 'One Size'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-body text-xs font-bold text-muted mb-1">SKU</label>
                  <input
                    value={v.sku}
                    onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                    className={`${BRUTAL_INPUT} font-mono`}
                    placeholder="SB-TEE-01"
                  />
                </div>
                <div>
                  <label className="block font-body text-xs font-bold text-muted mb-1">Mockup Type</label>
                  <select
                    value={v.visualType}
                    onChange={(e) => updateVariant(idx, 'visualType', e.target.value)}
                    className={BRUTAL_INPUT}
                  >
                    <option value="tee">T-Shirt</option>
                    <option value="hoodie">Hoodie</option>
                    <option value="stand">Phone Stand</option>
                    <option value="tote">Tote Bag</option>
                    <option value="stickers">Stickers</option>
                    <option value="combo">Combo</option>
                  </select>
                </div>
                <div>
                  <label className="block font-body text-xs font-bold text-muted mb-1">Price (₹) *</label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={v.price}
                    onChange={(e) => updateVariant(idx, 'price', Number(e.target.value))}
                    className={BRUTAL_INPUT}
                  />
                </div>
                <div>
                  <label className="block font-body text-xs font-bold text-muted mb-1">
                    Compare At (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={v.compare_at_price}
                    onChange={(e) => updateVariant(idx, 'compare_at_price', Number(e.target.value))}
                    className={BRUTAL_INPUT}
                  />
                </div>
                <div>
                  <label className="block font-body text-xs font-bold text-muted mb-1">Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={v.stock}
                    onChange={(e) => updateVariant(idx, 'stock', Number(e.target.value))}
                    className={BRUTAL_INPUT}
                  />
                </div>
                <div className="flex flex-col justify-end gap-1.5">
                  <label className="flex items-center gap-2 font-body text-xs font-bold text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={v.allow_backorder}
                      onChange={(e) => updateVariant(idx, 'allow_backorder', e.target.checked)}
                      className="accent-primary"
                    />
                    Allow Backorder
                  </label>
                  <label className="flex items-center gap-2 font-body text-xs font-bold text-ink cursor-pointer">
                    <input
                      type="checkbox"
                      checked={v.is_active}
                      onChange={(e) => updateVariant(idx, 'is_active', e.target.checked)}
                      className="accent-primary"
                    />
                    Active
                  </label>
                </div>
              </div>

              {/* Variant Image Upload / URL */}
              <div className="border-t border-ink/20 pt-3">
                <p className="font-body text-xs font-bold text-muted mb-2">
                  Custom Images (optional — defaults to SheBuilds vector mockup)
                </p>
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <input
                    value={imageUrlInput[idx] || ''}
                    onChange={(e) =>
                      setImageUrlInput((prev) => ({ ...prev, [idx]: e.target.value }))
                    }
                    placeholder="Paste image URL or upload file..."
                    className={`${BRUTAL_INPUT} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => addImageByUrl(idx)}
                    className={PILL_SURFACE}
                  >
                    Add URL
                  </button>
                  <label className={`${PILL_INK} cursor-pointer`}>
                    {uploadingIdx === idx ? 'Uploading...' : 'Upload File'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingIdx === idx}
                      className="hidden"
                      onChange={(e) => {
                        handleFileUpload(idx, e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                  </label>
                </div>

                {(v.images || []).filter((img) => img.url).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {v.images
                      .filter((img) => img.url)
                      .map((img, imgIdx) => (
                        <div
                          key={img.id || imgIdx}
                          className="relative w-16 h-16 rounded-xl border-2 border-ink overflow-hidden bg-surface"
                        >
                          <img src={img.url} alt={img.alt || ''} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() =>
                              updateVariant(
                                idx,
                                'images',
                                v.images.filter((x) => x.url !== img.url)
                              )
                            }
                            className="absolute top-0.5 right-0.5 rounded-full bg-danger text-surface px-1.5 text-xs font-bold"
                            aria-label="Remove image"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {msg && <p className="font-body text-sm font-bold text-danger">{msg}</p>}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving || uploadingIdx !== null} className={PILL_PRIMARY}>
          {saving ? 'Saving...' : isNew ? 'Create Product' : 'Save Changes'}
        </button>
        <Link to="/admin/products" className={PILL_SURFACE}>
          Cancel
        </Link>
      </div>
    </form>
  )
}


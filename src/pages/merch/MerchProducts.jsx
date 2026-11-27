import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { SearchIcon } from '../../merch/MerchIcons.jsx'
import { ProductCard } from '../../merch/ProductCard.jsx'
import { useMerch } from '../../merch/useMerch.js'
import { BRUTAL_INPUT, PILL_CHIP, PILL_INK } from '../../merch/merchStyles.js'
import usePageTitle from '../../components/usePageTitle.js'

export default function MerchProducts() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { products, categories } = useMerch()

  const activeCategorySlug = searchParams.get('category') || ''
  const isComboFilter = searchParams.get('combo') === 'true' || activeCategorySlug === 'combos'
  const urlQuery = searchParams.get('q') || ''

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [activeCategorySlug, isComboFilter])

  const activeCategories = useMemo(
    () =>
      categories
        .filter((c) => c.is_active && c.slug !== 'combos')
        .sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  )

  const selectedCategory = isComboFilter
    ? null
    : activeCategories.find((c) => c.slug === activeCategorySlug)

  usePageTitle(
    isComboFilter
      ? 'Combo Deals — Merch'
      : selectedCategory
        ? `${selectedCategory.name} — Merch`
        : 'All Products — Merch'
  )

  const filteredProducts = useMemo(() => {
    const q = urlQuery.trim().toLowerCase()
    return products.filter((p) => {
      if (!p.is_active) return false
      if (isComboFilter && !p.is_combo) return false
      if (selectedCategory && p.category_id !== selectedCategory.id) return false
      if (q) {
        const haystack = [p.name, p.description, ...(p.tags || [])].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [products, isComboFilter, selectedCategory, urlQuery])

  function handleSearchSubmit(e) {
    e.preventDefault()
  }

  function clearFilters() {
    setSearchParams({})
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 pb-20 md:px-12 max-sm:px-4">
      <div className="mb-4">
        <Link
          to="/merch"
          className="inline-flex items-center gap-1.5 font-body text-sm font-bold text-ink hover:underline underline-offset-4"
        >
          <span aria-hidden="true">←</span> Back to Merch Home
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-primary">
            {isComboFilter
              ? 'Combo Deals'
              : selectedCategory
                ? selectedCategory.name
                : 'All Products'}
          </h1>
          <p className="font-body text-sm text-muted mt-1">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <SearchIcon className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={urlQuery}
              onChange={(e) => {
                const val = e.target.value
                const next = new URLSearchParams(searchParams)
                if (val) next.set('q', val)
                else next.delete('q')
                setSearchParams(next, { replace: true })
              }}
              placeholder="Search merch..."
              className={`${BRUTAL_INPUT} pl-10`}
            />
          </div>
          <button type="submit" className={PILL_INK}>
            Search
          </button>
        </form>
      </div>

      {/* Category & Combo Filter Pills */}
      <div className="flex flex-wrap gap-2.5 mb-8">
        <Link
          to="/merch/products"
          className={PILL_CHIP(!activeCategorySlug && !isComboFilter)}
        >
          All
        </Link>
        <Link
          to="/merch/products?combo=true"
          className={PILL_CHIP(isComboFilter, 'coral')}
        >
          Combos
        </Link>
        {activeCategories.map((cat) => (
          <Link
            key={cat.id}
            to={`/merch/products?category=${cat.slug}`}
            className={PILL_CHIP(activeCategorySlug === cat.slug)}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-surface border-2 border-ink rounded-2xl shadow-brutal p-12 text-center">
          <p className="font-display text-xl font-bold text-ink mb-2">No products found</p>
          <p className="font-body text-sm text-muted mb-6">
            Try clearing your search or switching categories.
          </p>
          <button type="button" onClick={clearFilters} className={PILL_INK}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} isCombo={product.is_combo} />
          ))}
        </div>
      )}
    </div>
  )
}

import { Link } from 'react-router'
import { useEffect } from 'react'
import { CheckCircleIcon, PackageIcon, TagIcon, TruckIcon } from '../../merch/MerchIcons.jsx'
import { ProductCard } from '../../merch/ProductCard.jsx'
import { useMerch } from '../../merch/useMerch.js'
import { PILL_INK, PILL_PRIMARY, PILL_SURFACE } from '../../merch/merchStyles.js'
import usePageTitle from '../../components/usePageTitle.js'

export default function MerchHome() {
  usePageTitle('Merch Store')
  const { products, categories } = useMerch()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  const activeProducts = products.filter((p) => p.is_active)
  const featuredRaw = activeProducts.filter((p) => p.is_featured && !p.is_combo)
  const featuredProducts = (featuredRaw.length ? featuredRaw : activeProducts.filter((p) => !p.is_combo)).slice(0, 8)
  const combos = activeProducts.filter((p) => p.is_combo).slice(0, 4)
  const activeCategories = categories
    .filter((c) => c.is_active && c.slug !== 'combos')
    .sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="pb-16">
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-8 pb-6 md:px-12 max-sm:px-4">
        <div className="bg-surface border-2 border-ink rounded-2xl shadow-brutal-lg p-6 md:p-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-accent-alt px-4 py-1 font-body text-xs font-bold uppercase tracking-wider text-ink mb-5">
            Women in Tech Collection
          </div>

          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-primary leading-none mb-4">
            Built for Women Who Build
          </h1>

          <p className="font-body text-base md:text-lg text-ink max-w-2xl mx-auto mb-8">
            Cyber-builder hoodies, heavyweight graphic tees, and workspace essentials made for women
            in tech. Order online for doorstep delivery anywhere in India or pick up for free at our
            next meetup.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/merch/products" className={PILL_PRIMARY}>
              Shop All Products <span aria-hidden="true">→</span>
            </Link>
            <Link to="/merch/products?combo=true" className={PILL_SURFACE}>
              <TagIcon className="w-4 h-4" />
              View Combo Deals
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="mx-auto max-w-7xl px-6 py-4 md:px-12 max-sm:px-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 bg-surface border-2 border-ink rounded-2xl shadow-brutal-sm p-4">
            <div className="w-10 h-10 rounded-xl border-2 border-ink bg-accent-alt flex items-center justify-center shrink-0">
              <TruckIcon className="w-5 h-5 text-ink" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-ink">Home Delivery</p>
              <p className="font-body text-xs text-muted">Delivered straight to your doorstep</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-surface border-2 border-ink rounded-2xl shadow-brutal-sm p-4">
            <div className="w-10 h-10 rounded-xl border-2 border-ink bg-yellow flex items-center justify-center shrink-0">
              <PackageIcon className="w-5 h-5 text-ink" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-ink">Free Event Pickup</p>
              <p className="font-body text-xs text-muted">Collect at the next SheBuilds meetup</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-surface border-2 border-ink rounded-2xl shadow-brutal-sm p-4">
            <div className="w-10 h-10 rounded-xl border-2 border-ink bg-lavender flex items-center justify-center shrink-0">
              <CheckCircleIcon className="w-5 h-5 text-ink" />
            </div>
            <div>
              <p className="font-display text-sm font-bold text-ink">Pan-India Shipping</p>
              <p className="font-body text-xs text-muted">5–7 business days · GST included</p>
            </div>
          </div>
        </div>
      </section>

      {/* Category Pills */}
      {activeCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pt-6 md:px-12 max-sm:px-4">
          <div className="flex flex-wrap gap-2.5">
            <Link
              to="/merch/products"
              className="rounded-full border-2 border-ink bg-ink px-5 py-2 font-body text-sm font-bold text-surface shadow-brutal-sm"
            >
              All
            </Link>
            {activeCategories.map((cat) => (
              <Link
                key={cat.id}
                to={`/merch/products?category=${cat.slug}`}
                className="rounded-full border-2 border-ink bg-surface px-5 py-2 font-body text-sm font-bold text-ink shadow-brutal-sm hover:bg-accent-alt/20"
              >
                {cat.name}
              </Link>
            ))}
            <Link
              to="/merch/products?combo=true"
              className="rounded-full border-2 border-ink bg-accent px-5 py-2 font-body text-sm font-bold text-ink shadow-brutal-sm"
            >
              Combos
            </Link>
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-10 md:px-12 max-sm:px-4">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-primary">
                {featuredRaw.length ? 'Featured Products' : 'Latest Products'}
              </h2>
              <p className="font-body text-sm text-muted mt-1">
                Cyber-builder graphic tees, heavyweight hoodies &amp; desk gear for women in tech
              </p>
            </div>
            <Link to="/merch/products" className={PILL_SURFACE}>
              View all <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Combo Deals Banner */}
      {combos.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-6 md:px-12 max-sm:px-4">
          <div className="bg-primary border-2 border-ink rounded-2xl shadow-brutal-lg p-6 md:p-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <span className="inline-block rounded-full border-2 border-ink bg-yellow px-3 py-1 font-body text-xs font-bold uppercase tracking-wide text-ink mb-3">
                  Best Value
                </span>
                <h2 className="font-display text-2xl md:text-3xl font-bold text-background">
                  Combo Deals
                </h2>
                <p className="font-body text-sm text-background/90 mt-1">
                  Customize each item inside your bundle and save more together.
                </p>
              </div>
              <Link to="/merch/products?combo=true" className={PILL_PRIMARY}>
                View all combos <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {combos.map((product) => (
                <ProductCard key={product.id} product={product} isCombo />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Community CTA */}
      <section className="mx-auto max-w-7xl px-6 pt-8 md:px-12 max-sm:px-4">
        <div className="bg-accent border-2 border-ink rounded-2xl shadow-brutal p-8 md:p-12 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-ink mb-3">
            Wear the women-in-tech energy
          </h2>
          <p className="font-body text-ink max-w-xl mx-auto mb-6">
            Small-batch drops crafted around bold design, all-day comfort, and women shipping big
            ideas together.
          </p>
          <Link to="/merch/products" className={PILL_INK}>
            Explore the Store <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  )
}

import { Link } from 'react-router'
import { MerchVisual } from '../../merch/MerchVisual.jsx'
import { TagIcon } from '../../merch/MerchIcons.jsx'
import { PILL_PRIMARY, PILL_SURFACE } from '../../merch/merchStyles.js'
import { useMerch } from '../../merch/useMerch.js'

const COLLECTIONS = [
  {
    title: 'T-Shirts',
    subtitle: 'Cyber-Builder Prints',
    categorySlug: 'tshirts',
    to: '/merch/products?category=tshirts',
    visualType: 'tee',
    color: 'Black',
    badgeBg: 'bg-accent',
  },
  {
    title: 'Hoodies',
    subtitle: 'Heavyweight Fleece',
    categorySlug: 'hoodies',
    to: '/merch/products?category=hoodies',
    visualType: 'hoodie',
    color: 'Black',
    badgeBg: 'bg-accent-alt',
  },
  {
    title: 'Phone Stands',
    subtitle: 'Keychain & Desk Ready',
    categorySlug: 'phone-stands',
    to: '/merch/products?category=phone-stands',
    visualType: 'stand',
    color: 'Purple',
    badgeBg: 'bg-yellow',
  },
  {
    title: 'Combo Packs',
    subtitle: 'Curated Builder Sets',
    categorySlug: 'combos',
    to: '/merch/products?combo=true',
    visualType: 'combo',
    color: 'Coral',
    badgeBg: 'bg-lavender',
  },
]

function getCollectionImage(products, categorySlug) {
  const match = products.find((p) => p.category?.slug === categorySlug && p.is_active)
  const firstVariant = match?.variants?.find((v) => v.is_active !== false) || match?.variants?.[0]
  return firstVariant?.images?.[0] || null
}

export default function MerchSection() {
  const { products } = useMerch()

  return (
    <section
      aria-labelledby="merch-heading"
      className="flex items-center px-6 py-8 md:px-12 md:py-10 max-sm:px-4"
    >
      <div
        data-reveal
        className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-surface border-2 border-ink rounded-2xl shadow-brutal-lg p-6 md:p-10 lg:p-12"
      >
        {/* Left Editorial Pitch */}
        <div className="lg:col-span-6 flex flex-col items-start gap-4">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-yellow px-3.5 py-1 font-body text-xs font-bold uppercase tracking-wider text-ink">
            <TagIcon className="w-3.5 h-3.5" />
            Women in Tech Drop
          </span>

          <h2
            id="merch-heading"
            className="font-display text-3xl md:text-5xl font-bold tracking-tight text-primary leading-none"
          >
            Wear Your Builder Energy.
          </h2>

          <p className="font-body text-base md:text-lg text-ink leading-relaxed max-w-xl">
            Crafted for women who write the code, ship bold ideas, and set the tone in every room.
            Explore cyber-builder{' '}
            <strong>T-Shirts, Heavyweight Hoodies, Desk Phone Stands, and Value Combos</strong>{' '}
            made to live in from sprints to demo days.
          </p>

          <p className="font-body text-sm text-muted leading-relaxed max-w-xl">
            Limited-batch graphics with all-day comfort — delivered straight to your doorstep across
            India or ready for free pickup at upcoming meetups.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {COLLECTIONS.map((col) => (
              <Link
                key={col.title}
                to={col.to}
                className="rounded-full border-2 border-ink bg-background px-3.5 py-1.5 font-body text-xs font-bold text-ink shadow-brutal-sm hover:bg-accent-alt/25 transition"
              >
                {col.title}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link to="/merch" className={PILL_PRIMARY}>
              Visit Merch Store <span aria-hidden="true">→</span>
            </Link>
            <Link to="/merch/products" className={PILL_SURFACE}>
              Explore Collection
            </Link>
          </div>
        </div>

        {/* Right Compact 2x2 Collection Showcase (no prices) */}
        <div className="lg:col-span-6 grid grid-cols-2 gap-4">
          {COLLECTIONS.map((col) => {
            const realImage = getCollectionImage(products, col.categorySlug)
            return (
              <Link
                key={col.title}
                to={col.to}
                className="group flex flex-col rounded-2xl border-2 border-ink bg-background shadow-brutal-sm overflow-hidden transition hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal"
              >
                <div className="h-32 sm:h-36 md:h-40 border-b-2 border-ink overflow-hidden bg-surface">
                  <MerchVisual
                    image={realImage}
                    productName={col.title}
                    visualType={col.visualType}
                    color={col.color}
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 bg-surface px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-ink truncate">{col.title}</p>
                    <p className="font-body text-xs text-muted truncate">{col.subtitle}</p>
                  </div>
                  <span
                    className={`shrink-0 w-7 h-7 rounded-full border-2 border-ink ${col.badgeBg} flex items-center justify-center font-body text-xs font-bold text-ink`}
                    aria-hidden="true"
                  >
                    →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

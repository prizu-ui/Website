import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { useMerch } from '../../merch/useMerch.js'
import { BRUTAL_CARD, BRUTAL_INPUT, PILL_INK } from '../../merch/merchStyles.js'
import usePageTitle from '../../components/usePageTitle.js'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', exact: true },
  { to: '/admin/orders', label: 'Orders' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/categories', label: 'Categories' },
  { to: '/admin/coupons', label: 'Coupons' },
  { to: '/admin/delivery-methods', label: 'Delivery Methods' },
  { to: '/admin/reports', label: 'Reports' },
]

export default function AdminLayout() {
  usePageTitle('Store Admin')
  const { pathname } = useLocation()
  const { adminLoggedIn, adminUser, adminLoading, loginAdmin, logoutAdmin } = useMerch()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className={`${BRUTAL_CARD} p-8 text-center`}>
          <p className="font-display text-lg font-bold text-primary">Checking admin session...</p>
        </div>
      </div>
    )
  }

  if (!adminLoggedIn) {
    async function handleSubmit(e) {
      e.preventDefault()
      setError('')
      setSubmitting(true)
      const res = await loginAdmin(email.trim(), password)
      setSubmitting(false)
      if (!res?.success) {
        setError(res?.error || 'Invalid admin credentials')
      }
    }

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className={`${BRUTAL_CARD} w-full max-w-md p-8`}>
          <span className="inline-block rounded-full border-2 border-ink bg-accent-alt px-3 py-0.5 font-body text-xs font-bold uppercase text-ink mb-4">
            Private Store Admin
          </span>
          <h1 className="font-display text-2xl font-bold text-primary mb-2">
            SheBuilds Merch Admin
          </h1>
          <p className="font-body text-sm text-muted mb-6">
            Sign in with your SheBuilds admin account to manage products, variants, coupons,
            delivery methods, orders &amp; GST reports.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-body text-sm font-bold text-ink mb-1.5">
                Admin Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={BRUTAL_INPUT}
                placeholder="team@shebuildschennai.in"
              />
            </div>

            <div>
              <label className="block font-body text-sm font-bold text-ink mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={BRUTAL_INPUT}
                placeholder="Enter password"
              />
            </div>

            {error && <p className="font-body text-xs font-bold text-danger">{error}</p>}

            <button type="submit" disabled={submitting} className={`${PILL_INK} w-full`}>
              {submitting ? 'Signing In...' : 'Sign In to Admin'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t-2 border-ink text-center">
            <Link to="/merch" className="font-body text-sm font-bold text-ink hover:underline">
              ← Open Storefront
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      {/* Standalone Admin Sidebar */}
      <aside className="w-full lg:w-64 bg-primary border-b-2 lg:border-b-0 lg:border-r-2 border-ink p-6 text-background flex flex-col justify-between shrink-0">
        <div>
          <div className="border-b-2 border-background/30 pb-4 mb-5">
            <p className="font-display text-lg font-bold text-background">SheBuilds Merch</p>
            <p className="font-body text-xs text-background/80">Private Admin Portal</p>
          </div>

          <nav aria-label="Store admin" className="flex flex-wrap lg:flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const active = item.exact
                ? pathname === item.to
                : pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full border-2 border-ink px-4 py-2 font-body text-sm font-bold transition ${
                    active
                      ? 'bg-accent text-ink shadow-brutal-sm'
                      : 'bg-surface text-ink hover:bg-background'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="border-t-2 border-background/30 mt-6 pt-4 space-y-2">
          {adminUser?.email && (
            <p className="font-body text-xs text-background/80 truncate px-1">{adminUser.email}</p>
          )}
          <Link
            to="/merch"
            className="block text-center rounded-full border-2 border-ink bg-accent-alt px-4 py-2 font-body text-sm font-bold text-ink shadow-brutal-sm"
          >
            View Storefront ↗
          </Link>
          <button
            type="button"
            onClick={logoutAdmin}
            className="w-full rounded-full border-2 border-ink bg-background px-4 py-2 font-body text-sm font-bold text-ink hover:bg-surface"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-6 md:p-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}


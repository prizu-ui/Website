import { Link, Outlet, useLocation } from 'react-router'
import { ShoppingCartIcon } from '../../merch/MerchIcons.jsx'
import { useMerch } from '../../merch/useMerch.js'

export default function MerchLayout() {
  const { pathname } = useLocation()
  const { cartItemCount } = useMerch()

  const navItems = [
    { to: '/merch', label: 'Store', exact: true },
    { to: '/merch/products', label: 'All Products' },
    { to: '/merch/track', label: 'Track Order' },
  ]

  const isActive = (item) => {
    if (item.exact) return pathname === '/merch'
    return pathname.startsWith(item.to)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-y-2 border-ink bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3 md:px-12 max-sm:px-4">
          <div className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full border-2 border-ink px-4 py-1.5 font-body text-sm font-bold shadow-brutal-sm transition motion-reduce:transition-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                  isActive(item)
                    ? 'bg-accent-alt text-ink'
                    : 'bg-background text-ink hover:bg-accent-alt/20'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <Link
            to="/merch/cart"
            className="inline-flex items-center gap-2 rounded-full border-2 border-ink bg-accent px-4 py-1.5 font-body text-sm font-bold text-ink shadow-brutal-sm transition motion-reduce:transition-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            <ShoppingCartIcon className="w-4 h-4" />
            <span>Cart</span>
            <span className="inline-flex min-w-6 items-center justify-center rounded-full border border-ink bg-surface px-1.5 py-0.5 text-xs font-bold text-ink">
              {cartItemCount}
            </span>
          </Link>
        </div>
      </div>

      <Outlet />
    </div>
  )
}

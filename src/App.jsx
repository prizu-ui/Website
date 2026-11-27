import { Routes, Route, Navigate } from 'react-router'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import AllBlogs from './pages/AllBlogs.jsx'
import AllEvents from './pages/AllEvents.jsx'
import BlogPost from './pages/BlogPost.jsx'
import NotFound from './pages/NotFound.jsx'
import MerchLayout from './pages/merch/MerchLayout.jsx'
import MerchHome from './pages/merch/MerchHome.jsx'
import MerchProducts from './pages/merch/MerchProducts.jsx'
import MerchProductDetail from './pages/merch/MerchProductDetail.jsx'
import MerchCart from './pages/merch/MerchCart.jsx'
import MerchCheckout from './pages/merch/MerchCheckout.jsx'
import MerchOrderConfirmation from './pages/merch/MerchOrderConfirmation.jsx'
import MerchOrderTrack from './pages/merch/MerchOrderTrack.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminOrders from './pages/admin/AdminOrders.jsx'
import AdminOrderDetail from './pages/admin/AdminOrderDetail.jsx'
import AdminProducts from './pages/admin/AdminProducts.jsx'
import AdminProductForm from './pages/admin/AdminProductForm.jsx'
import AdminCategories from './pages/admin/AdminCategories.jsx'
import AdminCoupons from './pages/admin/AdminCoupons.jsx'
import AdminDeliveryMethods from './pages/admin/AdminDeliveryMethods.jsx'
import AdminReports from './pages/admin/AdminReports.jsx'
import { MerchProvider } from './merch/store.jsx'
import { sections } from './siteSections.js'

// Single scrolling page at "/". The old routed URLs (/about, /join, ...) redirect
// to their anchor section so existing links and bookmarks still land correctly.
// /events and /merch are dedicated public pages; /admin is a separate private portal.
function App() {
  return (
    <MerchProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          {sections
            .filter((s) => s.id !== 'home' && s.id !== 'events' && !s.to)
            .map((s) => (
              <Route
                key={s.id}
                path={s.id}
                element={<Navigate to={{ pathname: '/', hash: `#${s.id}` }} replace />}
              />
            ))}
          <Route path="events" element={<AllEvents />} />
          <Route path="blogs/all" element={<AllBlogs />} />
          <Route path="blogs/:slug" element={<BlogPost />} />

          <Route path="merch" element={<MerchLayout />}>
            <Route index element={<MerchHome />} />
            <Route path="products" element={<MerchProducts />} />
            <Route path="products/:slug" element={<MerchProductDetail />} />
            <Route path="cart" element={<MerchCart />} />
            <Route path="checkout" element={<MerchCheckout />} />
            <Route path="track" element={<MerchOrderTrack />} />
            <Route path="order/:id" element={<MerchOrderTrack />} />
            <Route path="order/:id/confirmation" element={<MerchOrderConfirmation />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Separate private admin portal (no public header, footer, or partners) */}
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/new" element={<AdminProductForm />} />
          <Route path="products/:id" element={<AdminProductForm />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="delivery-methods" element={<AdminDeliveryMethods />} />
          <Route path="reports" element={<AdminReports />} />
        </Route>
      </Routes>
    </MerchProvider>
  )
}

export default App

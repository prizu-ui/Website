import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { calculateGstFromInclusivePrice } from '../../merch/gst.js'
import { MerchVisual } from '../../merch/MerchVisual.jsx'
import { useMerch } from '../../merch/useMerch.js'
import {
  EMAIL_REGEX,
  formatCurrency,
  GSTIN_REGEX,
  lookupPincode,
  PHONE_REGEX,
  PINCODE_REGEX,
} from '../../merch/utils.js'
import { BRUTAL_CARD, BRUTAL_INPUT, PILL_INK, PILL_PRIMARY, PILL_SURFACE } from '../../merch/merchStyles.js'
import usePageTitle from '../../components/usePageTitle.js'

function Field({ label, required, error, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block font-body text-sm font-bold text-ink mb-1.5">
        {label}
        {required && <span className="text-danger ml-1">*</span>}
      </label>
      {children}
      {error && <p className="font-body text-xs font-bold text-danger mt-1">{error}</p>}
    </div>
  )
}

export default function MerchCheckout() {
  usePageTitle('Checkout — Merch')
  const navigate = useNavigate()
  const {
    cart,
    cartSubtotal,
    clearCart,
    validateCoupon,
    getDeliveryMethodsForPincode,
    fetchDeliveryMethods,
    createOrder,
  } = useMerch()

  const isNavigatingRef = useRef(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    gstin: '',
    shippingLine1: '',
    shippingLine2: '',
    shippingPincode: '',
    shippingDistrict: '',
    shippingState: '',
    billingSameAsShipping: true,
    billingName: '',
    billingLine1: '',
    billingLine2: '',
    billingPincode: '',
    billingDistrict: '',
    billingState: '',
    deliveryMethodId: '',
    couponCode: '',
    notes: '',
  })
  const [errors, setErrors] = useState({})
  const [shippingPincodeLoading, setShippingPincodeLoading] = useState(false)
  const [billingPincodeLoading, setBillingPincodeLoading] = useState(false)
  const [pincodeDeliveryInfo, setPincodeDeliveryInfo] = useState(null)

  const [couponMessage, setCouponMessage] = useState(null)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [isFreeShipping, setIsFreeShipping] = useState(false)
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [applyingCoupon, setApplyingCoupon] = useState(false)

  const [paymentMethod, setPaymentMethod] = useState('event')
  const [submitError, setSubmitError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!cart.length && !isNavigatingRef.current) {
      navigate('/merch/cart', { replace: true })
    }
  }, [cart.length, navigate])

  function handlePincodeChange(kind, rawValue) {
    const clean = rawValue.replace(/\D/g, '').slice(0, 6)
    const pinField = kind === 'shipping' ? 'shippingPincode' : 'billingPincode'
    const distField = kind === 'shipping' ? 'shippingDistrict' : 'billingDistrict'
    const stateField = kind === 'shipping' ? 'shippingState' : 'billingState'
    const setLoading = kind === 'shipping' ? setShippingPincodeLoading : setBillingPincodeLoading

    setField(pinField, clean)
    if (!PINCODE_REGEX.test(clean)) {
      if (kind === 'shipping') setPincodeDeliveryInfo(null)
      return
    }

    setLoading(true)
    lookupPincode(clean).then((res) => {
      setLoading(false)
      if (!res) return
      setForm((prev) => ({
        ...prev,
        [distField]: res.district,
        [stateField]: res.state,
      }))
      setErrors((prev) => ({ ...prev, [distField]: undefined, [stateField]: undefined }))
    })

    if (kind === 'shipping') {
      fetchDeliveryMethods(clean).then((info) => {
        if (info) setPincodeDeliveryInfo({ pincode: clean, ...info })
      })
    }
  }

  const fallbackDelivery = getDeliveryMethodsForPincode(form.shippingPincode)
  const activeDelivery =
    pincodeDeliveryInfo && pincodeDeliveryInfo.pincode === form.shippingPincode
      ? pincodeDeliveryInfo
      : fallbackDelivery
  const { methods: deliveryMethods, sameDayEligible } = activeDelivery

  const selectedDelivery = deliveryMethods.find((d) => d.id === form.deliveryMethodId)
  const shippingAmount = isFreeShipping ? 0 : selectedDelivery?.price ?? 0
  const orderTotal = Math.max(0, cartSubtotal - discountAmount + shippingAmount)

  const gstTotals = cart.reduce(
    (acc, item) => {
      const rate = item.gstRate ?? 18
      const inclusivePrice =
        item.priceIncludesGst === false ? item.price * (1 + rate / 100) : item.price
      const gst = calculateGstFromInclusivePrice(inclusivePrice, rate)
      acc.cgst += gst.cgstAmount * item.quantity
      acc.sgst += gst.sgstAmount * item.quantity
      acc.base += gst.basePrice * item.quantity
      return acc
    },
    { cgst: 0, sgst: 0, base: 0 }
  )

  const discountRatio = cartSubtotal > 0 ? Math.min(1, discountAmount / cartSubtotal) : 0
  const cgstAmount = Math.round(gstTotals.cgst * (1 - discountRatio) * 100) / 100
  const sgstAmount = Math.round(gstTotals.sgst * (1 - discountRatio) * 100) / 100
  const baseSubtotal = Math.round(gstTotals.base * 100) / 100

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validateStep1() {
    const next = {}
    if (form.customerName.trim().length < 2) next.customerName = 'Full name required'
    if (!PHONE_REGEX.test(form.customerPhone.trim())) {
      next.customerPhone = 'Enter valid 10-digit mobile number'
    }
    if (!EMAIL_REGEX.test(form.customerEmail.trim())) next.customerEmail = 'Valid email required'
    if (form.gstin.trim() && !GSTIN_REGEX.test(form.gstin.trim())) next.gstin = 'Invalid GSTIN'
    if (form.shippingLine1.trim().length < 3) next.shippingLine1 = 'Address required'
    if (!PINCODE_REGEX.test(form.shippingPincode.trim())) {
      next.shippingPincode = 'Valid 6-digit PIN required'
    }
    if (!form.shippingDistrict.trim()) next.shippingDistrict = 'District required'
    if (!form.shippingState.trim()) next.shippingState = 'State required'

    if (!form.billingSameAsShipping) {
      if (!form.billingName.trim()) next.billingName = 'Billing name required'
      if (form.billingLine1.trim().length < 3) next.billingLine1 = 'Billing address required'
      if (!PINCODE_REGEX.test(form.billingPincode.trim())) {
        next.billingPincode = 'Valid 6-digit PIN required'
      }
      if (!form.billingDistrict.trim()) next.billingDistrict = 'District required'
      if (!form.billingState.trim()) next.billingState = 'State required'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  function goToStep2() {
    if (!validateStep1()) return
    setStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function applyCoupon() {
    const code = form.couponCode.trim()
    if (!code) return
    setApplyingCoupon(true)
    const res = await validateCoupon({
      code,
      cartTotal: cartSubtotal,
      customerEmail: form.customerEmail.trim() || undefined,
    })
    setApplyingCoupon(false)
    if (res.valid) {
      setDiscountAmount(res.discountAmount)
      setIsFreeShipping(res.discountType === 'FREE_SHIPPING')
      setAppliedCoupon(res.coupon.code)
      setCouponMessage({ type: 'success', text: res.message })
    } else {
      setDiscountAmount(0)
      setIsFreeShipping(false)
      setAppliedCoupon(null)
      setCouponMessage({ type: 'error', text: res.error || 'Invalid coupon' })
    }
  }

  async function handlePlaceOrder() {
    if (!form.deliveryMethodId) {
      setErrors((prev) => ({ ...prev, deliveryMethodId: 'Select a delivery method' }))
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)

    const shippingAddress = {
      name: form.customerName.trim(),
      phone: form.customerPhone.trim(),
      line1: form.shippingLine1.trim(),
      line2: form.shippingLine2.trim() || undefined,
      city: form.shippingDistrict.trim(),
      state: form.shippingState.trim(),
      pincode: form.shippingPincode.trim(),
      country: 'India',
    }

    const billingAddress = form.billingSameAsShipping
      ? shippingAddress
      : {
          name: form.billingName.trim(),
          phone: form.customerPhone.trim(),
          line1: form.billingLine1.trim(),
          line2: form.billingLine2.trim() || undefined,
          city: form.billingDistrict.trim(),
          state: form.billingState.trim(),
          pincode: form.billingPincode.trim(),
          country: 'India',
        }

    const res = await createOrder({
      cartItems: cart,
      checkoutData: {
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        customerPhone: form.customerPhone.trim(),
        gstin: form.gstin.trim() || undefined,
        shippingAddress,
        billingAddress,
        deliveryMethodId: form.deliveryMethodId,
        notes: form.notes.trim() || undefined,
      },
      couponCode: appliedCoupon || undefined,
    })

    if (!res.success) {
      setSubmitError(res.error || 'Failed to create order')
      setIsSubmitting(false)
      return
    }

    // Matching nammaflutter-store checkout flow: Pay at Event reserves order and opens confirmation
    isNavigatingRef.current = true
    clearCart()
    navigate(`/merch/order/${res.data.order.id}/confirmation?payment=pending`)
  }

  if (!cart.length) return null

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 pb-20 md:px-12 max-sm:px-4">
      <div className="mb-4">
        <Link
          to="/merch/cart"
          className="inline-flex items-center gap-1.5 font-body text-sm font-bold text-ink hover:underline"
        >
          <span aria-hidden="true">←</span> Back to Cart
        </Link>
      </div>

      <h1 className="font-display text-3xl md:text-4xl font-bold text-primary mb-6">Checkout</h1>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center gap-2 font-body text-sm font-bold text-ink">
          <span
            className={`w-8 h-8 rounded-full border-2 border-ink flex items-center justify-center text-xs font-bold ${
              step > 1 ? 'bg-green text-ink' : 'bg-accent-alt text-ink'
            }`}
          >
            {step > 1 ? '✓' : '1'}
          </span>
          Your Details
        </div>
        <div className="flex-1 h-0.5 bg-ink" />
        <div
          className={`flex items-center gap-2 font-body text-sm font-bold ${
            step === 2 ? 'text-ink' : 'text-muted'
          }`}
        >
          <span
            className={`w-8 h-8 rounded-full border-2 border-ink flex items-center justify-center text-xs font-bold ${
              step === 2 ? 'bg-accent-alt text-ink' : 'bg-surface text-muted'
            }`}
          >
            2
          </span>
          Delivery
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {step === 1 && (
            <>
              <section className={`${BRUTAL_CARD} p-6`}>
                <h2 className="font-display text-xl font-bold text-ink mb-4">
                  Contact Information
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Full Name" required error={errors.customerName}>
                    <input
                      value={form.customerName}
                      onChange={(e) => setField('customerName', e.target.value)}
                      className={BRUTAL_INPUT}
                      placeholder="Ananya Krishnan"
                    />
                  </Field>
                  <Field label="Phone" required error={errors.customerPhone}>
                    <input
                      value={form.customerPhone}
                      onChange={(e) =>
                        setField('customerPhone', e.target.value.replace(/\D/g, '').slice(0, 10))
                      }
                      className={BRUTAL_INPUT}
                      placeholder="9876543210"
                      maxLength={10}
                    />
                  </Field>
                  <Field label="Email" required error={errors.customerEmail} className="sm:col-span-2">
                    <input
                      type="email"
                      value={form.customerEmail}
                      onChange={(e) => setField('customerEmail', e.target.value)}
                      className={BRUTAL_INPUT}
                      placeholder="you@example.com"
                    />
                  </Field>
                  <Field
                    label="GSTIN (optional - for business GST invoice)"
                    error={errors.gstin}
                    className="sm:col-span-2"
                  >
                    <input
                      value={form.gstin}
                      onChange={(e) => setField('gstin', e.target.value.toUpperCase())}
                      className={`${BRUTAL_INPUT} font-mono uppercase`}
                      placeholder="33ABCDE1234F1Z5"
                      maxLength={15}
                    />
                  </Field>
                </div>
              </section>

              <section className={`${BRUTAL_CARD} p-6`}>
                <h2 className="font-display text-xl font-bold text-ink mb-4">Shipping Address</h2>
                <div className="space-y-4">
                  <Field label="Address Line 1" required error={errors.shippingLine1}>
                    <input
                      value={form.shippingLine1}
                      onChange={(e) => setField('shippingLine1', e.target.value)}
                      className={BRUTAL_INPUT}
                      placeholder="Flat / House No, Street Name"
                    />
                  </Field>
                  <Field label="Address Line 2">
                    <input
                      value={form.shippingLine2}
                      onChange={(e) => setField('shippingLine2', e.target.value)}
                      className={BRUTAL_INPUT}
                      placeholder="Landmark, Area (optional)"
                    />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="PIN Code" required error={errors.shippingPincode}>
                      <input
                        value={form.shippingPincode}
                        onChange={(e) => handlePincodeChange('shipping', e.target.value)}
                        className={`${BRUTAL_INPUT} font-mono`}
                        placeholder="600001"
                        maxLength={6}
                      />
                      {shippingPincodeLoading && (
                        <p className="font-body text-xs text-muted mt-1">Looking up PIN...</p>
                      )}
                    </Field>
                    <Field label="District" required error={errors.shippingDistrict}>
                      <input
                        value={form.shippingDistrict}
                        onChange={(e) => setField('shippingDistrict', e.target.value)}
                        className={BRUTAL_INPUT}
                        placeholder="Chennai"
                      />
                    </Field>
                    <Field label="State" required error={errors.shippingState}>
                      <input
                        value={form.shippingState}
                        onChange={(e) => setField('shippingState', e.target.value)}
                        className={BRUTAL_INPUT}
                        placeholder="Tamil Nadu"
                      />
                    </Field>
                  </div>
                </div>

                <label className="flex items-center gap-3 mt-5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.billingSameAsShipping}
                    onChange={(e) => setField('billingSameAsShipping', e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="font-body text-sm font-bold text-ink">
                    Billing details same as shipping address
                  </span>
                </label>

                {!form.billingSameAsShipping && (
                  <div className="mt-5 pt-5 border-t-2 border-ink space-y-4">
                    <h3 className="font-display text-base font-bold text-ink">Billing Address</h3>
                    <Field label="Billing Name" required error={errors.billingName}>
                      <input
                        value={form.billingName}
                        onChange={(e) => setField('billingName', e.target.value)}
                        className={BRUTAL_INPUT}
                        placeholder="Name on invoice"
                      />
                    </Field>
                    <Field label="Address Line 1" required error={errors.billingLine1}>
                      <input
                        value={form.billingLine1}
                        onChange={(e) => setField('billingLine1', e.target.value)}
                        className={BRUTAL_INPUT}
                        placeholder="Flat / House No, Street Name"
                      />
                    </Field>
                    <Field label="Address Line 2">
                      <input
                        value={form.billingLine2}
                        onChange={(e) => setField('billingLine2', e.target.value)}
                        className={BRUTAL_INPUT}
                        placeholder="Landmark, Area (optional)"
                      />
                    </Field>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Field label="PIN Code" required error={errors.billingPincode}>
                        <input
                          value={form.billingPincode}
                          onChange={(e) => handlePincodeChange('billing', e.target.value)}
                          className={`${BRUTAL_INPUT} font-mono`}
                          placeholder="600001"
                          maxLength={6}
                        />
                        {billingPincodeLoading && (
                          <p className="font-body text-xs text-muted mt-1">Looking up PIN...</p>
                        )}
                      </Field>
                      <Field label="District" required error={errors.billingDistrict}>
                        <input
                          value={form.billingDistrict}
                          onChange={(e) => setField('billingDistrict', e.target.value)}
                          className={BRUTAL_INPUT}
                          placeholder="Chennai"
                        />
                      </Field>
                      <Field label="State" required error={errors.billingState}>
                        <input
                          value={form.billingState}
                          onChange={(e) => setField('billingState', e.target.value)}
                          className={BRUTAL_INPUT}
                          placeholder="Tamil Nadu"
                        />
                      </Field>
                    </div>
                  </div>
                )}
              </section>

              <section className={`${BRUTAL_CARD} p-6 space-y-5`}>
                <div>
                  <h2 className="font-display text-xl font-bold text-ink mb-2">Coupon Code</h2>
                  <p className="font-body text-xs text-muted mb-3">
                    Have a promo code? Enter it below to apply your discount.
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={form.couponCode}
                      onChange={(e) => setField('couponCode', e.target.value.toUpperCase())}
                      className={`${BRUTAL_INPUT} font-mono uppercase`}
                      placeholder="Enter promo code"
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={applyingCoupon}
                      className={PILL_INK}
                    >
                      {applyingCoupon ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                  {couponMessage && (
                    <p
                      className={`font-body text-sm font-bold mt-2 ${
                        couponMessage.type === 'success' ? 'text-ink' : 'text-danger'
                      }`}
                    >
                      {couponMessage.type === 'success' ? '✓ ' : '✗ '}
                      {couponMessage.text}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block font-body text-sm font-bold text-ink mb-1.5">
                    Order Notes <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={(e) => setField('notes', e.target.value)}
                    className={`${BRUTAL_INPUT} resize-none`}
                    placeholder="Any special instructions for your order..."
                  />
                </div>

                <button type="button" onClick={goToStep2} className={`${PILL_PRIMARY} w-full`}>
                  Continue to Delivery <span aria-hidden="true">→</span>
                </button>
              </section>
            </>
          )}

          {step === 2 && (
            <>
              <section className={`${BRUTAL_CARD} p-6`}>
                <h2 className="font-display text-xl font-bold text-ink mb-1">Delivery Method</h2>
                {sameDayEligible ? (
                  <p className="font-body text-xs font-bold text-ink bg-green inline-block rounded-full border border-ink px-3 py-0.5 mb-4">
                    ✓ Same-day delivery is available for PIN {form.shippingPincode}!
                  </p>
                ) : (
                  <p className="font-body text-xs text-muted mb-4">
                    Available options for PIN {form.shippingPincode}
                  </p>
                )}

                <div className="space-y-3">
                  {deliveryMethods.map((method) => {
                    const selected = form.deliveryMethodId === method.id
                    return (
                      <label
                        key={method.id}
                        className={`flex items-start gap-4 p-4 rounded-2xl border-2 border-ink cursor-pointer transition ${
                          selected
                            ? 'bg-accent-alt/25 shadow-brutal-sm'
                            : 'bg-background hover:bg-surface'
                        }`}
                      >
                        <input
                          type="radio"
                          name="deliveryMethodId"
                          value={method.id}
                          checked={selected}
                          onChange={() => setField('deliveryMethodId', method.id)}
                          className="mt-1 accent-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display font-bold text-ink">{method.name}</span>
                            <span className="font-display font-bold text-primary">
                              {method.price === 0 ? 'Free' : formatCurrency(method.price)}
                            </span>
                          </div>
                          <p className="font-body text-sm text-muted mt-0.5">{method.description}</p>
                          {method.estimated_days && (
                            <p className="font-body text-xs font-bold text-ink mt-1">
                              {method.estimated_days}
                            </p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                  {errors.deliveryMethodId && (
                    <p className="font-body text-xs font-bold text-danger">
                      {errors.deliveryMethodId}
                    </p>
                  )}
                </div>
              </section>

              <section className={`${BRUTAL_CARD} p-6`}>
                <h2 className="font-display text-xl font-bold text-ink mb-3">Payment</h2>
                <div className="space-y-3">
                  <label
                    className={`flex items-start gap-4 p-4 rounded-2xl border-2 border-ink cursor-pointer transition ${
                      paymentMethod === 'event'
                        ? 'bg-accent/25 shadow-brutal-sm'
                        : 'bg-background hover:bg-surface'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="event"
                      checked={paymentMethod === 'event'}
                      onChange={() => setPaymentMethod('event')}
                      className="mt-1 accent-primary"
                    />
                    <div>
                      <p className="font-display font-bold text-ink">
                        Pay at Event (Cash / UPI)
                      </p>
                      <p className="font-body text-sm text-muted mt-0.5">
                        Pay in person at the SheBuilds Tamil Nadu event. Your order will be
                        reserved.
                      </p>
                    </div>
                  </label>
                </div>

                {submitError && (
                  <div className="mt-4 p-3 rounded-xl border-2 border-ink bg-danger text-surface font-body text-sm font-bold">
                    {submitError}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 mt-6">
                  <button type="button" onClick={() => setStep(1)} className={PILL_SURFACE}>
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting}
                    className={`flex-1 ${PILL_PRIMARY}`}
                  >
                    {isSubmitting ? 'Processing...' : 'Place Order — Pay at Event →'}
                  </button>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-2">
          <div className={`${BRUTAL_CARD} p-6 sticky top-24`}>
            <h2 className="font-display text-xl font-bold text-ink mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              {cart.map((item) => (
                <div key={item.variantId} className="flex gap-3 items-center">
                  <div className="w-12 h-12 rounded-xl border-2 border-ink bg-background overflow-hidden shrink-0">
                    <MerchVisual
                      image={item.imageUrl ? { url: item.imageUrl, alt: item.productName } : null}
                      productName={item.productName}
                      visualType={item.visualType || 'tee'}
                      color={item.visualColor || 'Maroon'}
                      className="!p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm font-bold text-ink truncate">
                      {item.productName}
                    </p>
                    <p className="font-body text-xs text-muted">
                      {item.variantName} ×{item.quantity}
                    </p>
                  </div>
                  <span className="font-display text-sm font-bold text-ink shrink-0">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-ink pt-4 space-y-2 font-body text-sm">
              <div className="flex justify-between text-ink">
                <span>Subtotal (excl. GST)</span>
                <span>{formatCurrency(baseSubtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between font-bold text-primary">
                  <span>Discount {appliedCoupon ? `(${appliedCoupon})` : ''}</span>
                  <span>−{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted">
                <span>CGST</span>
                <span>{formatCurrency(cgstAmount)}</span>
              </div>
              <div className="flex justify-between text-muted">
                <span>SGST</span>
                <span>{formatCurrency(sgstAmount)}</span>
              </div>
              <div className="flex justify-between text-ink">
                <span>Shipping{selectedDelivery ? ` (${selectedDelivery.name})` : ''}</span>
                <span>
                  {isFreeShipping
                    ? 'Free!'
                    : selectedDelivery
                      ? selectedDelivery.price === 0
                        ? 'Free'
                        : formatCurrency(selectedDelivery.price)
                      : 'Calculated next step'}
                </span>
              </div>
            </div>

            <div className="border-t-2 border-ink pt-4 mt-4">
              <div className="flex justify-between font-display text-xl font-bold text-ink">
                <span>Total</span>
                <span className="text-primary">{formatCurrency(orderTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

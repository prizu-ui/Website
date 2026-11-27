/**
 * GST calculation helpers (intra-state: CGST + SGST split evenly).
 * Ported from nammaflutter-store GST logic.
 */

export function round2(value) {
  return Math.round(value * 100) / 100
}

/**
 * Calculate GST from a price that INCLUDES GST (reverse calculation).
 */
export function calculateGstFromInclusivePrice(priceIncludingGst, gstRate = 18) {
  const multiplier = 1 + gstRate / 100
  const basePrice = priceIncludingGst / multiplier
  const totalGst = priceIncludingGst - basePrice
  const cgstRate = gstRate / 2
  const sgstRate = gstRate / 2
  const cgstAmount = totalGst / 2
  const sgstAmount = totalGst / 2

  return {
    basePrice: round2(basePrice),
    gstRate,
    cgstRate,
    sgstRate,
    cgstAmount: round2(cgstAmount),
    sgstAmount: round2(sgstAmount),
    totalGst: round2(totalGst),
    priceWithGst: round2(priceIncludingGst),
  }
}

/**
 * Calculate GST from a price that EXCLUDES GST.
 */
export function calculateGstFromExclusivePrice(basePrice, gstRate = 18) {
  const totalGst = basePrice * (gstRate / 100)
  const cgstRate = gstRate / 2
  const sgstRate = gstRate / 2
  const cgstAmount = totalGst / 2
  const sgstAmount = totalGst / 2
  const priceWithGst = basePrice + totalGst

  return {
    basePrice: round2(basePrice),
    gstRate,
    cgstRate,
    sgstRate,
    cgstAmount: round2(cgstAmount),
    sgstAmount: round2(sgstAmount),
    totalGst: round2(totalGst),
    priceWithGst: round2(priceWithGst),
  }
}

/**
 * Compute cart/order tax breakdown with proportional discount reduction.
 */
export function calculateOrderTax(items, discountAmount = 0, shippingAmount = 0) {
  let subtotalInclusive = 0
  let totalCgst = 0
  let totalSgst = 0
  let totalBase = 0

  for (const item of items) {
    const rate = item.gstRate ?? 18
    const inclusive = item.priceIncludesGst !== false
    const gst = inclusive
      ? calculateGstFromInclusivePrice(item.unitPrice, rate)
      : calculateGstFromExclusivePrice(item.unitPrice, rate)
    const lineTotal = inclusive
      ? item.unitPrice * item.quantity
      : gst.priceWithGst * item.quantity

    subtotalInclusive += lineTotal
    totalBase += gst.basePrice * item.quantity
    totalCgst += gst.cgstAmount * item.quantity
    totalSgst += gst.sgstAmount * item.quantity
  }

  const discountRatio = subtotalInclusive > 0 ? Math.min(1, discountAmount / subtotalInclusive) : 0
  const discountedCgst = round2(totalCgst * (1 - discountRatio))
  const discountedSgst = round2(totalSgst * (1 - discountRatio))
  const discountedBase = round2(totalBase * (1 - discountRatio))
  const total = round2(Math.max(0, discountedBase + discountedCgst + discountedSgst + shippingAmount))

  return {
    subtotal: round2(totalBase),
    subtotalInclusive: round2(subtotalInclusive),
    discountAmount: round2(discountAmount),
    shippingAmount: round2(shippingAmount),
    taxableAmount: discountedBase,
    cgstAmount: discountedCgst,
    sgstAmount: discountedSgst,
    totalTax: round2(discountedCgst + discountedSgst),
    total,
  }
}


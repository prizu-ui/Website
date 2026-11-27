export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(amount || 0))
}

export function formatDate(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .trim()
}

export function generateMerchantTransactionId() {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `SB${timestamp}${random}`
}

export function generateOrderNumber(existingOrders = []) {
  const year = new Date().getFullYear()
  const nextSeq = existingOrders.length + 1
  return `SB-${year}-${String(nextSeq).padStart(4, '0')}`
}

export const PHONE_REGEX = /^[6-9]\d{9}$/
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PINCODE_REGEX = /^\d{6}$/
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i

// Fallback lookup for common Tamil Nadu & major Indian pincodes when offline or blocked by CSP
const LOCAL_PINCODE_PREFIXES = [
  { prefix: '600', district: 'Chennai', state: 'Tamil Nadu' },
  { prefix: '601', district: 'Chengalpattu', state: 'Tamil Nadu' },
  { prefix: '602', district: 'Tiruvallur', state: 'Tamil Nadu' },
  { prefix: '603', district: 'Kanchipuram', state: 'Tamil Nadu' },
  { prefix: '620', district: 'Tiruchirappalli', state: 'Tamil Nadu' },
  { prefix: '625', district: 'Madurai', state: 'Tamil Nadu' },
  { prefix: '636', district: 'Salem', state: 'Tamil Nadu' },
  { prefix: '641', district: 'Coimbatore', state: 'Tamil Nadu' },
  { prefix: '642', district: 'Coimbatore', state: 'Tamil Nadu' },
  { prefix: '560', district: 'Bengaluru', state: 'Karnataka' },
  { prefix: '500', district: 'Hyderabad', state: 'Telangana' },
  { prefix: '400', district: 'Mumbai', state: 'Maharashtra' },
  { prefix: '110', district: 'New Delhi', state: 'Delhi' },
]

export async function lookupPincode(pincode) {
  if (!PINCODE_REGEX.test(pincode)) return null

  try {
    const res = await fetch(`/api/pincode-lookup/${encodeURIComponent(pincode)}`, {
      headers: { Accept: 'application/json' },
    })
    if (res.ok) {
      const json = await res.json()
      const data = json?.data || json
      if (data?.district && data?.state) {
        return {
          district: data.district,
          state: data.state,
          source: data.source || 'api',
        }
      }
    }
  } catch {
    // Fall back gracefully if offline or server unreachable
  }

  const localMatch = LOCAL_PINCODE_PREFIXES.find((item) => pincode.startsWith(item.prefix))
  if (localMatch) {
    return { district: localMatch.district, state: localMatch.state, source: 'local' }
  }
  return null
}


// Color-reactive SheBuilds placeholder apparel/merch visuals using only CSS theme tokens.
// Whenever a real image `url` is provided (e.g. uploaded via Admin), renders <img> directly.

const SVG_FILL_BY_COLOR = {
  maroon: { fill: 'var(--color-primary)', ink: 'var(--color-background)', badge: 'var(--color-accent)' },
  'ink black': { fill: 'var(--color-ink)', ink: 'var(--color-background)', badge: 'var(--color-accent-alt)' },
  black: { fill: 'var(--color-ink)', ink: 'var(--color-background)', badge: 'var(--color-accent-alt)' },
  cream: { fill: 'var(--color-background)', ink: 'var(--color-primary)', badge: 'var(--color-accent)' },
  white: { fill: 'var(--color-surface)', ink: 'var(--color-primary)', badge: 'var(--color-accent)' },
  coral: { fill: 'var(--color-accent)', ink: 'var(--color-ink)', badge: 'var(--color-background)' },
  teal: { fill: 'var(--color-accent-alt)', ink: 'var(--color-ink)', badge: 'var(--color-background)' },
  yellow: { fill: 'var(--color-yellow)', ink: 'var(--color-ink)', badge: 'var(--color-primary)' },
}

function getPalette(colorName = 'Maroon') {
  return SVG_FILL_BY_COLOR[String(colorName).toLowerCase()] || SVG_FILL_BY_COLOR.maroon
}

function inferVisualType(explicitType, image, productName) {
  if (image?.visualType) return image.visualType
  if (explicitType && explicitType !== 'tee') return explicitType
  const name = String(productName || '').toLowerCase()
  if (name.includes('hoodie')) return 'hoodie'
  if (name.includes('stand')) return 'stand'
  if (name.includes('tote')) return 'tote'
  if (name.includes('sticker')) return 'stickers'
  if (name.includes('combo') || name.includes('pack')) return 'combo'
  return explicitType || 'tee'
}

export function MerchVisual({ image, productName = 'Merch', visualType = 'tee', color = 'Maroon', className = '' }) {
  if (image?.url) {
    return (
      <img
        src={image.url}
        alt={image.alt || productName}
        className={`w-full h-full object-contain bg-surface p-2 ${className}`}
        loading="lazy"
      />
    )
  }

  const resolvedType = inferVisualType(visualType, image, productName)
  const resolvedColor = image?.visualColor || color
  const palette = getPalette(resolvedColor)

  return (
    <div
      className={`w-full h-full flex items-center justify-center bg-background p-3 select-none ${className}`}
      aria-label={image?.alt || `${productName} placeholder illustration`}
    >
      {resolvedType === 'hoodie' ? (
        <svg viewBox="0 0 160 160" className="w-4/5 h-4/5 max-w-48 max-h-48" aria-hidden="true">
          <path
            d="M48 34 L22 52 L14 96 L34 102 L40 70 L40 138 L120 138 L120 70 L126 102 L146 96 L138 52 L112 34 L98 42 C90 48 70 48 62 42 Z"
            fill={palette.fill}
            stroke="var(--color-ink)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M60 34 C60 16 100 16 100 34 L96 48 C86 54 74 54 64 48 Z"
            fill={palette.fill}
            stroke="var(--color-ink)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <rect
            x="55"
            y="96"
            width="50"
            height="28"
            rx="6"
            fill={palette.badge}
            stroke="var(--color-ink)"
            strokeWidth="3.5"
          />
          <text
            x="80"
            y="78"
            textAnchor="middle"
            fontSize="13"
            fontWeight="700"
            fill={palette.ink}
            fontFamily="var(--font-display)"
          >
            SB · TN
          </text>
        </svg>
      ) : resolvedType === 'tote' ? (
        <svg viewBox="0 0 160 160" className="w-4/5 h-4/5 max-w-48 max-h-48" aria-hidden="true">
          <path
            d="M56 54 V36 C56 20 104 20 104 36 V54"
            fill="none"
            stroke="var(--color-ink)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <rect
            x="34"
            y="54"
            width="92"
            height="86"
            rx="10"
            fill={palette.fill}
            stroke="var(--color-ink)"
            strokeWidth="4"
          />
          <rect
            x="52"
            y="78"
            width="56"
            height="34"
            rx="6"
            fill={palette.badge}
            stroke="var(--color-ink)"
            strokeWidth="3"
          />
          <text
            x="80"
            y="100"
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fill="var(--color-ink)"
            fontFamily="var(--font-display)"
          >
            SHEBUILDS
          </text>
        </svg>
      ) : resolvedType === 'stand' ? (
        <svg viewBox="0 0 160 160" className="w-4/5 h-4/5 max-w-48 max-h-48" aria-hidden="true">
          {/* Desk base */}
          <path
            d="M36 132 L124 132 L114 114 L46 114 Z"
            fill={palette.badge}
            stroke="var(--color-ink)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* Angled stand neck */}
          <path
            d="M72 114 L82 88 L96 88 L88 114 Z"
            fill={palette.fill}
            stroke="var(--color-ink)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* Phone cradle & phone silhouette */}
          <rect
            x="52"
            y="24"
            width="56"
            height="82"
            rx="10"
            fill={palette.fill}
            stroke="var(--color-ink)"
            strokeWidth="4"
          />
          <rect
            x="60"
            y="34"
            width="40"
            height="58"
            rx="4"
            fill="var(--color-surface)"
            stroke="var(--color-ink)"
            strokeWidth="3"
          />
          <text
            x="80"
            y="66"
            textAnchor="middle"
            fontSize="10"
            fontWeight="700"
            fill="var(--color-primary)"
            fontFamily="var(--font-display)"
          >
            SB · TN
          </text>
        </svg>
      ) : resolvedType === 'stickers' ? (
        <svg viewBox="0 0 160 160" className="w-4/5 h-4/5 max-w-48 max-h-48" aria-hidden="true">
          <rect x="22" y="34" width="66" height="44" rx="22" fill="var(--color-accent)" stroke="var(--color-ink)" strokeWidth="4" />
          <text x="55" y="61" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-ink)" fontFamily="var(--font-display)">BUILD</text>
          <circle cx="110" cy="60" r="28" fill="var(--color-accent-alt)" stroke="var(--color-ink)" strokeWidth="4" />
          <text x="110" y="65" textAnchor="middle" fontSize="13" fontWeight="700" fill="var(--color-ink)" fontFamily="var(--font-display)">TN</text>
          <rect x="36" y="88" width="90" height="44" rx="12" fill="var(--color-primary)" stroke="var(--color-ink)" strokeWidth="4" />
          <text x="81" y="115" textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-background)" fontFamily="var(--font-display)">SHEBUILDS</text>
        </svg>
      ) : (
        <svg viewBox="0 0 160 160" className="w-4/5 h-4/5 max-w-48 max-h-48" aria-hidden="true">
          <path
            d="M50 32 L20 52 L32 82 L48 74 L48 136 L112 136 L112 74 L128 82 L140 52 L110 32 L96 38 C90 46 70 46 64 38 Z"
            fill={palette.fill}
            stroke="var(--color-ink)"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <rect
            x="56"
            y="66"
            width="48"
            height="26"
            rx="13"
            fill={palette.badge}
            stroke="var(--color-ink)"
            strokeWidth="3"
          />
          <text
            x="80"
            y="84"
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="var(--color-ink)"
            fontFamily="var(--font-display)"
          >
            SHEBUILDS
          </text>
        </svg>
      )}
    </div>
  )
}

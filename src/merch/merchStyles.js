export const BRUTAL_CARD =
  'bg-surface border-2 border-ink rounded-2xl shadow-brutal'

export const BRUTAL_CARD_SM =
  'bg-surface border-2 border-ink rounded-2xl shadow-brutal-sm'

export const PILL_PRIMARY =
  'inline-flex items-center justify-center gap-2 rounded-full border-2 border-ink bg-accent px-6 py-3 font-body font-bold text-ink shadow-brutal transition motion-reduce:transition-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-brutal-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50 disabled:cursor-not-allowed'

export const PILL_INK =
  'inline-flex items-center justify-center gap-2 rounded-full border-2 border-ink bg-ink px-6 py-3 font-body font-bold text-surface shadow-brutal-sm transition motion-reduce:transition-none hover:bg-primary active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50 disabled:cursor-not-allowed'

export const PILL_SURFACE =
  'inline-flex items-center justify-center gap-2 rounded-full border-2 border-ink bg-surface px-5 py-2.5 font-body font-bold text-ink shadow-brutal-sm transition motion-reduce:transition-none hover:bg-accent-alt/20 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50 disabled:cursor-not-allowed'

export const PILL_CHIP = (active, tone = 'teal') =>
  [
    'inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-ink px-4 py-2 font-body text-sm font-bold shadow-brutal-sm transition motion-reduce:transition-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
    active
      ? tone === 'coral'
        ? 'bg-accent text-ink'
        : 'bg-accent-alt text-ink'
      : 'bg-surface text-ink hover:bg-background',
  ].join(' ')

export const BRUTAL_INPUT =
  'w-full rounded-xl border-2 border-ink bg-surface px-3.5 py-2.5 font-body text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-background disabled:text-muted'

export const COLOR_SWATCH_CLASS = {
  maroon: 'bg-primary',
  'ink black': 'bg-ink',
  black: 'bg-ink',
  cream: 'bg-background',
  white: 'bg-surface',
  coral: 'bg-accent',
  teal: 'bg-accent-alt',
  yellow: 'bg-yellow',
  lavender: 'bg-lavender',
  orange: 'bg-orange',
  green: 'bg-green',
  purple: 'bg-lavender',
  magenta: 'bg-accent',
}

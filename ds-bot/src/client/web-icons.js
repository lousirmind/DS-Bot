// The fixed entry's mark in three drafts. Draft A is installed; the others are
// kept so the pick is one constant, `WEB_ICON_DRAFT`. Every draft draws on the
// same whale as the Main Bot's mark, so the row reads as part of the team.
import { createElement as h } from 'react'
import { CHARACTERS } from './characters.js'

export const WEB_ICON_DRAFT = 'A'

// The theme's own ink and surfaces, so the mark follows every theme.
const INK = 'var(--bt-accent)'
const ON_INK = 'var(--bt-accent-ink)'
const SURFACE = 'var(--bt-main)'
const SOFT = 'var(--bt-hover)'
const LINE = 'var(--bt-line-2)'
const WHALE = CHARACTERS.whale.body

const frame = (size, children) => h('svg', {
  width: size, height: size, viewBox: '0 0 100 100', 'aria-hidden': true, focusable: false,
}, children)

// The whale path spans about 92x95 in its 100-unit box; the mark is placed by
// the centre and the height it should take, so every draft lines up. The eye keeps
// the silhouette reading as the Main Bot's whale, not a blob.
const WHALE_CENTER = 51
const WHALE_SPAN = 95
const whale = (fill, cx, cy, span, eye, key = 'whale') => {
  const scale = span / WHALE_SPAN
  const x = cx - WHALE_CENTER * scale
  const y = cy - WHALE_CENTER * scale
  return h('g', { key, transform: `translate(${x} ${y}) scale(${scale})` },
    h('path', { d: WHALE, fill }),
    eye ? h('circle', { key: 'eye', cx: 73, cy: 47, r: 7, fill: eye }) : null)
}

// A globe in the corner: this is the web, not another Bot.
const globe = (cx, cy, radius, color, width = 2.4) => h('g', { transform: `translate(${cx} ${cy})` },
  h('circle', { r: radius, fill: 'none', stroke: color, strokeWidth: width }),
  h('ellipse', { rx: radius * 0.42, ry: radius, fill: 'none', stroke: color, strokeWidth: width }),
  h('path', { d: `M${-radius} 0H${radius}`, stroke: color, strokeWidth: width, fill: 'none' }))

/** Draft A: a solid tile with the whale and a globe — the entry at a glance. */
function DraftA({ size, badge = true }) {
  return frame(size, [
    h('circle', { key: 'tile', cx: 50, cy: 50, r: 50, fill: INK }),
    whale(ON_INK, 44, 42, 54, INK),
    badge ? h('circle', { key: 'badge', cx: 76, cy: 77, r: 19, fill: SURFACE }) : null,
    badge ? h('g', { key: 'globe' }, globe(76, 77, 9.8, INK, 2.2)) : null,
  ])
}

/** Draft B: the whale alone, like a Bot's character, with a small globe badge. */
function DraftB({ size, badge = true }) {
  return frame(size, [
    whale(INK, 47, 47, 84, SURFACE),
    badge ? h('circle', { key: 'badge', cx: 80, cy: 79, r: 17, fill: SURFACE }) : null,
    badge ? h('g', { key: 'globe' }, globe(80, 79, 8.8, INK, 2.2)) : null,
  ])
}

/** Draft C: a page card — window chrome over a whale. */
function DraftC({ size }) {
  return frame(size, [
    h('rect', { key: 'tile', x: 6, y: 6, width: 88, height: 88, rx: 24, fill: SOFT }),
    h('rect', { key: 'page', x: 19, y: 17, width: 62, height: 66, rx: 12, fill: SURFACE }),
    h('circle', { key: 'd1', cx: 27, cy: 26, r: 2.6, fill: LINE }),
    h('circle', { key: 'd2', cx: 35, cy: 26, r: 2.6, fill: LINE }),
    h('circle', { key: 'd3', cx: 43, cy: 26, r: 2.6, fill: LINE }),
    h('path', { key: 'rule', d: 'M26 34H74', stroke: LINE, strokeWidth: 2.4, fill: 'none' }),
    whale(INK, 53, 61, 36, SURFACE),
  ])
}

const DRAFTS = { A: DraftA, B: DraftB, C: DraftC }

/**
 * The row's mark. `size` 36 matches a Bot avatar; smaller sizes drop the badge
 * so the whale stays legible.
 */
export function WebPageIcon({ size = 36, draft = WEB_ICON_DRAFT }) {
  const Draft = DRAFTS[draft] ?? DraftA
  return Draft({ size, badge: size >= 24 })
}

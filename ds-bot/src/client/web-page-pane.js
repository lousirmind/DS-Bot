// The DeepSeek web page inside the main area: a toolbar and the rectangle the
// guest covers. The guest itself belongs to bot-browsers.js, so leaving the view
// only hides it — back here it is placed again, not reloaded.
import { createElement as h, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { t } from './i18n.js'
import { SPRING_POP } from './motion.js'
import { WEB_SUBJECT } from './web-page.js'
import { WebPageIcon } from './web-icons.js'

const EMPTY_TABS = { ids: [], active: null }
const EMPTY_PAGE = { url: '', title: '', loading: false, canGoBack: false, canGoForward: false, error: null }

const icon = paths => function ToolIcon() {
  return h('svg', { width: 16, height: 16, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    paths.map((d, index) => h('path', { key: index, d })))
}
const BackIcon = icon(['M12.5 4.5L7 10l5.5 5.5'])
const ReloadIcon = icon(['M15.5 10a5.5 5.5 0 1 1-1.6-3.9', 'M15.5 3.5v3.5H12'])
const StopIcon = icon(['M5.5 5.5l9 9M14.5 5.5l-9 9'])
const WindowIcon = icon(['M4 5h12v9.5H4z', 'M4 7.5h12', 'M12.5 9.5h2'])

// The sidebar is our own element: the pane starts where its right edge ends, so a
// rail, an expanded list and a mid-animation sidebar all land correctly.
const sidebarRight = () => {
  const side = document.querySelector('.bt-side')
  const right = side?.getBoundingClientRect().right
  return Number.isFinite(right) ? Math.round(right) : 0
}

/**
 * The main-area view. Renders nothing while closed; the guest is hidden by the
 * effect's cleanup, never released, so the page survives a trip to a chat.
 */
export function WebPageDock({ useWeb, useBrowserTabs, useBrowserPages, actions }) {
  const web = useWeb(value => value)
  const tabState = useBrowserTabs(map => (map?.[WEB_SUBJECT] ?? EMPTY_TABS))
  const active = tabState.active
  const page = useBrowserPages(pages => (active === null ? null : pages?.[active]) ?? EMPTY_PAGE)
  const body = useRef(null)
  const [left, setLeft] = useState(null)
  const open = web?.open === true && active !== null

  useLayoutEffect(() => {
    if (!open) return undefined
    const measure = () => setLeft(sidebarRight())
    measure()
    const side = document.querySelector('.bt-side')
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    if (side && observer) observer.observe(side)
    window.addEventListener('resize', measure)
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure) }
  }, [open])

  // The guest follows the body box, and leaves the screen when the view closes.
  useLayoutEffect(() => {
    if (!open) return undefined
    const report = () => {
      const rect = body.current?.getBoundingClientRect()
      if (rect !== undefined && rect.width > 0 && rect.height > 0) {
        actions.webPageShow(active, { left: rect.left, top: rect.top, width: rect.width, height: rect.height })
      }
    }
    report()
    const frame = requestAnimationFrame(report)
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(report) : null
    if (body.current) observer?.observe(body.current)
    window.addEventListener('resize', report)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', report)
      actions.webPageShow(null)
    }
  }, [open, active])

  // Focus the guest when the view opens, so typing reaches the page at once.
  useEffect(() => {
    if (!open) return undefined
    const timer = setTimeout(() => actions.webPageFocus?.(active), 240)
    return () => clearTimeout(timer)
  }, [open, active])

  if (!open || left === null) return null
  const loading = page.loading === true
  return createPortal(h('div', { className: 'bt-wpage', style: { left } },
    h('div', { className: 'bt-wpage-bar', role: 'toolbar', 'aria-label': t('DeepSeek Web') },
      h('span', { className: 'bt-wpage-id' }, h(WebPageIcon, { size: 18 }), h('span', { className: 'bt-wpage-name' }, t('DeepSeek Web'))),
      h('span', { className: 'bt-wpage-title', title: page.url || undefined }, page.title || t('Loading…')),
      h('span', { className: 'bt-wpage-tools' },
        h('button', { type: 'button', className: 'bt-wpage-btn', title: t('Back'), 'aria-label': t('Back'), disabled: !page.canGoBack, onClick: () => actions.webPageCommand(active, 'back') }, h(BackIcon)),
        h('button', { type: 'button', className: 'bt-wpage-btn', title: loading ? t('Stop') : t('Reload'), 'aria-label': loading ? t('Stop') : t('Reload'), onClick: () => actions.webPageCommand(active, loading ? 'stop' : 'reload') }, loading ? h(StopIcon) : h(ReloadIcon)),
        tabState.ids.length > 1
          ? h('button', { type: 'button', className: 'bt-wpage-btn', title: t('Back to chat'), 'aria-label': t('Back to chat'), onClick: () => actions.webPageActivate(tabState.ids[0]) }, h(BackIcon))
          : null,
        h('button', { type: 'button', className: 'bt-wpage-btn', title: t('Open in system browser'), 'aria-label': t('Open in system browser'), onClick: () => actions.webPageExternal(active) }, h(WindowIcon)))),
    h('div', { ref: body, className: 'bt-wpage-body' })))
}

export const WEB_PAGE_CSS = `
.bt-wpage{position:fixed;top:var(--dsh-frame-chrome-top,0px);right:0;bottom:0;z-index:40;display:flex;flex-direction:column;background:var(--bt-main);color:var(--bt-ink);font-family:var(--bt-font);animation:bt-wpage-in ${SPRING_POP.duration}ms ${SPRING_POP.easing}}
.bt-wpage-bar{flex:none;display:flex;align-items:center;gap:10px;height:44px;padding:0 10px 0 14px;border-bottom:.5px solid var(--bt-line-2);box-sizing:border-box}
.bt-wpage-id{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;white-space:nowrap}
.bt-wpage-title{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--bt-ink-3);text-align:center}
.bt-wpage-tools{display:flex;align-items:center;gap:2px;flex:none}
.bt-wpage-btn{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:0;border-radius:8px;background:none;color:var(--bt-ink-3);cursor:pointer;padding:0;transition:background-color .12s ease,color .12s ease}
.bt-wpage-btn:hover:not(:disabled){background:var(--bt-hover);color:var(--bt-ink)}
.bt-wpage-btn:disabled{opacity:.4;cursor:default}
.bt-wpage-body{flex:1;min-height:0;position:relative;background:var(--bt-main)}
@keyframes bt-wpage-in{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
`

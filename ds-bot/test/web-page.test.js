import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createWebPage, WEB_HOME, WEB_SUBJECT } from '../src/client/web-page.js'

function createSource(initial) {
  let value = initial
  const listeners = new Set()
  return {
    getSnapshot: () => value,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener) },
    set(next) {
      const resolved = typeof next === 'function' ? next(value) : next
      if (resolved === value) return
      value = resolved
      for (const listener of [...listeners]) listener()
    },
  }
}

// Just the surface createWebPage rides: the strip and page sources, and the calls
// it makes into the browser layer.
function fakeBrowsers() {
  const tabs = createSource({})
  const pages = createSource({})
  const calls = { opened: [], ensured: [], activated: [], shown: [], commanded: [], closed: [] }
  let serial = 0
  return {
    tabs,
    pages,
    calls,
    ensureTabs(subject) { calls.ensured.push(subject) },
    openTab(subject, url) {
      const tabId = `t${++serial}`
      calls.opened.push([subject, url])
      tabs.set(state => ({ ...state, [subject]: { ids: [...(state[subject]?.ids ?? []), tabId], active: tabId } }))
      pages.set(state => ({ ...state, [tabId]: { url: url ?? '', title: '', loading: true, canGoBack: false } }))
      return tabId
    },
    activate(subject, tabId) {
      calls.activated.push([subject, tabId])
      tabs.set(state => ({ ...state, [subject]: { ...state[subject], active: tabId } }))
    },
    show(tabId, box = null) { calls.shown.push([tabId, box]) },
    command(tabId, name) { calls.commanded.push([tabId, name]) },
    closeTab(subject, tabId) { calls.closed.push([subject, tabId]) },
  }
}

test('the web page opens at home the first time and reuses its tab', () => {
  const browsers = fakeBrowsers()
  const page = createWebPage({ browsers })
  assert.equal(page.subject, WEB_SUBJECT)
  assert.equal(page.home, WEB_HOME)
  const first = page.ensure()
  assert.deepEqual(browsers.calls.opened, [[WEB_SUBJECT, WEB_HOME]])
  const second = page.ensure()
  assert.equal(second, first)
  assert.equal(browsers.calls.opened.length, 1, 'the home page is not opened again')
})

test('opening names the tab and leaving only hides the guest', () => {
  const browsers = fakeBrowsers()
  const page = createWebPage({ browsers })
  const tabId = page.open()
  assert.deepEqual(browsers.calls.activated, [[WEB_SUBJECT, tabId]])
  const box = { left: 260, top: 44, width: 900, height: 600 }
  page.show(tabId, box)
  page.hide()
  assert.deepEqual(browsers.calls.shown, [[tabId, box], [null, null]])
  // Coming back places the same guest again: nothing was closed or released.
  page.show(tabId, box)
  assert.equal(browsers.calls.opened.length, 1)
  assert.equal(browsers.calls.shown.at(-1)[0], tabId)
  assert.deepEqual(browsers.calls.closed, [])
})

test('a restored strip keeps its tab instead of going home again', () => {
  const browsers = fakeBrowsers()
  const page = createWebPage({ browsers })
  const first = page.ensure()
  browsers.tabs.set(() => ({ [WEB_SUBJECT]: { ids: [first], active: first } }))
  assert.equal(page.ensure(), first)
  assert.equal(browsers.calls.opened.length, 1)
})

test('commands and the page state pass through to the browser layer', () => {
  const browsers = fakeBrowsers()
  const page = createWebPage({ browsers })
  const tabId = page.open()
  page.command(tabId, 'reload')
  page.command(tabId, 'back')
  assert.deepEqual(browsers.calls.commanded, [[tabId, 'reload'], [tabId, 'back']])
  assert.equal(page.url(tabId), WEB_HOME)
  assert.equal(page.title(tabId), '')
})

test('the system browser only takes http and https pages', () => {
  const opened = []
  const hadWindow = 'window' in globalThis
  const previous = globalThis.window
  globalThis.window = { open: (url, target, features) => { opened.push([url, target, features]) } }
  try {
    const browsers = fakeBrowsers()
    const page = createWebPage({ browsers })
    const tabId = page.open()
    assert.equal(page.openExternal(tabId), true)
    assert.deepEqual(opened, [[WEB_HOME, '_blank', 'noopener']])
    // A page that never navigated has nothing to hand over.
    const blank = createWebPage({ browsers })
    const blankTab = blank.open()
    browsers.pages.set(state => ({ ...state, [blankTab]: { url: 'about:blank', title: '', loading: false } }))
    assert.equal(blank.openExternal(blankTab), false)
    assert.equal(opened.length, 1)
  } finally {
    if (hadWindow) globalThis.window = previous
    else delete globalThis.window
  }
})

// The entry is layout: it sits above the Bot list and is absent without the
// Desktop bridge. The component needs a DOM, so the shape is checked on the source.
test('the sidebar seats the entry above the Bot rows and only with a bridge', () => {
  const source = readFileSync(new URL('../src/client/sidebar.js', import.meta.url), 'utf8')
  const entry = source.indexOf("actions.openWebPage ? h(WebPageRow")
  const main = source.indexOf('main ? h(BotRow')
  const order = source.indexOf("order.map(entry => (entry.kind === 'bot'")
  assert.ok(entry > 0, 'the row is rendered by the sidebar')
  assert.ok(main > 0, 'the Main Bot row is still rendered')
  assert.ok(entry < main && entry < order, 'the fixed row is above the Bot rows')
  assert.match(source, /actions\.openWebPage \? h\(WebPageRow/, 'it is hidden when the bridge is absent')
  assert.match(source, /actions\.closeWebPage\?\.\(\)/, 'a Bot row click leaves the page')
})

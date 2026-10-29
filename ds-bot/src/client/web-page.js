// The DeepSeek web page: the one fixed subject outside the team.
//
// It rides the Desktop browser bridge the Bot browsers already use — the lease
// keeps one guest alive for the whole app run, so the page keeps its scroll,
// its draft and its sign-in while the user works in a chat, and coming back
// only re-places the guest instead of reloading it.
//
// It is modelled as a subject with tabs, not as a Bot: `WEB_SUBJECT` names the
// fixed storage partition and one tab holds the page. Later work that moves
// text between a Bot and the page reads and writes `page(tabId)`; it does not
// need a different shape.
export const WEB_SUBJECT = 'web:deepseek'
export const WEB_HOME = 'https://chat.deepseek.com/'
// A link asking for a new window opens a tab in this subject, like a Bot's browser.
export const WEB_MAX_TABS = 4

/**
 * @param {{ browsers: ReturnType<typeof import('./bot-browsers.js').createBotBrowsers> }} options
 */
export function createWebPage({ browsers }) {
  const tabs = () => browsers.tabs.getSnapshot()[WEB_SUBJECT] ?? { ids: [], active: null }
  const pageOf = tabId => browsers.pages.getSnapshot()[tabId] ?? null
  /** Open the subject's strip, at home the first time, and return its tab. */
  const ensure = () => {
    browsers.ensureTabs(WEB_SUBJECT)
    const state = tabs()
    const known = state.active !== null && state.ids.includes(state.active) ? state.active : state.ids[0] ?? null
    return known ?? browsers.openTab(WEB_SUBJECT, WEB_HOME)
  }
  return {
    subject: WEB_SUBJECT,
    home: WEB_HOME,
    tabs,
    ensure,
    open() {
      const tabId = ensure()
      browsers.activate(WEB_SUBJECT, tabId)
      return tabId
    },
    /** Put the tab's guest on screen over `box` (viewport pixels), or hide it with null. */
    show: (tabId, box = null) => browsers.show(tabId, box),
    /** Leave the view: the guest stays alive, only off screen. */
    hide: () => browsers.show(null),
    activate: tabId => browsers.activate(WEB_SUBJECT, tabId),
    command: (tabId, name) => browsers.command(tabId, name),
    page: pageOf,
    url: tabId => pageOf(tabId)?.url ?? '',
    title: tabId => pageOf(tabId)?.title ?? '',
    /** Hand the page to the system browser: the renderer's window.open reaches the shell. */
    openExternal(tabId) {
      const url = pageOf(tabId)?.url ?? ''
      if (!/^https?:\/\//i.test(url)) return false
      window.open(url, '_blank', 'noopener')
      return true
    },
  }
}

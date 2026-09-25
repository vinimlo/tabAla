// Fake chrome.* for rendering TabAla pages outside the extension. Fictional data only.
// Query string: ?theme=dark|light, ?session=1 (a Focus session in progress), ?empty=1 (nothing saved).
(() => {
  const DAY = 86400000;
  const now = Date.now();
  const params = new URLSearchParams(location.search);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dk = (t) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const fav = (host) => `https://www.google.com/s2/favicons?domain=${host}&sz=64`;

  const collections = [
    { id: 'inbox', name: 'Inbox', order: 0, isDefault: true, createdAt: now - 90 * DAY },
    { id: 'c-ml', name: 'Machine learning', order: 1, color: '#6B8AAF', workspaceId: 'general', focus: true, createdAt: now - 80 * DAY },
    { id: 'c-web', name: 'Web platform', order: 2, color: '#7CB890', workspaceId: 'general', createdAt: now - 70 * DAY },
    { id: 'c-talks', name: 'Talks para ver', order: 3, color: '#D4A85A', workspaceId: 'general', createdAt: now - 60 * DAY },
    { id: 'c-ref', name: 'Referência', order: 4, color: '#9B8AA0', workspaceId: 'general', reference: true, createdAt: now - 50 * DAY },
    { id: 'c-side', name: 'Projeto paralelo', order: 5, color: '#B07BAF', workspaceId: 'w-side', createdAt: now - 40 * DAY },
  ];
  const L = (id, col, title, url, host, ageDays, extra = {}) =>
    ({ id, collectionId: col, title, url, favicon: fav(host), createdAt: now - ageDays * DAY, ...extra });
  const links = params.get('empty') === '1' ? [] : [
    L('l1', 'c-ml', 'Attention Is All You Need', 'https://arxiv.org/abs/1706.03762', 'arxiv.org', 30, { order: 1 }),
    L('l2', 'c-ml', "Let's build GPT: from scratch, in code, spelled out", 'https://www.youtube.com/watch?v=kCc8FmEb1nY', 'youtube.com', 28, { order: 2 }),
    L('l3', 'c-ml', 'karpathy/nanoGPT', 'https://github.com/karpathy/nanoGPT', 'github.com', 25, { order: 3 }),
    L('l4', 'c-ml', 'The Illustrated Transformer', 'https://jalammar.github.io/illustrated-transformer/', 'jalammar.github.io', 20, { order: 4 }),
    L('l5', 'c-ml', 'Scaling Laws for Neural Language Models', 'https://arxiv.org/abs/2001.08361', 'arxiv.org', 18, { order: 5, completedAt: now - 2 * DAY }),
    L('l6', 'c-web', 'View Transitions API — MDN', 'https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API', 'developer.mozilla.org', 15, { order: 1 }),
    L('l7', 'c-web', 'Svelte 5 runes: migration guide', 'https://svelte.dev/docs/svelte/v5-migration-guide', 'svelte.dev', 14, { order: 2 }),
    L('l8', 'c-web', 'CSS anchor positioning', 'https://developer.chrome.com/blog/anchor-positioning-api', 'developer.chrome.com', 12, { order: 3 }),
    L('l9', 'c-web', 'Web Locks API', 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API', 'developer.mozilla.org', 70, { order: 4 }),
    L('l10', 'c-talks', 'Simple Made Easy — Rich Hickey', 'https://www.youtube.com/watch?v=SxdOUGdseq4', 'youtube.com', 45, { order: 1 }),
    L('l11', 'c-talks', "The Mess We're In — Joe Armstrong", 'https://www.youtube.com/watch?v=lKXe3HUG2l4', 'youtube.com', 65, { order: 2 }),
    L('l12', 'c-talks', 'Inventing on Principle — Bret Victor', 'https://vimeo.com/906418692', 'vimeo.com', 40, { order: 3, completedAt: now - 5 * DAY }),
    L('l13', 'c-ref', 'Refactoring UI', 'https://www.refactoringui.com/', 'refactoringui.com', 50, { order: 1 }),
    L('l14', 'c-ref', "Butterick's Practical Typography", 'https://practicaltypography.com/', 'practicaltypography.com', 49, { order: 2 }),
    L('l15', 'inbox', 'Conversa: plano de estudos de transformers', 'https://claude.ai/chat/2b1f0c', 'claude.ai', 3),
    L('l16', 'inbox', 'How to Read a Paper — S. Keshav', 'https://web.stanford.edu/class/ee384m/Handouts/HowtoReadPaper.pdf', 'stanford.edu', 1),
    L('l17', 'inbox', 'Designing Data-Intensive Applications — cap. 5', 'https://dataintensive.net/', 'dataintensive.net', 75),
    L('l18', 'c-side', 'Chrome Extensions: service worker lifecycle', 'https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle', 'developer.chrome.com', 10, { order: 1 }),
    L('l19', 'c-side', 'crxjs/chrome-extension-tools', 'https://github.com/crxjs/chrome-extension-tools', 'github.com', 9, { order: 2 }),
    L('l20', 'c-web', 'Interop 2026 dashboard', 'https://wpt.fyi/interop-2026', 'wpt.fyi', 8, { order: 5, snoozedUntil: today.getTime() + 3 * DAY }),
    L('l21', 'inbox', '', 'https://example.org/a/very/long/path/without/a/title/saved/from/a/tab', 'example.org', 2),
  ];
  const act = (o) => ({ opens: 0, openDays: [], shownDays: [], snoozes: 0, activeMs: 0, ...o });
  const activity = {
    l2: act({ opens: 2, lastOpenedAt: now - DAY, openDays: [dk(now - 3 * DAY), dk(now - DAY)], activeMs: 18 * 60000, askCompleteAt: now - 3600000 }),
    l1: act({ opens: 1, lastOpenedAt: now - 2 * DAY, openDays: [dk(now - 2 * DAY)], activeMs: 12 * 60000 }),
    l11: act({ shownDays: [dk(now - 3 * DAY), dk(now - 2 * DAY), dk(now - DAY)], snoozes: 3 }),
    l17: act({ shownDays: [dk(now - 4 * DAY), dk(now - 2 * DAY), dk(now - DAY)] }),
    l5: act({ opens: 3, activeMs: 42 * 60000 }),
    l12: act({ opens: 1, activeMs: 55 * 60000 }),
  };
  const data = {
    links,
    collections,
    workspaces: [
      { id: 'general', name: 'Geral', color: '#E85D42', order: 0, createdAt: now - 90 * DAY, isDefault: true },
      { id: 'w-side', name: 'Side projects', color: '#5DA3A0', order: 1, createdAt: now - 40 * DAY },
    ],
    settings: {
      newtabEnabled: true, onboardingCompleted: true, theme: params.get('theme') || 'dark', topicSearch: false,
      showNextUp: true, nextUpCollapsed: false, learnFromBrowsing: true,
    },
    activity,
    recoStats: {},
  };
  if (params.get('session') === '1') {
    data.focusSession = {
      minutes: 30, startedAt: now - 18 * 60000, completedIds: ['l5'],
      items: [{ type: 'link', linkId: 'l5' }, { type: 'link', linkId: 'l10' }, { type: 'link', linkId: 'l6' }],
    };
  }

  const ev = () => {
    const fns = [];
    return {
      addListener: (f) => fns.push(f),
      removeListener: (f) => { const i = fns.indexOf(f); if (i >= 0) fns.splice(i, 1); },
      hasListener: (f) => fns.includes(f),
      fns,
    };
  };
  const onChanged = ev();
  const pick = (store, keys) => {
    if (keys == null) return structuredClone(store);
    const list = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
    const out = {};
    for (const k of list) if (k in store) out[k] = structuredClone(store[k]);
    return out;
  };
  const area = (store, name) => ({
    get: async (keys) => pick(store, keys),
    set: async (items) => {
      const changes = {};
      for (const [k, v] of Object.entries(items)) {
        changes[k] = { oldValue: store[k], newValue: structuredClone(v) };
        store[k] = structuredClone(v);
      }
      onChanged.fns.forEach((f) => f(changes, name));
    },
    remove: async (keys) => {
      const changes = {};
      for (const k of [].concat(keys)) { changes[k] = { oldValue: store[k] }; delete store[k]; }
      onChanged.fns.forEach((f) => f(changes, name));
    },
    clear: async () => { for (const k of Object.keys(store)) delete store[k]; },
  });

  let messages = {};
  try {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/_locales/pt_BR/messages.json', false);
    xhr.send();
    messages = JSON.parse(xhr.responseText);
  } catch (error) {
    console.warn('preview stub: no locale', error);
  }
  const getMessage = (key, subs) => {
    const entry = messages[key];
    if (!entry) return '';
    const list = subs == null ? [] : [].concat(subs).map(String);
    let text = entry.message;
    for (const [name, ph] of Object.entries(entry.placeholders || {})) {
      const content = ph.content.replace(/\$(\d)/g, (_, n) => list[Number(n) - 1] ?? '');
      text = text.replace(new RegExp(`\\$${name}\\$`, 'gi'), content);
    }
    text = text.replace(/\$(\d)/g, (_, n) => list[Number(n) - 1] ?? '');
    return text.replace(/\$\$/g, '$');
  };

  const tabs = [
    { id: 101, windowId: 1, index: 0, active: false, pinned: false, title: 'Rust Book — Ownership', url: 'https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html', favIconUrl: fav('rust-lang.org'), groupId: -1 },
    { id: 102, windowId: 1, index: 1, active: false, pinned: false, title: 'Hacker News', url: 'https://news.ycombinator.com/', favIconUrl: fav('ycombinator.com'), groupId: -1 },
    { id: 103, windowId: 1, index: 2, active: true, pinned: false, title: 'Nova aba', url: location.href, groupId: -1 },
  ];

  window.chrome = {
    runtime: {
      id: 'preview', getURL: (p) => `/${p.replace(/^\//, '')}`, getManifest: () => ({ version: '0.0.0' }),
      onMessage: ev(), onStartup: ev(), onInstalled: ev(), sendMessage: async () => undefined, lastError: undefined,
    },
    i18n: { getMessage, getUILanguage: () => 'pt-BR' },
    storage: { local: area(data, 'local'), session: area({}, 'session'), onChanged },
    tabs: {
      query: async () => structuredClone(tabs), create: async (o) => ({ id: 999, ...o }), update: async () => ({}),
      remove: async () => undefined, get: async (id) => tabs.find((t) => t.id === id), getCurrent: async () => tabs[2],
      onUpdated: ev(), onRemoved: ev(), onCreated: ev(), onActivated: ev(), onMoved: ev(), onAttached: ev(), onDetached: ev(),
    },
    tabGroups: { query: async () => [], onUpdated: ev(), onRemoved: ev(), onCreated: ev() },
    windows: {
      WINDOW_ID_NONE: -1, WINDOW_ID_CURRENT: -2, get: async () => ({ id: 1, focused: true }),
      getLastFocused: async () => ({ id: 1, focused: true }), onFocusChanged: ev(),
    },
    action: { setBadgeText: async () => undefined, setBadgeBackgroundColor: async () => undefined },
  };
})();

(() => {
  if (window.top !== window || !['https://unixgram.com', 'https://www.unixgram.com'].includes(location.origin)) return;
  if (window.__ugdRuntime) return;
  const originalFetch = window.fetch.bind(window);
  let options = { reconnectEnabled: true, trayUnreadBadge: true, windowsNotifications: true };
  let count = null;
  let timer;
  let busy = false;
  let nextAllowed = 0;
  let hiddenAt = 0;
  let route = location.pathname;
  let baseTitle = document.title.replace(/^\(\d+\)\s*/, '');
  let lastRecovery = 0;
  const isAccountPage = () => /^\/(dashboard(?:\/|$)|u\/|post\/|communities(?:\/|$))/.test(location.pathname);

  const paintTitle = () => {
    if (count === null) return;
    const wanted = `${count > 0 ? `(${Math.min(count, 999)}) ` : ''}${baseTitle || 'UnixGram'}`;
    if (document.title !== wanted) document.title = wanted;
  };
  const readCount = (payload) => {
    if (payload?.success !== true || !payload.data || typeof payload.data !== 'object') return null;
    const value = payload.data.unreadChats ?? payload.data.count ?? payload.data.unreadCount;
    return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 999) : null;
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(poll, document.hidden ? 60000 : 30000);
  };
  async function poll() {
    if (busy) return;
    if ((!options.trayUnreadBadge && !options.windowsNotifications) || !navigator.onLine ||
        !isAccountPage() || Date.now() < nextAllowed) {
      schedule(); return;
    }
    busy = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await originalFetch('/api/social/messages/unread-count', {
        credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal: controller.signal,
      });
      if (response.status === 401) {
        count = null;
        nextAllowed = Date.now() + 120000;
      } else if (response.status === 429) {
        const raw = response.headers.get('Retry-After');
        const seconds = Number(raw);
        const delay = raw && Number.isFinite(seconds) ? seconds * 1000 : Date.parse(raw || '') - Date.now();
        nextAllowed = Date.now() + Math.max(30000, Number.isFinite(delay) ? delay : 60000);
      } else if (response.ok) {
        const value = readCount(await response.json());
        if (value !== null) { count = value; paintTitle(); }
      }
    } catch { /* Keep the last confirmed count during network failures. */ }
    finally { clearTimeout(timeout); busy = false; schedule(); }
  }
  function offerRefresh() {
    if (!options.reconnectEnabled || !document.body || document.hidden || !navigator.onLine) return;
    if (Date.now() - lastRecovery < 15000) return;
    lastRecovery = Date.now();
    // The website owns realtime and all in-flight actions. Never reload a call,
    // pending invoice, upload or unsaved composer merely because connectivity changed.
    let notice = document.getElementById('unixgram-desktop-recovery-notice');
    if (notice) return;
    notice = document.createElement('div');
    notice.id = 'unixgram-desktop-recovery-notice';
    notice.setAttribute('role', 'status');
    notice.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2147483647;max-width:calc(100vw - 32px);padding:12px;display:flex;gap:12px;align-items:center;border-radius:14px;background:var(--ugd-panel,#15151a);color:var(--ugd-text,#fff);border:1px solid var(--ugd-line,#444);font:13px system-ui;box-shadow:0 8px 24px #0003';
    const text = document.createElement('span');
    text.textContent = 'Связь восстановлена. Если данные устарели, обновите страницу.';
    const refresh = document.createElement('button');
    refresh.textContent = 'Обновить';
    refresh.type = 'button';
    refresh.onclick = () => {
      if (window.confirm('Обновить страницу? Незавершённая отправка, звонок и несохранённый текст могут прерваться.')) location.reload();
    };
    const close = document.createElement('button');
    close.textContent = '×';
    close.type = 'button';
    close.setAttribute('aria-label', 'Закрыть уведомление');
    close.onclick = () => notice.remove();
    for (const button of [refresh, close]) button.style.cssText = 'font:inherit;color:inherit;background:transparent;border:1px solid currentColor;border-radius:8px;padding:8px;cursor:pointer';
    notice.append(text, refresh, close);
    document.body.append(notice);
  }
  function start() {
    const titleObserver = new MutationObserver(() => {
      const current = document.title.replace(/^\(\d+\)\s*/, '');
      if (current !== baseTitle) baseTitle = current;
      paintTitle();
    });
    if (document.head) titleObserver.observe(document.head, { subtree: true, childList: true, characterData: true });
    void poll();
  }
  window.__ugdRuntime = {
    configure(value) { options = { ...options, ...value }; },
    recover() { window.dispatchEvent(new Event('online')); },
  };
  window.addEventListener('online', () => { offerRefresh(); void poll(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else { if (hiddenAt && Date.now() - hiddenAt > 60000) offerRefresh(); void poll(); }
  });
  setInterval(() => {
    document.documentElement.dataset.ugdPage = location.pathname.includes('/messages') ? 'messages' : 'default';
    if (route !== location.pathname) {
      route = location.pathname;
      if (!isAccountPage()) { count = null; nextAllowed = 0; document.title = baseTitle || 'UnixGram'; }
      void poll();
    }
  }, 1000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

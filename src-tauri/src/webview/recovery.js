(() => {
  if (window.__ugdRuntime) { window.__ugdRuntime.recover(); return; }
  const fields = document.querySelectorAll('input, textarea, [contenteditable="true"]');
  const hasDraft = Array.from(fields).some((field) => {
    const value = 'value' in field ? field.value : field.textContent;
    return typeof value === 'string' && value.trim().length > 0;
  });
  let notice = document.getElementById('unixgram-desktop-recovery-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'unixgram-desktop-recovery-notice';
    notice.setAttribute('role', 'status');
    Object.assign(notice.style, {
      position: 'fixed', left: '50%', bottom: '22px', transform: 'translateX(-50%)',
      zIndex: '2147483647', padding: '10px 14px', borderRadius: '12px',
      color: '#fff', background: 'rgba(20, 20, 24, .94)',
      font: '600 13px system-ui, sans-serif', boxShadow: '0 8px 28px rgba(0,0,0,.35)'
    });
    document.body.appendChild(notice);
  }
  notice.textContent = hasDraft ? 'Связь восстановлена. Текст остался в окне. Обновите страницу после отправки.' : 'Связь восстановлена. Если данные устарели, обновите страницу вручную.';
  clearTimeout(window.__unixgramRecoveryNoticeTimer);
  window.__unixgramRecoveryNoticeTimer = setTimeout(() => notice?.remove(), 6000);
})();

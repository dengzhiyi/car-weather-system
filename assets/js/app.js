/* 车象 WeatherOS · 共享运行时：图标挂载 / 时钟 / 导航可访问性 / Toast / 通用开关 */
(function () {
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------- 图标挂载 ---------- */
  Icons.mount(document);

  /* ---------- 导航当前态（视觉态由 CSS 的 body[data-page] 唯一驱动） ---------- */
  const page = document.body.dataset.page;
  $$('.nav-item').forEach(function (link) {
    if (link.dataset.nav === page) link.setAttribute('aria-current', 'page');
  });

  /* ---------- 时钟 ---------- */
  const dateEl = $('#tbDate');
  const clockEl = $('#tbClock');
  function tick() {
    const now = new Date();
    const pad = function (n) { return String(n).padStart(2, '0'); };
    if (clockEl) clockEl.textContent = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    if (dateEl) {
      const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
      dateEl.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日 · ' + week;
    }
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- Toast ---------- */
  let toastRoot = null;
  function ensureToastRoot() {
    if (!toastRoot) {
      toastRoot = document.createElement('div');
      toastRoot.id = 'toast-root';
      document.body.appendChild(toastRoot);
    }
    return toastRoot;
  }
  function toast(message, tone, iconName) {
    const root = ensureToastRoot();
    const el = document.createElement('div');
    el.className = 'toast ' + (tone || 'info');
    const ic = iconName || (tone === 'ok' ? 'circle-check' : tone === 'danger' ? 'circle-alert' : tone === 'warn' ? 'alert-triangle' : 'bell');
    el.innerHTML =
      '<span class="t-ic" data-icon="' + ic + '"></span>' +
      '<div class="t-msg">' + message + '</div>' +
      '<span class="t-close" data-icon="x"></span>';
    root.appendChild(el);
    Icons.mount(el);
    const close = function () {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(function () { el.remove(); }, 260);
    };
    el.querySelector('.t-close').addEventListener('click', close);
    setTimeout(close, 3600);
  }

  /* ---------- 通用开关（通知类），页面级开关各自接管 ---------- */
  $$('.js-switch').forEach(function (sw) {
    if (!sw.hasAttribute('role')) sw.setAttribute('role', 'switch');
    if (!sw.hasAttribute('tabindex')) sw.setAttribute('tabindex', '0');
    const toggle = function () {
      const next = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(next));
      const msg = sw.dataset.toast;
      if (msg) toast(msg + (next ? '已开启' : '已关闭'), next ? 'ok' : 'info');
    };
    sw.addEventListener('click', toggle);
    sw.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });

  /* ---------- 数字滚动（仪表读数切换） ---------- */
  function animateNumber(el, to, decimals, suffix) {
    if (!el) return;
    const from = parseFloat(el.textContent.replace(/[^\d.-]/g, '')) || 0;
    const start = performance.now();
    const dur = 480;
    const d = decimals == null ? 0 : decimals;
    function frame(t) {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (to - from) * eased;
      el.textContent = val.toFixed(d) + (suffix || '');
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.CW = {
    $: $,
    $$: $$,
    toast: toast,
    animateNumber: animateNumber,
    icons: function (root) { Icons.mount(root || document); }
  };
})();

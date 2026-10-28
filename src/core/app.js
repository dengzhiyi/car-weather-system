/* 共享运行时初始化：图标挂载 / 导航可访问性 / 时钟 / 通用开关
   由页面入口首个 import 触发，等价于原 app.js 的即时执行 */
import { mount } from './icons.js';
import { $, $$, toast } from './dom.js';

mount(document);

/* ---------- 导航当前态（视觉态由 CSS 的 body[data-page] 唯一驱动） ---------- */
const page = document.body.dataset.page;
$$('.nav-item').forEach(function (link) {
  if (link.dataset.nav === page) link.setAttribute('aria-current', 'page');
});

/* ---------- 页面说明浮层（标题旁「?」，默认隐藏，点击查看） ---------- */
const helpBtn = $('.help-btn');
if (helpBtn) {
  const pop = document.createElement('div');
  pop.className = 'help-pop';
  pop.setAttribute('role', 'tooltip');
  pop.textContent = helpBtn.getAttribute('data-help') || '';
  pop.hidden = true;
  helpBtn.parentNode.appendChild(pop);
  const closeHelp = function () {
    pop.hidden = true;
    helpBtn.setAttribute('aria-expanded', 'false');
  };
  helpBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    const willOpen = pop.hidden;
    pop.hidden = !willOpen;
    helpBtn.setAttribute('aria-expanded', String(willOpen));
  });
  document.addEventListener('click', function (e) {
    if (!pop.hidden && !pop.contains(e.target)) closeHelp();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeHelp();
  });
}

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

/* ---------- 底部 Dock 全局操作 ---------- */
const dockBack = $('[data-dock="back"]');
if (dockBack) {
  dockBack.addEventListener('click', function () { history.back(); });
}
const dockRefresh = $('[data-dock="refresh"]');
if (dockRefresh) {
  dockRefresh.addEventListener('click', function () { location.reload(); });
}
const dockSettings = $('[data-dock="settings"]');
if (dockSettings) {
  dockSettings.addEventListener('click', function () { toast('设置面板将在后续版本开放', 'info'); });
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

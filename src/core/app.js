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

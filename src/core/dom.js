/* 通用 DOM 与反馈工具：与业务无关，任何页面可复用 */
import { mount } from './icons.js';

export const $ = function (sel, root) {
  return (root || document).querySelector(sel);
};

export const $$ = function (sel, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(sel));
};

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

export function toast(message, tone, iconName) {
  const root = ensureToastRoot();
  const el = document.createElement('div');
  el.className = 'toast ' + (tone || 'info');
  const ic = iconName || (tone === 'ok' ? 'circle-check' : tone === 'danger' ? 'circle-alert' : tone === 'warn' ? 'alert-triangle' : 'bell');
  el.innerHTML =
    '<span class="t-ic" data-icon="' + ic + '"></span>' +
    '<div class="t-msg">' + message + '</div>' +
    '<span class="t-close" data-icon="x"></span>';
  root.appendChild(el);
  mount(el);
  const close = function () {
    el.style.transition = 'opacity .25s, transform .25s';
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(function () { el.remove(); }, 260);
  };
  el.querySelector('.t-close').addEventListener('click', close);
  setTimeout(close, 3600);
}

/* ---------- 数字滚动 ---------- */
export function animateNumber(el, to, decimals, suffix) {
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

export const icons = function (root) {
  mount(root || document);
};

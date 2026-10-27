/* 露营助手 · 高德路线联动与到达天气 */
import '../core/app.js';
import { $, $$, toast, icons } from '../core/dom.js';
import { DB } from '../data/mock.js';
import { Api } from '../api/api.js';

const list = DB.camping.destinations;
let current = list[0];
let busy = false;
let mapScale = 1;

const input = $('#destInput');
const searchBox = $('#searchBox');
const errorEl = $('#destError');
const planBtn = $('#planBtn');
const loading = $('#arrivalLoading');
const chips = $('#destChips');

/* ---------- 目的地快捷选项 ---------- */
chips.innerHTML = list.map(function (d) {
  return '<button class="spot-chip" type="button" data-dest-id="' + d.id + '">' + d.name + '</button>';
}).join('');

function markChips(id) {
  $$('.spot-chip', chips).forEach(function (b) {
    b.classList.toggle('is-active', b.dataset.destId === id);
  });
}

/* ---------- 渲染到达信息 ---------- */
function renderDestination(dest) {
  current = dest;
  input.value = dest.name;
  $('#campStatusText').textContent = '目的地：' + dest.name;
  $('#mapDestChip').textContent = dest.name;
  $('#mapDestLabel').textContent = dest.name;
  $('#mapDistance').textContent = dest.distance;
  $('#mapDuration').textContent = dest.duration;
  $('#routeMeta').textContent = dest.distance + ' · ' + dest.duration + ' · 预计 ' + dest.arrival + ' 到达';
  $('#adviceDest').textContent = dest.name;

  $('#arrTemp').textContent = dest.temp;
  $('#arrCond').textContent = dest.condition;
  $('#arrArrival').textContent = '预计 ' + dest.arrival + ' 到达';
  $('#arrRain').textContent = dest.rainChance + '%';
  $('#arrWind').textContent = dest.wind;
  $('#arrPressure').textContent = dest.pressure + ' hPa';
  $('#arrVis').textContent = dest.visibility;
  $('#arrNote').textContent = dest.note;

  const badge = $('#arrBadge');
  badge.textContent = dest.condition;
  badge.className = 'tag ' + (dest.rainChance >= 70 ? 'tag-warn' : dest.rainChance >= 40 ? 'tag-info' : 'tag-ok');

  const iconEl = $('#arrIcon');
  iconEl.setAttribute('data-icon', dest.icon);
  iconEl.removeAttribute('data-icon-ready');

  $('#arrHourly').innerHTML = dest.hourly.map(function (h) {
    return (
      '<div class="hr-item">' +
        '<span class="hr-time">' + h.time + '</span>' +
        '<span class="hr-ic" data-icon="' + h.icon + '"></span>' +
        '<span class="hr-temp">' + h.temp + '°</span>' +
        '<span class="hr-rain">降水 ' + h.rain + '%</span>' +
      '</div>'
    );
  }).join('');

  const rating = dest.comfortText.split(' · ')[0];
  $('#comfortScore').innerHTML = dest.comfort + '<small>/ 100 · ' + rating + '</small>';
  $('#comfortText').textContent = dest.comfortNote;
  $('#safetyMain').textContent = dest.safetyTitle;
  $('#safetyText').textContent = dest.safetyText;
  $('#gearChips').innerHTML = dest.gear.map(function (g, i) {
    return '<span class="tag ' + (i === 0 ? 'tag-warn' : 'tag-dim') + '">' + g + '</span>';
  }).join('');

  markChips(dest.id);
  icons(document);
}

/* ---------- 设定目的地（调用 API stub） ---------- */
async function plan(query) {
  if (busy) return;
  const q = String(query == null ? input.value : query).trim();
  if (!q) {
    errorEl.textContent = '请输入目的地或营地名称';
    searchBox.classList.add('is-error');
    input.focus();
    toast('请先输入目的地', 'warn');
    return;
  }
  errorEl.textContent = '';
  searchBox.classList.remove('is-error');
  busy = true;
  planBtn.disabled = true;
  loading.hidden = false;

  const res = await Api.planDestination({ query: q });

  loading.hidden = true;
  planBtn.disabled = false;
  busy = false;

  if (res.code !== 0 || !res.data) {
    toast(res.message || '路线规划失败，请重试', 'danger');
    return;
  }
  renderDestination(res.data.destination);
  toast('目的地已设定 · 高德路线与天气已同步', 'ok');
}

planBtn.addEventListener('click', function () { plan(); });
input.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') { e.preventDefault(); plan(); }
});
input.addEventListener('input', function () {
  errorEl.textContent = '';
  searchBox.classList.remove('is-error');
});

chips.addEventListener('click', function (e) {
  const btn = e.target.closest('.spot-chip');
  if (!btn) return;
  const dest = list.find(function (d) { return d.id === btn.dataset.destId; });
  if (dest) {
    input.value = dest.name;
    markChips(dest.id);
    plan(dest.name);
  }
});

/* ---------- 地图缩放 ---------- */
const mapArt = $('#mapArt');
function zoom(delta) {
  mapScale = Math.min(1.5, Math.max(1, mapScale + delta));
  mapArt.style.transform = 'scale(' + mapScale.toFixed(2) + ')';
}
$('#zoomIn').addEventListener('click', function () { zoom(0.15); });
$('#zoomOut').addEventListener('click', function () { zoom(-0.15); });

/* ---------- 初始状态 ---------- */
renderDestination(current);


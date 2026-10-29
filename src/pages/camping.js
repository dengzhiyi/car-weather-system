/* 露营助手 · 高德路线联动与到达天气 */
import '../core/app.js';
import { $, $$, toast, icons } from '../core/dom.js';
import { DB } from '../data/mock.js';
import { Api } from '../api/api.js';
import { clockOf, minutesOfDuration } from '../core/time.js';
import { mountRouteMap } from '../maps/amap.js';

const list = DB.camping.destinations;
/* 默认目的地：马峦山溪谷营地（离总部最近，溪谷天气更具代表性） */
const DEFAULT_DEST_ID = 'malun';
let current = list.find(function (d) { return d.id === DEFAULT_DEST_ID; }) || list[0];
let busy = false;
let mapScale = 1;
let routeMap = null;
let state = null;

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

/* ---------- 时间文案：到达时刻与逐时一律按系统时钟推算 ---------- */
function arrivalMsOf(route) {
  return Date.now() + minutesOfDuration(route.duration) * 60 * 1000;
}

function paintTimes() {
  if (!state) return;
  const arrivalMs = arrivalMsOf(state.route);
  const arrival = clockOf(arrivalMs);
  $('#routeMeta').textContent = state.route.distance + ' · ' + state.route.duration + ' · 预计 ' + arrival + ' 到达';
  $('#arrArrival').textContent = '预计 ' + arrival + ' 到达';
  const times = $$('#arrHourly .hr-time');
  (state.dest.hourly || []).forEach(function (h, i) {
    if (!times[i]) return;
    const offset = typeof h.offset === 'number' ? h.offset : i * 60;
    times[i].textContent = clockOf(arrivalMs + offset * 60 * 1000);
  });
}

/* ---------- 渲染到达信息 ---------- */
function renderDestination(dest, route) {
  current = dest;
  state = { dest: dest, route: route };
  input.value = dest.name;
  $('#campStatusText').textContent = '目的地：' + dest.name;
  $('#mapDestChip').textContent = dest.name;
  $('#mapDestLabel').textContent = dest.name;
  $('#mapDistance').textContent = route.distance;
  $('#mapDuration').textContent = route.duration;
  $('#adviceDest').textContent = dest.name;

  $('#arrTemp').textContent = dest.temp;
  $('#arrCond').textContent = dest.condition;
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

  const arrivalMs = arrivalMsOf(route);
  $('#arrHourly').innerHTML = dest.hourly.map(function (h, i) {
    const offset = typeof h.offset === 'number' ? h.offset : i * 60;
    return (
      '<div class="hr-item">' +
        '<span class="hr-time">' + clockOf(arrivalMs + offset * 60 * 1000) + '</span>' +
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
  if (routeMap) routeMap.setDestination(dest);
  else showShot(dest);
  icons(document);
  paintTimes();
}

/* ---------- 设定目的地（调用 API stub） ---------- */
async function plan(query, silent) {
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
  renderDestination(res.data.destination, res.data.route);
  if (!silent) toast('目的地已设定 · 高德路线与天气已同步', 'ok');
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

/* ---------- 地图图层：在线高德 > 离线真实地图快照 > SVG 示意 ---------- */
const mapCanvas = $('.map-canvas');
const mapArt = $('#mapArt');
const mapShot = $('#mapShot');
const providerEl = $('.map-provider');
let shotId = '';

function setProvider(text, offline) {
  $('#mapProviderText').textContent = text;
  providerEl.classList.toggle('is-offline', Boolean(offline));
}

function clearShot() {
  shotId = '';
  if (!mapShot) return;
  mapShot.hidden = true;
  mapShot.removeAttribute('src');
  mapCanvas.classList.remove('is-shot');
}

/* 离线默认展示真实地图快照，快照缺失才退回 SVG 示意地图 */
function showShot(dest) {
  if (!mapShot || !dest) return;
  if (shotId === dest.id && !mapShot.hidden) return;
  shotId = dest.id;
  mapShot.alt = dest.name + ' · 离线地图';
  mapShot.onload = function () {
    if (routeMap) { clearShot(); return; }
    mapShot.hidden = false;
    mapCanvas.classList.add('is-shot');
    setProvider('离线地图 · 快照', false);
  };
  mapShot.onerror = function () {
    clearShot();
    setProvider('示意图 · 离线', true);
  };
  mapShot.src = 'map/' + dest.id + '.jpg';
}

function zoom(delta) {
  if (routeMap) {
    routeMap.zoomBy(delta > 0 ? 1 : -1);
    return;
  }
  mapScale = Math.min(1.5, Math.max(1, mapScale + delta));
  const layer = mapCanvas.classList.contains('is-shot') ? mapShot : mapArt;
  layer.style.transform = 'scale(' + mapScale.toFixed(2) + ')';
}
$('#zoomIn').addEventListener('click', function () { zoom(0.15); });
$('#zoomOut').addEventListener('click', function () { zoom(-0.15); });

/* ---------- 高德地图：在线时接管地图区；无 Key / 断网 / 超时保留离线快照 ---------- */
async function initMap() {
  routeMap = await mountRouteMap($('#amapMap'), {
    origin: DB.camping.origin,
    destination: current
  });
  if (!routeMap) return;
  /* 容器此前为 0×0：先显示，再让高德重算尺寸，最后规划首条路线 */
  mapCanvas.classList.add('is-amap');
  clearShot();
  routeMap.resize();
  routeMap.setDestination(current);
  setProvider('高德地图 · 实时路况', false);
}
initMap();

/* ---------- 初始状态 ---------- */
renderDestination(current, {
  distance: current.distance,
  duration: current.duration
});

/* 默认目的地静默同步一次真实路线与到达天气（失败时保留 mock 快照） */
plan(current.name, true);

/* 到达时刻与逐时随系统时钟滚动 */
setInterval(paintTimes, 30 * 1000);


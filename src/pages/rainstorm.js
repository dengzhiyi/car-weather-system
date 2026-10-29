/* 高速暴雨辅助 · 雨量联动与辅助开关 */
import '../core/app.js';
import { $, toast, animateNumber } from '../core/dom.js';
import { DB } from '../data/mock.js';
import { Api } from '../api/api.js';
import { rainAssistPlan, canAssist, LEVEL_STRATEGY, MANUAL_FOLLOW_SECONDS } from '../domain/rainstorm.rules.js';

const rs = DB.rainstorm;
const rain = DB.rain;

/* ---------- 传感器等级刻度 ---------- */
$('#rsScale').innerHTML = rain.thresholds.map(function (t, i) {
  const range = t.max == null ? '≥ ' + t.min : '< ' + t.max;
  return (
    '<div class="scale-item' + (i === rain.levelIndex ? ' is-active' : '') + '">' +
      '<span class="scale-bar"></span>' +
      '<span class="scale-name">' + t.name + '</span>' +
      '<span class="scale-range mono">' + range + '</span>' +
    '</div>'
  );
}).join('');

/* ---------- 近 60 分钟趋势 ---------- */
(function drawRainLine() {
  const svg = $('#rainLine');
  const vals = rain.history60m;
  const W = 320, BASE = 82, TOP = 10, MAX = 20;
  const n = vals.length;
  const x = function (i) { return (i / (n - 1)) * W; };
  const y = function (v) { return BASE - (v / MAX) * (BASE - TOP); };
  const pts = vals.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ');
  const area = 'M0,' + BASE + ' L' + vals.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' L') + ' L' + W + ',' + BASE + ' Z';
  const ty = y(16).toFixed(1);
  const lastX = x(n - 1).toFixed(1);
  const lastY = y(vals[n - 1]).toFixed(1);
  svg.innerHTML =
    '<path class="lc-area" d="' + area + '"/>' +
    '<line class="lc-threshold" x1="0" y1="' + ty + '" x2="320" y2="' + ty + '"/>' +
    '<polyline class="lc-line" points="' + pts + '"/>' +
    '<circle class="lc-dot" cx="' + lastX + '" cy="' + lastY + '" r="3.4"/>';
})();

/* ---------- 分级逻辑（策略表由 domain 提供） ---------- */
function renderLogic() {
  const rows = LEVEL_STRATEGY.map(function (rule, i) {
    const t = rain.thresholds[i];
    const range = t.max == null
      ? '≥ ' + t.min
      : t.min === 0 ? '< ' + t.max : t.min + ' – ' + t.max;
    const current = i === rain.levelIndex;
    const speed = rule.speedDelta === 0 ? '限速值' : '−' + Math.abs(rule.speedDelta) + ' km/h';
    return (
      '<div class="lt-row' + (current ? ' is-current' : '') + '">' +
        '<span class="lt-level"><i class="lt-dot"></i>' + t.name + '</span>' +
        '<span class="mono">' + range + ' mm/h</span>' +
        '<b>' + speed + '</b>' +
        '<b>' + rule.followSeconds.toFixed(1) + ' s</b>' +
      '</div>'
    );
  }).join('');
  $('#logicTable').innerHTML =
    '<div class="lt-row lt-head"><span>雨量等级</span><span>区间</span><span>目标车速</span><span>跟车距离</span></div>' + rows;
}
renderLogic();

/* ---------- 事件记录 ---------- */
let events = rs.events.slice();
function renderEvents() {
  $('#eventList').innerHTML = events.slice(0, 5).map(function (e) {
    return (
      '<li data-tone="' + e.tone + '">' +
        '<i class="tl-dot"></i>' +
        '<div class="tl-body">' +
          '<div class="tl-top"><b>' + e.title + '</b><time>' + e.time + '</time></div>' +
          '<p>' + e.desc + '</p>' +
        '</div>' +
      '</li>'
    );
  }).join('');
}
renderEvents();

/* ---------- 辅助开关 ---------- */
const card = $('#assistCard');
const sw = $('#assistSwitch');
const pill = $('#assistStatusPill');
const statusText = $('#assistStatusText');
const speedVal = $('#speedVal');
const speedArc = $('#speedArc');
const speedLimit = $('#speedLimit');
const followVal = $('#followVal');
const gapMeters = $('#gapMeters');
let busy = false;

function nowTime() {
  return new Date().toTimeString().slice(0, 8);
}

function applyState(on, persist) {
  const plan = rainAssistPlan({
    rate: rain.rate,
    thresholds: rain.thresholds,
    speedLimit: DB.vehicle.speedLimit,
    currentSpeed: DB.vehicle.speed,
    enabled: on
  });

  card.classList.toggle('is-on', on);
  sw.setAttribute('aria-checked', String(on));
  pill.classList.toggle('is-ok', on);
  pill.classList.toggle('is-off', !on);
  statusText.textContent = on ? '辅助介入中' : '辅助待命';

  $('#assistState').textContent = on ? '辅助介入中' : '辅助待命';
  $('#assistHint').textContent = on
    ? plan.level + '档 · 策略已同步 ACC'
    : (canAssist(rain.rate, rain.thresholds) ? '雨量达到大雨阈值，可开启辅助' : '当前雨量未达介入阈值');

  animateNumber($('#avSpeed'), plan.targetSpeed, 0);
  $('#avSpeedNote').textContent = on
    ? '−' + Math.abs(plan.speedDelta) + ' km/h · ' + plan.level + '档'
    : '当前限速';
  animateNumber($('#avGap'), plan.followSeconds, 1);
  $('#avGapNote').textContent = on
    ? '+' + (plan.followSeconds - MANUAL_FOLLOW_SECONDS).toFixed(1) + ' s · 安全冗余'
    : '手动模式';

  speedLimit.textContent = on ? plan.targetSpeed : DB.vehicle.speedLimit;
  animateNumber(speedVal, plan.targetSpeed, 0);
  speedArc.setAttribute('stroke-dasharray', plan.gaugePercent.toFixed(1) + ' 100');
  followVal.textContent = plan.followMeters + ' m · ' + plan.followSeconds.toFixed(1) + ' s';
  gapMeters.textContent = plan.followMeters + ' m';
  $('#assistLog').textContent = '最近同步 ' + nowTime() + (on ? ' · 策略生效' : '');

  if (persist) {
    try { localStorage.setItem('cw.assist', on ? '1' : '0'); } catch (e) {}
  }
}

async function toggle() {
  if (busy) return;
  busy = true;
  const next = sw.getAttribute('aria-checked') !== 'true';
  sw.style.opacity = '.6';
  applyState(next, false);
  const res = await Api.setRainAssist({ enabled: next });
  sw.style.opacity = '1';
  applyState(res.data.enabled, true);
  events.unshift({
    time: nowTime(),
    title: res.data.enabled ? '暴雨辅助已开启' : '暴雨辅助已关闭',
    desc: res.data.enabled
      ? '目标车速 ' + res.data.strategy.speedLimit + ' km/h · 跟车 ' + res.data.strategy.followMeters + ' m'
      : '恢复手动模式 · 限速 ' + DB.vehicle.speedLimit + ' km/h',
    tone: res.data.enabled ? 'ok' : 'info'
  });
  renderEvents();
  toast(res.data.enabled ? '暴雨辅助已开启，策略已同步 ACC' : '暴雨辅助已关闭，恢复手动驾驶', res.data.enabled ? 'ok' : 'info');
  busy = false;
}

sw.addEventListener('click', toggle);
sw.addEventListener('keydown', function (e) {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
});

/* 恢复上次状态（持久化演示） */
let saved = false;
try { saved = localStorage.getItem('cw.assist') === '1'; } catch (e) {}
applyState(saved, false);


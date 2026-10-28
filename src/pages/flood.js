/* 气象环境助手 · 山洪预警页 */
import '../core/app.js';
import { $, $$, toast, icons } from '../core/dom.js';
import { Api } from '../api/api.js';
import { evaluateFlood } from '../domain/flood.rules.js';

/* 渲染主函数 */
async function render(mode) {
  const res = await Api.getFloodStatus(mode);
  if (res.code !== 0) return;
  const d = res.data;
  const dest = d.destination;

  /* 双规则研判（domain 纯规则：传感器阈值 + 2h 预报阈值） */
  const s = evaluateFlood({
    sensorRate: d.status.sensorRate,
    forecast: d.status.forecast,
    thresholds: d.thresholds,
    rainLevels: d.rainLevels,
    update: d.status.update
  });

  /* ---------- 风险研判环 ---------- */
  const riskArc = $('#riskArc');
  $('#riskScore').textContent = s.riskScore;
  riskArc.style.strokeDasharray = `${s.riskScore} 100`;
  $('#riskLevel').textContent = s.level;
  $('#riskSummary').textContent = s.summary;
  $('#riskUpdate').textContent = s.update;

  const riskCard = $('#riskCard');
  if (s.alert) riskCard.classList.add('is-high');
  else riskCard.classList.remove('is-high');

  const riskTag = $('#riskTag');
  riskTag.textContent = s.hits === 2 ? '双规则已触发' : s.hits === 1 ? '单规则命中' : '双规则未触发';
  riskTag.className = 'ch-tag tag ' + (s.alert ? 'tag-danger' : 'tag-ok');

  /* ---------- 雨量监测 ---------- */
  $('#monRate').textContent = s.sensorRate.toFixed(1);
  const monLevelPill = $('#monLevel');
  monLevelPill.textContent = s.sensorLevel;
  const levelClasses = ['lv-light', 'lv-mid', 'lv-heavy', 'lv-storm'];
  levelClasses.forEach(function (c) { monLevelPill.classList.remove(c); });
  if (s.sensorLevelIndex > -1) monLevelPill.classList.add(levelClasses[s.sensorLevelIndex]);

  /* ---------- 预报柱 ---------- */
  const barsRoot = $('#forecastBars');
  barsRoot.innerHTML = '';
  const innerH = 84, topPad = 8;
  const maxVal = 70;
  const thresholdVal = d.thresholds.forecastMm;
  d.status.forecast.forEach(function (v) {
    const over = v >= thresholdVal;
    const bar = document.createElement('div');
    bar.className = 'fbar' + (over ? ' is-over' : '');
    bar.style.height = '0px';
    barsRoot.appendChild(bar);
    requestAnimationFrame(function () {
      bar.style.height = Math.max(4, (v / maxVal) * innerH) + 'px';
    });
  });
  const thresholdLine = document.createElement('div');
  thresholdLine.className = 'fc-threshold';
  thresholdLine.style.top = (topPad + innerH - (thresholdVal / maxVal) * innerH) + 'px';
  thresholdLine.innerHTML = '<span>' + thresholdVal + ' mm</span>';
  barsRoot.appendChild(thresholdLine);
  $('#forecastPeak').textContent = s.forecastPeak + ' mm';
  $('#monFootTime').textContent = '更新 ' + s.update;

  /* ---------- 预警规则 ---------- */
  const ruleList = $('#ruleList');
  ruleList.innerHTML = '';
  s.rules.forEach(function (r) {
    const row = document.createElement('div');
    row.className = 'rule-row' + (r.hit ? ' is-hit' : '');
    row.innerHTML =
      '<span class="r-ic" data-icon="' + (r.hit ? 'circle-alert' : 'circle-check') + '"></span>' +
      '<div class="rule-body"><b>' + r.name + '</b><p>' + r.detail + '</p></div>';
    ruleList.appendChild(row);
  });
  icons(ruleList);

  /* ---------- 历史预警 ---------- */
  const historyList = $('#historyList');
  historyList.innerHTML = '';
  d.history.forEach(function (h) {
    const li = document.createElement('li');
    li.innerHTML =
      '<time>' + h.time + '</time>' +
      '<div class="hl-body"><b>' + h.level + ' · ' + h.name + '</b><p>' + h.detail + '</p></div>';
    historyList.appendChild(li);
  });

  /* ---------- 目的地 ---------- */
  $('#destName').textContent = dest.name;
  $('#destCoord').textContent = dest.coord;
  $('#destDistance').textContent = dest.distance;
  $('#destTerrain').textContent = dest.terrain;
  $('#destElevation').textContent = dest.elevation;
  $('#destResponse').textContent = dest.response;

  const destStatus = $('#destStatus');
  destStatus.textContent = s.alert ? '危险' : '安全';
  destStatus.className = 'ch-tag tag ' + (s.alert ? 'tag-danger' : 'tag-ok');

  /* ---------- 头部 pill + banner（由规则判定驱动） ---------- */
  const floodPill = $('#floodPill');
  const floodPillText = $('#floodPillText');
  const alertBanner = $('#alertBanner');
  floodPill.classList.toggle('is-danger', s.alert);
  floodPill.classList.toggle('is-ok', !s.alert);
  floodPillText.textContent = s.level;
  alertBanner.hidden = !s.alert;
  /* 横幅出现时收紧下方卡片，保证 1600×960 一屏仍不溢出 */
  document.body.classList.toggle('is-alert', !!s.alert);
}

/* ---------- 演示 seg 切换 ---------- */
$$('.seg button').forEach(function (btn) {
  btn.addEventListener('click', function () {
    $$('.seg button').forEach(function (b) { b.classList.remove('is-active'); });
    btn.classList.add('is-active');
    render(btn.dataset.mode);
    toast(btn.dataset.mode === 'alert' ? '已切换至暴雨预警演示态' : '已返回常态监测', 'info');
  });
});

/* ---------- 避险按钮 ---------- */
$('#evacBtn').addEventListener('click', function () {
  toast('已规划至最近避险点的路线', 'ok');
});
$('#muteBtn').addEventListener('click', function () {
  $('#alertBanner').hidden = true;
  toast('预警提示已静音', 'info');
});

/* ---------- 首次载入 ---------- */
render('normal');

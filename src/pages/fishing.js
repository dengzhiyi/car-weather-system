/* 车象 WeatherOS · 钓鱼窗口页 */
import '../core/app.js';
import { $, icons, animateNumber } from '../core/dom.js';
import { DB } from '../data/mock.js';
import { Api } from '../api/api.js';

let currentSpot = 'jiangjia';

function toneOf(score) {
  if (score >= 80) return { cls: 'ok', tag: 'tag-ok', pill: 'is-ok', text: '适宜出钓' };
  if (score >= 65) return { cls: 'warn', tag: 'tag-warn', pill: 'is-warn', text: '较为适宜' };
  return { cls: 'caution', tag: 'tag-danger', pill: 'is-danger', text: '谨慎出钓' };
}

/* 气压 24 小时趋势线 */
function drawSpark(values) {
  const W = 280, H = 66, pad = 5;
  const min = Math.min.apply(null, values);
  const max = Math.max.apply(null, values);
  const span = (max - min) || 1;
  const pts = values.map(function (v, i) {
    const x = pad + (i / (values.length - 1)) * (W - pad * 2);
    const y = H - pad - ((v - min) / span) * (H - pad * 2);
    return [x, y];
  });
  const d = pts.map(function (p, i) {
    return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1);
  }).join(' ');
  $('#pLine').setAttribute('d', d);
  $('#pArea').setAttribute('d', d + ' L' + (W - pad).toFixed(1) + ' ' + (H - pad) + ' L' + pad + ' ' + (H - pad) + ' Z');
  const last = pts[pts.length - 1];
  $('#pDot').setAttribute('cx', last[0].toFixed(1));
  $('#pDot').setAttribute('cy', last[1].toFixed(1));
}

function renderSpot(spot) {
  const tone = toneOf(spot.score);

  /* ---------- 评分 ---------- */
  $('#scoreArc').style.strokeDasharray = spot.score + ' 100';
  animateNumber($('#scoreVal'), spot.score, 0, '');
  const rating = $('#scoreRating');
  rating.textContent = spot.rating;
  rating.className = 'score-rating ' + (tone.cls === 'ok' ? '' : 'is-' + tone.cls);
  const tag = $('#scoreTag');
  tag.textContent = tone.text;
  tag.className = 'ch-tag tag ' + tone.tag;
  $('#bestWindow').textContent = spot.bestWindow;
  $('#fishWindowVal').textContent = spot.bestWindow.split('–')[0].trim();

  const pill = $('#fishPill');
  pill.className = 'status-pill ' + tone.pill;
  $('#fishPillText').textContent = tone.text;

  /* ---------- 气压 / 风况 ---------- */
  animateNumber($('#pVal'), spot.pressure, 0, '');
  $('#pDelta').textContent = spot.pressureTrend.replace(' hPa / 24h', ' / 24h');
  $('#pStateTag').textContent = spot.pressureState;
  $('#pStateTag').className = 'ch-tag tag ' + (spot.pressure > 1008 ? 'tag-ok' : 'tag-warn');
  const falling = spot.pressureTrend.indexOf('-') === 0;
  $('#pTrend').textContent = spot.pressureState + (falling ? ' · 鱼口偏弱，建议轻饵慢逗' : ' · 鱼口趋活跃');
  $('#pTrend').className = 'p-trend' + (falling ? ' is-fall' : '');
  drawSpark(spot.pressureHistory);

  $('#windSpeed').textContent = spot.windSpeed.toFixed(1) + ' m/s';
  $('#windDir').textContent = spot.windDir + ' · ' + spot.windLevel;
  $('#windGust').textContent = '阵风 ' + spot.gust.toFixed(1) + ' m/s';
  $('#fishTemp').textContent = spot.temp + ' °C';
  $('#waterTemp').textContent = spot.waterTemp;
  $('#fishCloud').textContent = spot.cloud;

  /* ---------- 时段窗口 ---------- */
  const list = $('#winList');
  list.innerHTML = '';
  spot.windows.forEach(function (w) {
    const best = w.rating === '优';
    const li = document.createElement('li');
    li.className = 'win-row' + (best ? ' is-best' : '');
    li.innerHTML =
      '<span class="win-time">' + w.time + '</span>' +
      '<span class="win-bar"><i style="width:' + w.score + '%"></i></span>' +
      '<span class="win-rating">' + w.rating + '</span>' +
      '<span class="win-note">' + w.note + '</span>';
    list.appendChild(li);
  });

  /* ---------- 建议 ---------- */
  const advice = $('#adviceGrid');
  advice.innerHTML = '';
  spot.advice.forEach(function (a) {
    const block = document.createElement('div');
    block.className = 'advice-block';
    block.innerHTML =
      '<div class="ab-head"><span data-icon="' + a.icon + '"></span>' + a.title + '</div>' +
      '<p class="ab-text">' + a.text + '</p>';
    advice.appendChild(block);
  });
  icons(advice);

  /* ---------- 钓点切换 ---------- */
  const chips = $('#spotChips');
  chips.innerHTML = '';
  DB.fishing.spots.forEach(function (s) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'spot-chip' + (s.id === spot.id ? ' is-active' : '');
    btn.textContent = s.name;
    btn.addEventListener('click', function () {
      if (s.id === currentSpot) return;
      load(s.id);
    });
    chips.appendChild(btn);
  });
}

async function load(spotId) {
  currentSpot = spotId;
  const res = await Api.getFishingWindow(spotId);
  if (res.code !== 0) return;
  renderSpot(res.data.spot);
}

load(currentSpot);


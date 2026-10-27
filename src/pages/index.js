/* 首页 · 气象看板 */
import '../core/app.js';
import { $, icons } from '../core/dom.js';
import { Api } from '../api/api.js';
import { visibilityHintOf, humidityHintOf, rainHintOf } from '../domain/weather.view.js';

function levelClass(i) {
  return ['lv-light', 'lv-mid', 'lv-heavy', 'lv-storm'][i] || 'lv-mid';
}

async function renderDashboard() {
  const res = await Api.getDashboard();
  const d = res.data;

  /* 实况 */
  $('#heroLocation').textContent = d.weather.location;
  $('#heroTemp').textContent = d.weather.temp;
  $('#heroCondition').textContent = d.weather.condition;
  $('#heroFeels').textContent = d.weather.feels + '°';
  $('#heroRainChance').textContent = d.weather.rainChance + '%';
  $('#updatedAt').textContent = d.weather.updatedAt || '14:32:08';
  $('#heroUpdated').textContent = (d.weather.updatedAt || '14:32:08').slice(0, 5);
  const heroIcon = $('#heroIcon');
  heroIcon.setAttribute('data-icon', d.weather.icon);
  heroIcon.removeAttribute('data-icon-ready');
  icons(heroIcon.parentNode);

  /* 未来 2 小时 */
  const hint = rainHintOf(d.forecast2h);
  $('#miniHint').className = 'tag tag-' + hint.tone;
  $('#miniHintText').textContent = hint.text;
  const mini = $('#miniForecast');
  mini.innerHTML = d.forecast2h.map(function (f, i) {
    return (
      '<div class="mini-item' + (i === 0 ? ' is-now' : '') + '">' +
        '<span class="mi-time">' + f.time + '</span>' +
        '<span class="mi-ic" data-icon="' + f.icon + '"></span>' +
        '<span class="mi-temp">' + f.temp + '°</span>' +
        '<span class="mi-rain"><span data-icon="droplets"></span>' + f.rain + '%</span>' +
      '</div>'
    );
  }).join('');

  /* 雨量传感器 */
  $('#rainRate').textContent = d.rain.rate.toFixed(1);
  $('#rainLevel').textContent = d.rain.level;
  $('#rainLevel').className = 'level-pill ' + levelClass(d.rain.levelIndex);
  $('#rainDelta').textContent = '+' + d.rain.delta10m.toFixed(1) + ' mm';
  $('#rainTotal').textContent = d.rain.cumulative.toFixed(1) + ' mm';

  const scale = $('#rainScale');
  scale.innerHTML = d.rain.thresholds.map(function (t, i) {
    const range = t.max == null ? '≥ ' + t.min : '< ' + t.max;
    return (
      '<div class="scale-item' + (i === d.rain.levelIndex ? ' is-active' : '') + '">' +
        '<span class="scale-bar"></span>' +
        '<span class="scale-name">' + t.name + '</span>' +
        '<span class="scale-range mono">' + range + '</span>' +
      '</div>'
    );
  }).join('');

  const bars = $('#rainBars');
  const list = d.rain.history30m;
  const max = 16;
  bars.innerHTML = list.map(function (v) {
    const h = Math.max(8, Math.min(100, (v / max) * 100));
    const cls = v >= 16 ? 'is-danger' : v >= 8 ? 'is-heavy' : v >= 2.5 ? 'is-mid' : 'is-light';
    return '<span class="bar ' + cls + '" style="height:' + h.toFixed(1) + '%"></span>';
  }).join('');

  /* 行车环境 */
  $('#envWind').textContent = d.weather.windSpeed;
  $('#envWindHint').textContent = d.weather.wind;
  $('#envPressure').textContent = d.weather.pressure;
  const trend = $('#envPressureTrend');
  trend.textContent = (d.weather.pressureTrend > 0 ? '+' : '') + d.weather.pressureTrend;
  trend.className = d.weather.pressureTrend < 0 ? 'down' : '';
  $('#envVisibility').textContent = d.weather.visibility;
  $('#envVisibilityHint').textContent = visibilityHintOf(d.weather.visibility);
  $('#envHumidity').textContent = d.weather.humidity;
  $('#envHumidityHint').textContent = humidityHintOf(d.weather.humidity);

  /* 功能入口 */
  const grid = $('#featureGrid');
  grid.innerHTML = d.features.map(function (f) {
    return (
      '<a class="feature-card" href="' + f.href + '" data-tone="' + f.tone + '">' +
        '<div class="fc-top">' +
          '<span class="fc-icon" data-icon="' + f.icon + '"></span>' +
          '<span class="fc-no mono">' + f.no + '</span>' +
          '<span class="fc-arrow" data-icon="arrow-up-right"></span>' +
        '</div>' +
        '<div class="fc-name">' + f.name + '</div>' +
        '<div class="fc-metric">' + f.metric + '</div>' +
        '<div class="fc-sub">' + f.sub + '</div>' +
        '<div class="fc-foot">' +
          '<span class="tag tag-' + f.tone + '">' + f.status + '</span>' +
          '<span class="fc-link">进入<span data-icon="chevron-right"></span></span>' +
        '</div>' +
      '</a>'
    );
  }).join('');

  icons(document);
}

renderDashboard();

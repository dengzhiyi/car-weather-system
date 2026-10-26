/* 高速暴雨辅助 · 雨量联动与辅助开关 */
(function () {
  const { $, toast, animateNumber } = CW;
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

  /* ---------- 分级逻辑 ---------- */
  function renderLogic() {
    const rows = rs.response.map(function (r) {
      const current = r.index === rain.levelIndex;
      return (
        '<div class="lt-row' + (current ? ' is-current' : '') + '">' +
          '<span class="lt-level"><i class="lt-dot"></i>' + r.level + '</span>' +
          '<span class="mono">' + r.range + '</span>' +
          '<b>' + r.speed + '</b>' +
          '<b>' + r.gap + '</b>' +
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
    card.classList.toggle('is-on', on);
    sw.setAttribute('aria-checked', String(on));
    pill.classList.toggle('is-ok', on);
    pill.classList.toggle('is-off', !on);
    statusText.textContent = on ? '辅助介入中' : '辅助待命';

    $('#assistState').textContent = on ? '辅助介入中' : '辅助待命';
    $('#assistHint').textContent = on ? '大雨档 · 策略已同步 ACC' : '雨量达到大雨阈值，可开启辅助';
    animateNumber($('#avSpeed'), on ? rs.targetSpeed : DB.vehicle.speedLimit, 0);
    $('#avSpeedNote').textContent = on ? '−20 km/h · 大雨档' : '当前限速';
    animateNumber($('#avGap'), on ? rs.targetGap : 2.0, 1);
    $('#avGapNote').textContent = on ? '+1.8 s · 安全冗余' : '手动模式';

    speedLimit.textContent = on ? rs.targetSpeed : DB.vehicle.speedLimit;
    const targetSpeed = on ? 82 : 96;
    const targetFollow = on ? '88 m · 3.8 s' : '62 m · 2.3 s';
    const targetGap = on ? '88 m' : '62 m';
    animateNumber(speedVal, targetSpeed, 0);
    speedArc.setAttribute('stroke-dasharray', ((targetSpeed / 120) * 100).toFixed(1) + ' 100');
    followVal.textContent = targetFollow;
    gapMeters.textContent = targetGap;
    $('#assistLog').textContent = 'RS-04 · 最近同步 ' + nowTime() + (on ? ' · 策略生效' : '');

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
      desc: res.data.enabled ? '目标车速 80 km/h · 跟车距离 3.8 s' : '恢复手动模式 · 限速 100 km/h',
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
})();

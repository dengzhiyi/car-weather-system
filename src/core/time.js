/* 系统时钟工具
   界面上所有「更新 / 预计到达 / 逐时」时间统一按本机时间推算，
   天气数值仍由数据源（实时接口或 mock 快照）提供。 */

function pad(n) {
  return String(n).padStart(2, '0');
}

/* 时间戳 / Date → HH:MM */
function clockOf(value) {
  const d = value == null ? new Date() : new Date(value);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

/* 时间戳 / Date → HH:MM:SS */
function clockSecondsOf(value) {
  const d = value == null ? new Date() : new Date(value);
  return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
}

/* 路线时长文案 → 分钟数："32 分" / "1 小时 05 分" / "44 分" */
function minutesOfDuration(text) {
  const s = String(text || '');
  const hours = /(\d+)\s*小时/.exec(s);
  const minutes = /(\d+)\s*分/.exec(s);
  return (hours ? Number(hours[1]) * 60 : 0) + (minutes ? Number(minutes[1]) : 0);
}

export { clockOf, clockSecondsOf, minutesOfDuration };

/**
 * 天气要素 → 界面展示口径的换算规则（纯函数）
 * 天气接口只提供 wd10m / ws10m / t2m / rh2m / psz / tp 六要素，
 * 云量、体感温度、能见度、降水概率不在订阅范围内，这里按经验口径近似，
 * 仅用于展示，不参与任何预警判定。
 */

const WIND_DIRECTIONS = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];

/* 蒲福风级上限（按 10 米风速 m/s） */
const BEAUFORT_LIMITS = [0.3, 1.6, 3.4, 5.5, 8.0, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];

/* 风向角 → 八方位名称 */
function windDirectionOf(deg) {
  const value = ((Number(deg) || 0) % 360 + 360) % 360;
  return WIND_DIRECTIONS[Math.round(value / 45) % 8];
}

/* 风速 → 蒲福风级 */
function windLevelOf(speed) {
  const value = Math.max(0, Number(speed) || 0);
  for (let i = 0; i < BEAUFORT_LIMITS.length; i += 1) {
    if (value < BEAUFORT_LIMITS[i]) return i;
  }
  return 12;
}

/* 风况文案：东南风 3 级 */
function windTextOf(deg, speed) {
  return windDirectionOf(deg) + ' ' + windLevelOf(speed) + ' 级';
}

/* 降水强度 → 天气现象与图标（无云量要素，按降水强度近似） */
function skyOf(rainRate, humidity) {
  const rate = Number(rainRate) || 0;
  const rh = Number(humidity) || 0;
  if (rate >= 8) return { condition: '大雨', icon: 'cloud-rain' };
  if (rate >= 2.5) return { condition: '中雨', icon: 'cloud-rain' };
  if (rate >= 0.1) return { condition: '小雨', icon: 'cloud-drizzle' };
  if (rh >= 85) return { condition: '阴', icon: 'cloud' };
  if (rh >= 70) return { condition: '多云', icon: 'cloud-sun' };
  return { condition: '晴', icon: 'sun' };
}

/* 降水强度 → 降水概率（接口未提供概率，按强度映射；<0.02 mm/h 视为无降水） */
function rainChanceOf(rainRate) {
  const rate = Number(rainRate) || 0;
  if (rate >= 4) return 95;
  if (rate >= 1.5) return 85;
  if (rate >= 0.5) return 70;
  if (rate >= 0.1) return 55;
  if (rate >= 0.02) return 40;
  return 10;
}

/* 体感温度：高温高湿上调、大风下调 */
function feelsOf(temp, humidity, windSpeed) {
  const t = Number(temp) || 0;
  const rh = Number(humidity) || 0;
  const ws = Number(windSpeed) || 0;
  let feels = t;
  if (t >= 26 && rh >= 70) feels += Math.min(4, (rh - 70) / 10);
  if (ws >= 4) feels -= Math.min(3, (ws - 4) / 2);
  return Math.round(feels);
}

/* 能见度估算（km）：湿度与降水强度衰减 */
function visibilityOf(humidity, rainRate) {
  const rh = Number(humidity) || 0;
  const rate = Number(rainRate) || 0;
  let km = 20;
  if (rh > 90) km -= (rh - 90) * 0.35;
  else if (rh > 80) km -= (rh - 80) * 0.2;
  if (rate > 0.1) km -= Math.min(12, rate * 2.2);
  return Math.max(0.5, Math.round(km * 10) / 10);
}

/* 能见度 → 行车提示 */
function visibilityHintOf(km) {
  const value = Number(km) || 0;
  if (value >= 10) return '良好 · 可视距离充足';
  if (value >= 5) return '一般 · 注意车距';
  if (value >= 2) return '较差 · 减速慢行';
  return '极差 · 建议就近停靠';
}

/* 湿度 → 车内环境提示 */
function humidityHintOf(humidity) {
  const value = Number(humidity) || 0;
  if (value >= 85) return '很高 · 车窗易起雾';
  if (value >= 70) return '偏高 · 车窗易起雾';
  if (value >= 40) return '适中';
  return '干燥 · 注意补水';
}

/* 未来 2 小时预报 → 降水临近提示（取降水概率最高的一档） */
function rainHintOf(forecast) {
  const list = forecast || [];
  if (!list.length) return { text: '暂无降水预报', tone: 'ok' };
  let peak = list[0];
  for (let i = 1; i < list.length; i += 1) {
    if (list[i].rain > peak.rain) peak = list[i];
  }
  if (peak.rain >= 70) return { text: peak.time + ' 雷雨临近', tone: 'warn' };
  if (peak.rain >= 40) return { text: peak.time + ' 有阵雨可能', tone: 'info' };
  return { text: '2 小时内无明显降水', tone: 'ok' };
}

/* 气压趋势（hPa）：未来值 − 当前值 */
function pressureTrendOf(nowPressure, futurePressure) {
  const delta = (Number(futurePressure) || 0) - (Number(nowPressure) || 0);
  return Math.round(delta * 10) / 10;
}

export {
  windDirectionOf,
  windLevelOf,
  windTextOf,
  skyOf,
  rainChanceOf,
  feelsOf,
  visibilityOf,
  visibilityHintOf,
  humidityHintOf,
  rainHintOf,
  pressureTrendOf
};

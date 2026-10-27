/**
 * 钓鱼窗口规则（纯函数）
 * 由气压水平、24h 气压趋势、风速与阵风给出 0–100 评分与出钓评级。
 * 不触碰 DOM、网络、存储。
 */

/* 评分权重：60 基准分 + 气压 20 + 趋势 14 − 风速惩罚 12 − 阵风惩罚 8 */
const BASE_SCORE = 60;
const PRESSURE_WEIGHT = 20;
const TREND_WEIGHT = 14;
const WIND_PENALTY = 12;
const GUST_PENALTY = 8;

/* 评级阈值 */
const RATING_GOOD = 80;
const RATING_FAIR = 65;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * 气压状态：趋势 ≥ +2 回升，≤ −2 下降，其余稳定
 * @param {number} trend 24h 气压变化 hPa
 */
function pressureStateOf(trend) {
  const value = Number(trend) || 0;
  if (value >= 2) return { label: '持续回升', falling: false, note: '鱼口趋活跃' };
  if (value <= -2) return { label: '缓慢下降', falling: true, note: '鱼口偏弱，建议轻饵慢逗' };
  return { label: '基本稳定', falling: false, note: '鱼口趋活跃' };
}

/**
 * 出钓评分与评级
 * @param {object} input
 * @param {number} input.pressure      气压 hPa
 * @param {number} input.pressureTrend 24h 气压变化 hPa
 * @param {number} input.windSpeed     风速 m/s
 * @param {number} input.gust          阵风 m/s
 */
function fishingScore(input) {
  const pressure = Number(input.pressure) || 0;
  const trend = Number(input.pressureTrend) || 0;
  const windSpeed = Number(input.windSpeed) || 0;
  const gust = Number(input.gust) || 0;

  const pressureFactor = clamp((pressure - 1000) / 12, 0, 1);
  const trendFactor = clamp(trend / 4, -1, 1);
  const windLoss = clamp((windSpeed - 2) / 4, 0, 1) * WIND_PENALTY;
  const gustLoss = clamp((gust - 4) / 5, 0, 1) * GUST_PENALTY;

  const score = clamp(
    Math.round(
      BASE_SCORE + PRESSURE_WEIGHT * pressureFactor + TREND_WEIGHT * trendFactor - windLoss - gustLoss
    ),
    0,
    100
  );

  let rating = '谨慎出钓';
  let tone = 'caution';
  if (score >= RATING_GOOD) {
    rating = '适宜垂钓';
    tone = 'ok';
  } else if (score >= RATING_FAIR) {
    rating = '较为适宜';
    tone = 'warn';
  }

  return { score: score, rating: rating, tone: tone };
}

export { fishingScore, pressureStateOf, RATING_GOOD, RATING_FAIR };

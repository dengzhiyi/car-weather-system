/**
 * 山洪预警规则（纯函数）
 * 双规则：① 雨量传感器 ≥ 流域暴雨阈值；② 未来 2 小时预报峰值 ≥ 阈值。
 * 任一触发即预警，两条同时触发为高风险。
 * 不触碰 DOM、网络、存储。
 */
import { rainLevelOf } from './rain.js';

/* 演示用流域阈值：瞬时面雨量与 2h 累计雨量 */
const DEFAULT_THRESHOLDS = { stormRate: 50, forecastMm: 50 };

/* 风险分模型：基础 19 + 传感器占阈值比 × 45 + 预报占阈值比 × 24，各占比封顶 1，总分封顶 100 */
const SCORE_BASE = 19;
const SCORE_SENSOR_WEIGHT = 45;
const SCORE_FORECAST_WEIGHT = 24;

/* 触发规则数 → 风险等级 */
const LEVELS = ['低风险', '中风险', '高风险'];

function summaryOf(hits, sensorHit, peak) {
  if (hits === 2) {
    return '雨量传感器已超暴雨阈值，且未来 2 小时流域累计降水 ' + peak + ' mm，触发双规则预警。';
  }
  if (sensorHit) return '雨量传感器已超暴雨阈值，需持续关注未来 2 小时预报变化。';
  if (hits === 1) return '未来 2 小时流域累计降水预计 ' + peak + ' mm，需提前确认避险路线。';
  return '当前流域降水平稳，传感器与预报均未达到预警阈值。';
}

/**
 * 评估山洪风险
 * @param {object} input
 * @param {number}  input.sensorRate   雨量传感器瞬时值 mm/h
 * @param {number[]} input.forecast    未来 2 小时逐段降水 mm
 * @param {{stormRate:number, forecastMm:number}} [input.thresholds]
 * @param {Array}   [input.rainLevels] 雨量等级阈值表，用于推导传感器等级
 * @param {string}  [input.update]     数据更新时间
 */
function evaluateFlood(input) {
  const thresholds = input.thresholds || DEFAULT_THRESHOLDS;
  const forecast = input.forecast || [];
  const sensorRate = Number(input.sensorRate) || 0;
  const peak = forecast.length ? Math.max.apply(null, forecast) : 0;

  const sensorRatio = thresholds.stormRate ? sensorRate / thresholds.stormRate : 0;
  const forecastRatio = thresholds.forecastMm ? peak / thresholds.forecastMm : 0;
  const sensorHit = sensorRatio >= 1;
  const forecastHit = forecastRatio >= 1;

  const rules = [
    {
      id: 'sensor',
      name: '雨量传感器 > 暴雨阈值',
      hit: sensorHit,
      detail: '当前 ' + sensorRate.toFixed(1) + ' mm/h / 阈值 ' + thresholds.stormRate + ' mm/h'
    },
    {
      id: 'forecast',
      name: '未来 2 小时暴雨预报',
      hit: forecastHit,
      detail: '预计 2h 累计 ' + peak + ' mm / 阈值 ' + thresholds.forecastMm + ' mm'
    }
  ];

  const hits = (sensorHit ? 1 : 0) + (forecastHit ? 1 : 0);
  const level = LEVELS[Math.min(hits, LEVELS.length - 1)];
  const sensorLevel = input.rainLevels ? rainLevelOf(sensorRate, input.rainLevels) : null;
  const riskScore = Math.min(
    100,
    Math.floor(
      SCORE_BASE +
        SCORE_SENSOR_WEIGHT * Math.min(1, sensorRatio) +
        SCORE_FORECAST_WEIGHT * Math.min(1, forecastRatio)
    )
  );

  return {
    riskScore: riskScore,
    hits: hits,
    alert: hits > 0,
    level: level,
    summary: summaryOf(hits, sensorHit, peak),
    rules: rules,
    forecastPeak: peak,
    sensorRate: sensorRate,
    sensorLevel: sensorLevel ? sensorLevel.name : '',
    sensorLevelIndex: sensorLevel ? sensorLevel.index : -1,
    update: input.update || ''
  };
}

export { evaluateFlood, DEFAULT_THRESHOLDS, LEVELS };

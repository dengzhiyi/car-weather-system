/**
 * 高速暴雨辅助规则（纯函数）
 * 输入雨量瞬时值与车辆限速，输出目标车速 / 跟车时距 / 跟车距离。
 * 不触碰 DOM、网络、存储。
 */
import { rainLevelOf } from './rain.js';

/* 各雨量等级的辅助策略：车速增量（相对限速）与跟车时距（秒） */
const LEVEL_STRATEGY = [
  { speedDelta: 0, followSeconds: 2.0, notice: '限速行驶，保持常规车距' },
  { speedDelta: -10, followSeconds: 2.5, notice: '中雨档 · 车速下调 10 km/h' },
  { speedDelta: -20, followSeconds: 3.8, notice: '大雨档 · 车速下调 20 km/h' },
  { speedDelta: -30, followSeconds: 4.5, notice: '暴雨档 · 车速下调 30 km/h' }
];

/* 关闭辅助时的手动跟车时距 */
const MANUAL_FOLLOW_SECONDS = 2.3;

/* 车速表盘满量程 */
const SPEED_GAUGE_MAX = 120;

/* 辅助介入的最低雨量等级：大雨（索引 2） */
const ASSIST_MIN_LEVEL = 2;

/**
 * 跟车距离（米）= 车速(m/s) × 时距(s)
 * @param {number} speedKmh
 * @param {number} seconds
 */
function followMeters(speedKmh, seconds) {
  return Math.round((speedKmh / 3.6) * seconds);
}

/**
 * 是否达到辅助介入条件
 * @param {number} rate 瞬时雨量 mm/h
 * @param {Array} thresholds 雨量阈值表
 */
function canAssist(rate, thresholds) {
  return rainLevelOf(rate, thresholds).index >= ASSIST_MIN_LEVEL;
}

/**
 * 计算暴雨辅助策略
 * @param {object} input
 * @param {number} input.rate       瞬时雨量 mm/h
 * @param {Array}  input.thresholds 雨量阈值表
 * @param {number} input.speedLimit 路段限速 km/h
 * @param {number} input.currentSpeed 当前车速 km/h
 * @param {boolean} input.enabled   辅助是否开启
 */
function rainAssistPlan(input) {
  const level = rainLevelOf(input.rate, input.thresholds);
  const rule = LEVEL_STRATEGY[Math.min(level.index, LEVEL_STRATEGY.length - 1)];
  const enabled = !!input.enabled;
  const targetSpeed = enabled
    ? Math.max(0, input.speedLimit + rule.speedDelta)
    : input.currentSpeed;
  const followSeconds = enabled ? rule.followSeconds : MANUAL_FOLLOW_SECONDS;

  return {
    enabled: enabled,
    levelIndex: level.index,
    level: level.name,
    speedDelta: enabled ? rule.speedDelta : 0,
    targetSpeed: targetSpeed,
    followSeconds: followSeconds,
    followMeters: followMeters(targetSpeed, followSeconds),
    gaugePercent: Math.min(100, (targetSpeed / SPEED_GAUGE_MAX) * 100),
    notice: enabled ? rule.notice : '手动模式 · 未介入辅助'
  };
}

export {
  rainAssistPlan,
  canAssist,
  followMeters,
  LEVEL_STRATEGY,
  MANUAL_FOLLOW_SECONDS,
  SPEED_GAUGE_MAX
};

import { describe, it, expect } from 'vitest';
import {
  rainAssistPlan,
  canAssist,
  followMeters,
  LEVEL_STRATEGY,
  MANUAL_FOLLOW_SECONDS,
  SPEED_GAUGE_MAX
} from '../src/domain/rainstorm.rules.js';

const THRESHOLDS = [
  { name: '小雨', min: 0, max: 2.5 },
  { name: '中雨', min: 2.5, max: 8 },
  { name: '大雨', min: 8, max: 16 },
  { name: '暴雨', min: 16, max: null }
];

const base = { thresholds: THRESHOLDS, speedLimit: 100, currentSpeed: 96 };

describe('rainAssistPlan · 雨量等级', () => {
  it('按阈值边界划分等级（min 含、max 不含）', () => {
    const level = (rate) => rainAssistPlan({ ...base, rate, enabled: true }).level;
    expect(level(0)).toBe('小雨');
    expect(level(2.49)).toBe('小雨');
    expect(level(2.5)).toBe('中雨');
    expect(level(7.99)).toBe('中雨');
    expect(level(8)).toBe('大雨');
    expect(level(15.99)).toBe('大雨');
    expect(level(16)).toBe('暴雨');
    expect(level(52.4)).toBe('暴雨');
  });

  it('达到大雨（索引 2）才允许介入辅助', () => {
    expect(canAssist(7.99, THRESHOLDS)).toBe(false);
    expect(canAssist(8, THRESHOLDS)).toBe(true);
    expect(canAssist(12.6, THRESHOLDS)).toBe(true);
  });
});

describe('rainAssistPlan · 开关状态', () => {
  it('开启时按等级下调车速并拉长跟车时距', () => {
    const plan = rainAssistPlan({ ...base, rate: 12.6, enabled: true });
    expect(plan.levelIndex).toBe(2);
    expect(plan.level).toBe('大雨');
    expect(plan.speedDelta).toBe(-20);
    expect(plan.targetSpeed).toBe(80);
    expect(plan.followSeconds).toBe(3.8);
    expect(plan.followMeters).toBe(84);
  });

  it('关闭时回到当前车速与手动跟车时距', () => {
    const plan = rainAssistPlan({ ...base, rate: 12.6, enabled: false });
    expect(plan.enabled).toBe(false);
    expect(plan.speedDelta).toBe(0);
    expect(plan.targetSpeed).toBe(96);
    expect(plan.followSeconds).toBe(MANUAL_FOLLOW_SECONDS);
    expect(plan.followMeters).toBe(61);
    expect(plan.notice).toContain('手动模式');
  });

  it('四级策略的车速增量与时距逐级递增', () => {
    const rates = [1, 4, 12, 30];
    const plans = rates.map((rate) => rainAssistPlan({ ...base, rate, enabled: true }));
    expect(plans.map((p) => p.speedDelta)).toEqual([0, -10, -20, -30]);
    expect(plans.map((p) => p.followSeconds)).toEqual([2.0, 2.5, 3.8, 4.5]);
    expect(plans.map((p) => p.targetSpeed)).toEqual([100, 90, 80, 70]);
  });

  it('表盘百分比按 120 km/h 满量程封顶', () => {
    const plan = rainAssistPlan({ ...base, rate: 30, enabled: true, speedLimit: 150 });
    expect(plan.targetSpeed).toBe(120);
    expect(plan.gaugePercent).toBe(100);
    expect(SPEED_GAUGE_MAX).toBe(120);
  });

  it('策略表长度与雨量等级数一致', () => {
    expect(LEVEL_STRATEGY).toHaveLength(THRESHOLDS.length);
  });

  it('跟车距离按时速与时距换算', () => {
    expect(followMeters(96, 2.3)).toBe(61);
    expect(followMeters(80, 3.8)).toBe(84);
    expect(followMeters(0, 4.5)).toBe(0);
  });
});

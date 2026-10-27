import { describe, it, expect } from 'vitest';
import { evaluateFlood, DEFAULT_THRESHOLDS, LEVELS } from '../src/domain/flood.rules.js';

const RAIN_LEVELS = [
  { name: '小雨', min: 0, max: 2.5 },
  { name: '中雨', min: 2.5, max: 8 },
  { name: '大雨', min: 8, max: 16 },
  { name: '暴雨', min: 16, max: null }
];

const base = {
  thresholds: DEFAULT_THRESHOLDS,
  rainLevels: RAIN_LEVELS,
  update: '14:32:08'
};

describe('evaluateFlood · 常态', () => {
  const result = evaluateFlood({ ...base, sensorRate: 12.6, forecast: [2, 4, 7, 9] });

  it('双规则均未触发', () => {
    expect(result.hits).toBe(0);
    expect(result.alert).toBe(false);
    expect(result.rules.map((r) => r.hit)).toEqual([false, false]);
  });

  it('风险分与等级落在低风险区间', () => {
    expect(result.riskScore).toBe(34);
    expect(result.level).toBe('低风险');
    expect(result.summary).toContain('均未达到预警阈值');
  });

  it('预报峰值与传感器等级由原始值推导', () => {
    expect(result.forecastPeak).toBe(9);
    expect(result.sensorLevel).toBe('大雨');
  });
});

describe('evaluateFlood · 预警', () => {
  const result = evaluateFlood({ ...base, sensorRate: 52.4, forecast: [18, 32, 46, 68], update: '14:36:20' });

  it('双规则同时触发为高风险', () => {
    expect(result.hits).toBe(2);
    expect(result.alert).toBe(true);
    expect(result.rules.map((r) => r.hit)).toEqual([true, true]);
    expect(result.level).toBe('高风险');
    expect(result.riskScore).toBe(88);
  });

  it('摘要包含双规则与预报累计值', () => {
    expect(result.summary).toContain('双规则预警');
    expect(result.summary).toContain('68 mm');
  });

  it('传感器等级随雨量切换', () => {
    expect(result.sensorLevel).toBe('暴雨');
  });

  it('规则详情带上当前值与阈值', () => {
    expect(result.rules[0].detail).toBe('当前 52.4 mm/h / 阈值 50 mm/h');
    expect(result.rules[1].detail).toBe('预计 2h 累计 68 mm / 阈值 50 mm');
  });
});

describe('evaluateFlood · 单规则', () => {
  it('仅传感器超阈值 → 中风险并预警', () => {
    const result = evaluateFlood({ ...base, sensorRate: 50, forecast: [0, 0, 0, 0] });
    expect(result.hits).toBe(1);
    expect(result.alert).toBe(true);
    expect(result.level).toBe('中风险');
    expect(result.summary).toContain('传感器已超暴雨阈值');
  });

  it('仅预报超阈值 → 中风险并预警', () => {
    const result = evaluateFlood({ ...base, sensorRate: 0, forecast: [0, 0, 0, 50] });
    expect(result.hits).toBe(1);
    expect(result.alert).toBe(true);
    expect(result.level).toBe('中风险');
    expect(result.summary).toContain('需提前确认避险路线');
  });

  it('阈值边界含等号', () => {
    expect(evaluateFlood({ ...base, sensorRate: 50, forecast: [] }).rules[0].hit).toBe(true);
    expect(evaluateFlood({ ...base, sensorRate: 49.9, forecast: [] }).rules[0].hit).toBe(false);
    expect(evaluateFlood({ ...base, sensorRate: 0, forecast: [50] }).rules[1].hit).toBe(true);
  });
});

describe('evaluateFlood · 数据健壮性', () => {
  it('预报为空时峰值为 0 且不触发预报规则', () => {
    const result = evaluateFlood({ ...base, sensorRate: 0, forecast: [] });
    expect(result.forecastPeak).toBe(0);
    expect(result.rules[1].hit).toBe(false);
    expect(result.riskScore).toBe(19);
  });

  it('缺失阈值时使用默认流域阈值', () => {
    const result = evaluateFlood({ sensorRate: 52.4, forecast: [68] });
    expect(result.rules[0].hit).toBe(true);
    expect(result.rules[1].hit).toBe(true);
  });

  it('等级表覆盖 0 / 1 / 2 条命中', () => {
    expect(LEVELS).toHaveLength(3);
    expect(LEVELS[0]).toBe('低风险');
  });
});

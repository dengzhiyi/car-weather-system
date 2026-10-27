import { describe, it, expect } from 'vitest';
import { fishingScore, pressureStateOf, RATING_GOOD, RATING_FAIR } from '../src/domain/fishing.rules.js';

/* 三个演示钓点的原始气象读数（与 mock 保持一致） */
const SPOTS = [
  { id: 'jiangjia', pressure: 1012, pressureTrend: 3.2, windSpeed: 3.2, gust: 5.4 },
  { id: 'jieshou', pressure: 1009, pressureTrend: 0.4, windSpeed: 4.1, gust: 6.2 },
  { id: 'zitong', pressure: 1004, pressureTrend: -2.6, windSpeed: 2.1, gust: 3.4 }
];

describe('fishingScore · 出钓评级', () => {
  it('气压高、回升、风小 → 适宜垂钓', () => {
    const result = fishingScore(SPOTS[0]);
    expect(result.score).toBe(85);
    expect(result.rating).toBe('适宜垂钓');
    expect(result.tone).toBe('ok');
  });

  it('气压与趋势一般、风偏大 → 较为适宜', () => {
    const result = fishingScore(SPOTS[1]);
    expect(result.score).toBe(67);
    expect(result.rating).toBe('较为适宜');
    expect(result.tone).toBe('warn');
  });

  it('气压低且持续下降 → 谨慎出钓', () => {
    const result = fishingScore(SPOTS[2]);
    expect(result.score).toBe(57);
    expect(result.rating).toBe('谨慎出钓');
    expect(result.tone).toBe('caution');
  });

  it('评级阈值与分数一致', () => {
    expect(fishingScore({ pressure: 1012, pressureTrend: 4, windSpeed: 2, gust: 4 }).score)
      .toBeGreaterThanOrEqual(RATING_GOOD);
    expect(RATING_FAIR).toBeLessThan(RATING_GOOD);
  });
});

describe('fishingScore · 因子单调性', () => {
  const baseInput = { pressure: 1010, pressureTrend: 1, windSpeed: 2.5, gust: 4 };

  it('风速越大评分越低', () => {
    const calm = fishingScore(baseInput).score;
    const windy = fishingScore({ ...baseInput, windSpeed: 8 }).score;
    expect(windy).toBeLessThan(calm);
  });

  it('阵风越大评分越低', () => {
    const low = fishingScore(baseInput).score;
    const gusty = fishingScore({ ...baseInput, gust: 12 }).score;
    expect(gusty).toBeLessThan(low);
  });

  it('气压越高评分越高', () => {
    const low = fishingScore({ ...baseInput, pressure: 1002 }).score;
    const high = fishingScore({ ...baseInput, pressure: 1014 }).score;
    expect(high).toBeGreaterThan(low);
  });

  it('趋势由降转升评分提高', () => {
    const falling = fishingScore({ ...baseInput, pressureTrend: -3 }).score;
    const rising = fishingScore({ ...baseInput, pressureTrend: 3 }).score;
    expect(rising).toBeGreaterThan(falling);
  });

  it('评分恒定落在 0–100', () => {
    const worst = fishingScore({ pressure: 900, pressureTrend: -20, windSpeed: 30, gust: 30 });
    const best = fishingScore({ pressure: 1050, pressureTrend: 20, windSpeed: 0, gust: 0 });
    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(best.score).toBeLessThanOrEqual(100);
  });
});

describe('pressureStateOf · 气压状态', () => {
  it('按 ±2 hPa/24h 划分状态', () => {
    expect(pressureStateOf(2).label).toBe('持续回升');
    expect(pressureStateOf(1.99).label).toBe('基本稳定');
    expect(pressureStateOf(-1.99).label).toBe('基本稳定');
    expect(pressureStateOf(-2).label).toBe('缓慢下降');
  });

  it('下降状态给出对应文案与标记', () => {
    expect(pressureStateOf(-2.6)).toMatchObject({ falling: true, note: '鱼口偏弱，建议轻饵慢逗' });
    expect(pressureStateOf(3.2)).toMatchObject({ falling: false, note: '鱼口趋活跃' });
  });
});

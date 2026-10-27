import { describe, it, expect } from 'vitest';
import {
  windDirectionOf,
  windLevelOf,
  windTextOf,
  skyOf,
  rainChanceOf,
  feelsOf,
  visibilityOf,
  pressureTrendOf,
  visibilityHintOf,
  humidityHintOf,
  rainHintOf
} from '../src/domain/weather.view.js';

describe('windDirectionOf', () => {
  it('八个方位按 45 度分段命名', () => {
    expect(windDirectionOf(0)).toBe('北风');
    expect(windDirectionOf(45)).toBe('东北风');
    expect(windDirectionOf(90)).toBe('东风');
    expect(windDirectionOf(135)).toBe('东南风');
    expect(windDirectionOf(180)).toBe('南风');
    expect(windDirectionOf(225)).toBe('西南风');
    expect(windDirectionOf(270)).toBe('西风');
    expect(windDirectionOf(315)).toBe('西北风');
  });

  it('边界与越界角度归一到最近的方位', () => {
    expect(windDirectionOf(359)).toBe('北风');
    expect(windDirectionOf(360)).toBe('北风');
    expect(windDirectionOf(-45)).toBe('西北风');
  });
});

describe('windLevelOf', () => {
  it('按蒲福风级上限分段，边界取上一级', () => {
    expect(windLevelOf(0.2)).toBe(0);
    expect(windLevelOf(0.3)).toBe(1);
    expect(windLevelOf(1.5)).toBe(1);
    expect(windLevelOf(1.6)).toBe(2);
    expect(windLevelOf(5.4)).toBe(3);
    expect(windLevelOf(5.5)).toBe(4);
    expect(windLevelOf(32.7)).toBe(12);
  });

  it('负值视为静风', () => {
    expect(windLevelOf(-3)).toBe(0);
  });
});

describe('windTextOf', () => {
  it('组合出方位与级数文案', () => {
    expect(windTextOf(135, 5.4)).toBe('东南风 3 级');
    expect(windTextOf(155.31, 1.91)).toBe('东南风 2 级');
  });
});

describe('skyOf', () => {
  it('降水强度优先决定天气现象', () => {
    expect(skyOf(12, 87)).toEqual({ condition: '大雨', icon: 'cloud-rain' });
    expect(skyOf(4, 80)).toEqual({ condition: '中雨', icon: 'cloud-rain' });
    expect(skyOf(0.2, 80)).toEqual({ condition: '小雨', icon: 'cloud-drizzle' });
  });

  it('无降水时按湿度反推云量', () => {
    expect(skyOf(0, 88)).toEqual({ condition: '阴', icon: 'cloud' });
    expect(skyOf(0, 75)).toEqual({ condition: '多云', icon: 'cloud-sun' });
    expect(skyOf(0, 50)).toEqual({ condition: '晴', icon: 'sun' });
  });
});

describe('rainChanceOf', () => {
  it('降水强度越高概率越高，微量降水视为无降水', () => {
    expect(rainChanceOf(0)).toBe(10);
    expect(rainChanceOf(0.01)).toBe(10);
    expect(rainChanceOf(0.02)).toBe(40);
    expect(rainChanceOf(0.1)).toBe(55);
    expect(rainChanceOf(0.5)).toBe(70);
    expect(rainChanceOf(1.5)).toBe(85);
    expect(rainChanceOf(4)).toBe(95);
  });
});

describe('feelsOf', () => {
  it('高温高湿上调体感', () => {
    expect(feelsOf(30, 85, 2)).toBe(32);
    expect(feelsOf(24, 87, 1.9)).toBe(24);
  });

  it('大风下调体感，且不超过 3 度', () => {
    expect(feelsOf(20, 60, 6)).toBe(19);
    expect(feelsOf(10, 50, 20)).toBe(7);
  });
});

describe('visibilityOf', () => {
  it('湿度越大能见度越低', () => {
    expect(visibilityOf(87, 0)).toBe(18.6);
    expect(visibilityOf(95, 0)).toBe(18.3);
    expect(visibilityOf(80, 0)).toBe(20);
  });

  it('降水进一步衰减', () => {
    expect(visibilityOf(80, 2)).toBe(15.6);
    expect(visibilityOf(95, 10)).toBe(6.3);
    expect(visibilityOf(100, 20)).toBe(4.5);
  });
});

describe('pressureTrendOf', () => {
  it('返回未来与当前之差，保留一位小数', () => {
    expect(pressureTrendOf(1011.8, 1010)).toBe(-1.8);
    expect(pressureTrendOf(1008, 1010.1)).toBe(2.1);
    expect(pressureTrendOf(1010, 1010)).toBe(0);
  });
});

describe('visibilityHintOf', () => {
  it('按能见度分档给行车提示', () => {
    expect(visibilityHintOf(18.5)).toBe('良好 · 可视距离充足');
    expect(visibilityHintOf(10)).toBe('良好 · 可视距离充足');
    expect(visibilityHintOf(5)).toBe('一般 · 注意车距');
    expect(visibilityHintOf(2)).toBe('较差 · 减速慢行');
    expect(visibilityHintOf(1)).toBe('极差 · 建议就近停靠');
  });
});

describe('humidityHintOf', () => {
  it('按湿度分档给车内环境提示', () => {
    expect(humidityHintOf(87)).toBe('很高 · 车窗易起雾');
    expect(humidityHintOf(78)).toBe('偏高 · 车窗易起雾');
    expect(humidityHintOf(55)).toBe('适中');
    expect(humidityHintOf(30)).toBe('干燥 · 注意补水');
  });
});

describe('rainHintOf', () => {
  const forecast = [
    { time: '21:00', rain: 10 },
    { time: '21:30', rain: 30 },
    { time: '22:00', rain: 85 }
  ];

  it('取降水概率最高的一档作为提示', () => {
    expect(rainHintOf(forecast)).toEqual({ text: '22:00 雷雨临近', tone: 'warn' });
    expect(rainHintOf([{ time: '21:00', rain: 10 }, { time: '21:30', rain: 55 }]))
      .toEqual({ text: '21:30 有阵雨可能', tone: 'info' });
    expect(rainHintOf([{ time: '21:00', rain: 10 }]))
      .toEqual({ text: '2 小时内无明显降水', tone: 'ok' });
  });

  it('空预报不报错', () => {
    expect(rainHintOf([])).toEqual({ text: '暂无降水预报', tone: 'ok' });
  });
});

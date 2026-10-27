import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Weather } from '../src/adapters/weather.js';
import { Api } from '../src/api/api.js';
import { SITE } from '../src/config/site.js';

/* 真实接口返回的 15 分钟序列（取 8 个点，字段与单位同线上一致：psz 为 Pa、ws10m 为 m/s） */
function fixture() {
  const rates = [0.00008, 0.00006, 0.00004, 0.00002, 0.00001, 0.00001, 0.00001, 0.00001];
  const temps = [24.53, 24.45, 24.36, 24.28, 24.2, 24.17, 24.14, 24.11];
  const winds = [1.91, 1.84, 1.76, 1.69, 1.62, 1.56, 1.51, 1.45];
  const begins = [101118.06, 101124.5, 101130.94, 101137.38, 101143.82, 101148.81, 101153.81, 101158.81];
  const data = rates.map(function (_, i) {
    const minute = 15 * i;
    const mm = String(minute % 60).padStart(2, '0');
    const hh = String(21 + Math.floor(minute / 60)).padStart(2, '0');
    return {
      time: '2026-10-26T' + hh + ':' + mm + '+08:00',
      wd10m: 155.31 + i,
      ws10m: winds[i],
      t2m: temps[i],
      rh2m: 87.31,
      psz: begins[i],
      tp: rates[i]
    };
  });
  return { code: 200, message: '成功', data: { data: data } };
}

function stubFetch(handler) {
  vi.stubGlobal('fetch', vi.fn(handler));
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('Weather.readSeries', () => {
  it('把接口字段归一化为统一单位与时间戳', async () => {
    stubFetch(async function () {
      return { ok: true, json: async function () { return fixture(); } };
    });
    const series = await Weather.readSeries(SITE);
    expect(series).toHaveLength(8);
    const first = series[0];
    expect(first.at).toBe(Date.parse('2026-10-26T21:00+08:00'));
    expect(first.temp).toBeCloseTo(24.53, 2);
    expect(first.humidity).toBeCloseTo(87.31, 2);
    /* psz 由 Pa 换算为 hPa */
    expect(first.pressure).toBeCloseTo(1011.18, 2);
    expect(first.windDeg).toBeCloseTo(155.31, 2);
    expect(first.windSpeed).toBeCloseTo(1.91, 2);
    expect(first.rainRate).toBeCloseTo(0.00008, 6);
  });

  it('接口异常时抛出错误，交由 api 层降级', async () => {
    stubFetch(async function () {
      throw new Error('network down');
    });
    await expect(Weather.readSeries({ lon: 0.1, lat: 0.2, tz: 8 })).rejects.toThrow();
  });

  it('业务码非 200 时抛出错误', async () => {
    stubFetch(async function () {
      return { ok: true, json: async function () { return { code: 20003, message: '未授权要素' }; } };
    });
    await expect(Weather.readSeries({ lon: 0.3, lat: 0.4, tz: 8 })).rejects.toThrow();
  });
});

describe('Api.getDashboard 天气映射', () => {
  it('实况与逐时预报按展示口径换算', async () => {
    stubFetch(async function () {
      return { ok: true, json: async function () { return fixture(); } };
    });
    const res = await Api.getDashboard();
    const w = res.data.weather;
    expect(w.location).toBe('深圳 · 坪山');
    expect(w.temp).toBe(25);
    expect(w.humidity).toBe(87);
    expect(w.condition).toBe('阴');
    expect(w.icon).toBe('cloud');
    expect(w.rainChance).toBe(10);
    expect(w.wind).toBe('东南风 2 级');
    expect(w.windSpeed).toBe(7);
    expect(w.pressure).toBe(1011);
    expect(w.visibility).toBe(18.5);
    expect(w.updatedAt).toBe('21:00');

    const hourly = res.data.forecast2h;
    expect(hourly).toHaveLength(4);
    expect(hourly[0].time).toBe('21:00');
    expect(hourly[1].time).toBe('21:30');
    expect(hourly[3].time).toBe('22:30');
    expect(hourly[0].label).toBe('现在');
    expect(hourly[1].label).toBe('30 分钟后');
    expect(hourly[0].temp).toBe(25);
    expect(hourly[3].temp).toBe(24);
  });

  it('接口不可用时退回本地 mock，看板结构不变', async () => {
    /* 适配层有 5 分钟缓存，这里重置模块以获得空缓存 */
    vi.resetModules();
    stubFetch(async function () {
      throw new Error('network down');
    });
    const fresh = await import('../src/api/api.js');
    const res = await fresh.Api.getDashboard();
    const w = res.data.weather;
    expect(w.location).toBe('深圳 · 坪山');
    expect(typeof w.temp).toBe('number');
    expect(res.data.forecast2h).toHaveLength(4);
    expect(res.data.features).toHaveLength(4);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Weather } from '../src/adapters/weather.js';
import { Sensor } from '../src/adapters/sensor.js';
import contract from '../src/config/model-contract.json';
import { MODEL_SENSOR_COLUMNS } from '../src/adapters/sensor.js';

const HOURLY_NAMES = [
  'temperature_2m', 'relative_humidity_2m', 'dew_point_2m',
  'precipitation', 'precipitation_probability', 'pressure_msl', 'surface_pressure',
  'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m', 'cloud_cover',
  'shortwave_radiation', 'uv_index', 'cape', 'soil_moisture_0_to_1cm', 'visibility'
];

const SENSOR_NAMES = [
  'time', 'mode', 't_c', 'rh_pct', 'p_sta_hpa', 'rain_mm', 'lux', 'speed_kmh'
];

function decisionFixture(overrides) {
  const time = ['2026-10-30T21:00', '2026-10-30T22:00', '2026-10-30T23:00'];
  const hourly = {
    temperature_2m: [24.5, 24.1, 23.8],
    relative_humidity_2m: [61, 63, 66],
    dew_point_2m: [16.4, 16.6, 16.9],
    precipitation: [0.2, 0, 0.6],
    precipitation_probability: [65, 40, 72],
    pressure_msl: [1011.2, 1010.8, 1010.3],
    surface_pressure: [1008.4, 1008.0, 1007.5],
    wind_speed_10m: [2.1, 2.6, 3.4],
    wind_gusts_10m: [4.8, 5.2, 6.1],
    wind_direction_10m: [88, 92, 97],
    cloud_cover: [80, 74, 88],
    shortwave_radiation: [0, 0, 0],
    uv_index: [0, 0, 0],
    cape: [120, null, 210],
    soil_moisture_0_to_1cm: [0.31, 0.32, 0.33],
    visibility: [18500, 16000, 12000]
  };
  Object.assign(hourly, overrides || {});
  return {
    utc_offset_seconds: 28800,
    hourly: Object.assign({ time: time }, hourly)
  };
}

function stubFetch(handler) {
  vi.stubGlobal('fetch', vi.fn(handler));
}

function okJson(body) {
  return { ok: true, json: async function () { return body; } };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('跨仓库契约', () => {
  it('逐时字段、传感器列、时间口径与模型侧一致', () => {
    expect(contract.schemaVersion).toBe('1.0.0');
    expect(contract.timezone.internal).toBe('UTC');
    expect(contract.timezone.display).toBe('+08:00');
    expect(contract.timezone.sensorLog).toBe('+08:00');
    expect(contract.hourly.fields.map(function (f) { return f.name; })).toEqual(HOURLY_NAMES);
    expect(contract.sensor.columns.map(function (c) { return c.name; })).toEqual(SENSOR_NAMES);
    expect(MODEL_SENSOR_COLUMNS).toEqual(SENSOR_NAMES);
    expect(contract.hourly.request.pastDays).toBe(1);
    expect(contract.hourly.request.forecastDays).toBe(3);
  });

  it('逐时字段单位与 Open-Meteo 原始口径一致', () => {
    const units = {};
    contract.hourly.fields.forEach(function (f) { units[f.name] = f.unit; });
    expect(units.precipitation).toBe('mm');
    expect(units.wind_speed_10m).toBe('m/s');
    expect(units.visibility).toBe('m');
    expect(units.soil_moisture_0_to_1cm).toBe('m³/m³');
    expect(units.cape).toBe('J/kg');
  });
});

describe('Weather.readDecisionSeries', () => {
  it('输出契约原名、原始单位与 UTC 时间戳，不做展示口径换算', async () => {
    let requested = '';
    stubFetch(async function (url) {
      requested = url;
      return okJson(decisionFixture());
    });
    const series = await Weather.readDecisionSeries({ lon: 120.01, lat: 30.11, tz: 8 });

    expect(series.source).toBe('open-meteo');
    expect(series.timezone).toBe('UTC');
    expect(series.points).toHaveLength(3);

    const first = series.points[0];
    expect(first.at).toBe(Date.parse('2026-10-30T21:00+08:00'));
    expect(first.time).toBe('2026-10-30T21:00+08:00');
    expect(Object.keys(first)).toHaveLength(18);
    expect(first.temperature_2m).toBe(24.5);
    expect(first.precipitation).toBe(0.2);
    expect(first.pressure_msl).toBe(1011.2);
    expect(first.wind_speed_10m).toBe(2.1);
    expect(first.soil_moisture_0_to_1cm).toBe(0.31);
    /* 米保持为米，不转 km */
    expect(first.visibility).toBe(18500);
    /* 接口 null 原样保留，由模型侧兜底 */
    expect(series.points[1].cape).toBeNull();

    const query = new URL(requested, 'http://localhost').searchParams;
    expect(query.get('hourly').split(',')).toEqual(HOURLY_NAMES);
    expect(query.get('past_days')).toBe('1');
    expect(query.get('forecast_days')).toBe('3');
    expect(query.get('wind_speed_unit')).toBe('ms');
  });

  it('缺少契约字段时明确报错，不静默降级', async () => {
    const body = decisionFixture();
    delete body.hourly.cape;
    stubFetch(async function () { return okJson(body); });
    await expect(Weather.readDecisionSeries({ lon: 120.02, lat: 30.12, tz: 8 }))
      .rejects.toThrow(/missing cape/);
  });

  it('没有 hourly 序列时明确报错', async () => {
    stubFetch(async function () { return okJson({ hourly: { time: [] } }); });
    await expect(Weather.readDecisionSeries({ lon: 120.03, lat: 30.13, tz: 8 }))
      .rejects.toThrow(/hourly missing/);
  });
});

describe('Sensor.toModelRow', () => {
  it('按契约列名与单位映射，时间统一为 +08:00', () => {
    const row = Sensor.toModelRow({
      at: Date.parse('2026-10-30T21:00+08:00'),
      mode: 'parked',
      temp: 24.5,
      humidity: 61,
      pressure: 1008.2,
      rainMm: 0.8,
      lux: 1200,
      speedKmh: 0
    });
    expect(Object.keys(row)).toEqual(SENSOR_NAMES);
    expect(row.time).toBe('2026-10-30T21:00+08:00');
    expect(row.mode).toBe('parked');
    expect(row.t_c).toBe(24.5);
    expect(row.rh_pct).toBe(61);
    expect(row.p_sta_hpa).toBe(1008.2);
    expect(row.rain_mm).toBe(0.8);
    expect(row.lux).toBe(1200);
    expect(row.speed_kmh).toBe(0);
  });

  it('缺失读数保持 null，交由模型侧 QC', () => {
    const row = Sensor.toModelRow({ at: Date.parse('2026-10-30T21:00+08:00') });
    expect(row.t_c).toBeNull();
    expect(row.rh_pct).toBeNull();
    expect(row.p_sta_hpa).toBeNull();
    expect(row.rain_mm).toBeNull();
    expect(row.lux).toBeNull();
    expect(row.speed_kmh).toBeNull();
    expect(row.mode).toBe('');
  });
});

import { describe, it, expect } from 'vitest';
import { wgs84ToGcj02 } from '../src/maps/geo.js';

describe('wgs84ToGcj02', () => {
  it('深圳坐标偏移落在 GCJ-02 正常量级（几十到几百米）', () => {
    const [lat, lng] = wgs84ToGcj02(22.6808, 114.3558);
    expect(Math.abs(lat - 22.6808)).toBeGreaterThan(0.00005);
    expect(Math.abs(lat - 22.6808)).toBeLessThan(0.01);
    expect(Math.abs(lng - 114.3558)).toBeGreaterThan(0.00005);
    expect(Math.abs(lng - 114.3558)).toBeLessThan(0.01);
  });

  it('境外坐标不做偏移', () => {
    expect(wgs84ToGcj02(35.6812, 139.7671)).toEqual([35.6812, 139.7671]);
  });

  it('海拔/纬度越界不会产生 NaN', () => {
    const [lat, lng] = wgs84ToGcj02(0, 0);
    expect(Number.isFinite(lat)).toBe(true);
    expect(Number.isFinite(lng)).toBe(true);
  });
});

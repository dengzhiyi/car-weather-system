/**
 * 雨量传感器适配层
 * 归一化两个数据源：车载雨量计（RS 系列）、目的地流域雨量站。
 * 只返回原始观测值，不做等级判定、阈值比较与告警判断（属于 domain 的职责）。
 * TODO: 接入真实数据源（车载 CAN / WebSocket / 流域站点 HTTP 接口）。
 */
import { DB } from '../data/mock.js';
import contract from '../config/model-contract.json';

/* 模型契约要求的传感器列（顺序与 contract.sensor.columns 一致） */
const MODEL_SENSOR_COLUMNS = contract.sensor.columns.map(function (c) { return c.name; });

/* 传感器日志时区固定为 +08:00，与模型 contract.timezone.sensorLog 对齐 */
const SENSOR_OFFSET_MIN = (function () {
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(contract.timezone.sensorLog || '+00:00');
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
})();

function sensorTime(ms) {
  const sign = SENSOR_OFFSET_MIN < 0 ? '-' : '+';
  const abs = Math.abs(SENSOR_OFFSET_MIN);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return new Date(ms + SENSOR_OFFSET_MIN * 60000).toISOString().slice(0, 16) + sign + hh + ':' + mm;
}

function numOrNull(value) {
  return value == null || value === '' ? null : Number(value);
}

/**
 * 把一条车载传感器读数映射为模型契约行（字段名/单位见 src/config/model-contract.json）。
 * 输入为本工程内部命名；缺失的量保持 null，交由模型侧 QC 处理。
 * TODO: 真实 5 传感器序列需 Capacitor 原生插件（CAN / OBD / 车机 SDK），
 * 接入后按本函数输出契约行，供模型 correct() 使用。
 * @param {{at:number,mode?:string,temp?:number,humidity?:number,pressure?:number,
 *   rainMm?:number,lux?:number,speedKmh?:number}} reading
 * @returns {{time:string,mode:string,t_c:number|null,rh_pct:number|null,
 *   p_sta_hpa:number|null,rain_mm:number|null,lux:number|null,speed_kmh:number|null}}
 */
function toModelRow(reading) {
  return {
    time: sensorTime(reading.at),
    mode: reading.mode || '',
    t_c: numOrNull(reading.temp),
    rh_pct: numOrNull(reading.humidity),
    p_sta_hpa: numOrNull(reading.pressure),
    rain_mm: numOrNull(reading.rainMm),
    lux: numOrNull(reading.lux),
    speed_kmh: numOrNull(reading.speedKmh)
  };
}

/**
 * 车载雨量传感器当前读数
 * @returns {Promise<{rate:number,cumulative:number,delta10m:number,
 *   sampleRate:string,status:string,thresholds:Array,history30m:number[],history60m:number[]}>}
 */
async function readVehicleRain() {
  const r = DB.rain;
  return {
    rate: r.rate,
    cumulative: r.cumulative,
    delta10m: r.delta10m,
    sampleRate: r.sampleRate,
    status: r.status,
    thresholds: r.thresholds,
    history30m: r.history30m,
    history60m: r.history60m
  };
}

/**
 * 流域雨量站读数
 * @param {string} stationId 站点标识
 * @param {string} scene 已经归一化的场景键（normal / alert）
 * @returns {Promise<{stationId:string,sensorRate:number,update:string}>}
 */
async function readBasinGauge(stationId, scene) {
  const m = DB.flood.modes[scene];
  return {
    stationId: stationId,
    sensorRate: m.sensorRate,
    update: m.update
  };
}

const Sensor = {
  readVehicleRain: readVehicleRain,
  readBasinGauge: readBasinGauge,
  toModelRow: toModelRow
};

export { Sensor, MODEL_SENSOR_COLUMNS };

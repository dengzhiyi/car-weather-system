/**
 * 雨量传感器适配层
 * 归一化两个数据源：车载雨量计（RS 系列）、目的地流域雨量站。
 * 只返回原始观测值，不做等级判定、阈值比较与告警判断（属于 domain 的职责）。
 * TODO: 接入真实数据源（车载 CAN / WebSocket / 流域站点 HTTP 接口）。
 */
import { DB } from '../data/mock.js';

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
  readBasinGauge: readBasinGauge
};

export { Sensor };

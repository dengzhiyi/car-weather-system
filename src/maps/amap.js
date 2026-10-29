/* 高德地图（JS API 2.0）加载与路线图挂载
   演示/离线优先：未配置 Key、断网或 5s 内加载不出来时一律返回 null，
   页面保留原有 SVG 示意地图，不阻塞任何交互。 */
import AMapLoader from '@amap/amap-jsapi-loader';
import { wgs84ToGcj02 } from './geo.js';

const KEY = String(import.meta.env.VITE_AMAP_KEY || '').trim();
const SECURITY = String(import.meta.env.VITE_AMAP_SECURITY_CODE || '').trim();
const LOAD_TIMEOUT = 5000;
const PLUGINS = ['AMap.Driving', 'AMap.TileLayer.Traffic'];

let amap = null;
let pending = null;
let failed = false;

export function hasAmapKey() {
  return Boolean(KEY);
}

function loadAMap() {
  if (amap) return Promise.resolve(amap);
  if (failed) return Promise.resolve(null);
  if (!pending) {
    /* 安全密钥需在脚本注入前设置；模块内赋值，不产生内联脚本 */
    if (SECURITY) window._AMapSecurityConfig = { securityJsCode: SECURITY };
    pending = Promise.race([
      AMapLoader.load({ key: KEY, version: '1.4.17', plugins: PLUGINS }),
      new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('AMap load timeout')); }, LOAD_TIMEOUT);
      })
    ]).then(function (instance) {
      amap = instance;
      return instance;
    }).catch(function () {
      failed = true;
      return null;
    });
  }
  return pending;
}

function toLngLat(AMap, lat, lng) {
  const p = wgs84ToGcj02(lat, lng);
  return new AMap.LngLat(p[1], p[0]);
}

/**
 * 在 host 内初始化地图并规划驾车路线
 * @param {HTMLElement} host 地图容器
 * @param {{origin:{lat:number,lng:number}, destination:{lat:number,lng:number}}} options
 * @returns {Promise<null | {setDestination:Function, zoomBy:Function, destroy:Function}>}
 */
export async function mountRouteMap(host, options) {
  if (!host || !hasAmapKey()) return null;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null;

  const origin = options && options.origin;
  if (!origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number') return null;

  const AMap = await loadAMap();
  if (!AMap) return null;

  let map;
  try {
    map = new AMap.Map(host, {
      zoom: 11,
      viewMode: '2D',
      mapStyle: 'amap://styles/darkblue',
      showLabel: true,
      resizeEnable: true
    });
  } catch (e) {
    return null;
  }

  const traffic = new AMap.TileLayer.Traffic({ autoRefresh: true, interval: 180 });
  traffic.setMap(map);

  const driving = new AMap.Driving({
    map: map,
    hideMarkers: false,
    isOutline: true,
    outlineColor: '#0A1219',
    policy: AMap.DrivingPolicy.LEAST_TIME,
    polylineOptions: {
      strokeColor: '#6BB8FF',
      strokeWeight: 6,
      borderWeight: 1,
      lineJoin: 'round'
    }
  });

  const start = toLngLat(AMap, origin.lat, origin.lng);

  /* 路线规划走 restapi，需要「安全密钥」；缺失时降级为起终点标记 + 估算连线。
     先画兜底结果再请求规划，保证切换目的地立即有可见反馈 */
  let fallback = [];
  function clearFallback() {
    for (let i = 0; i < fallback.length; i++) map.remove(fallback[i]);
    fallback = [];
  }
  /* 自己算中心与层级，避免 setFitView 在 canvas 渲染层尚未就绪时不生效 */
  function fitPoints(a, b) {
    const size = map.getSize ? map.getSize() : null;
    const w = (size && size.getWidth && size.getWidth()) || host.clientWidth || 841;
    const h = (size && size.getHeight && size.getHeight()) || host.clientHeight || 452;
    const dLng = Math.max(Math.abs(a.lng - b.lng), 0.002);
    const dLat = Math.max(Math.abs(a.lat - b.lat), 0.002);
    const zl = Math.log(360 * w / (dLng * 256)) / Math.LN2;
    const zt = Math.log(360 * h / (dLat * 256)) / Math.LN2;
    const zoom = Math.max(5, Math.min(16, Math.floor(Math.min(zl, zt))));
    map.setZoomAndCenter(zoom, [(a.lng + b.lng) / 2, (a.lat + b.lat) / 2]);
  }
  function drawFallback(end) {
    clearFallback();
    fallback = [
      new AMap.Marker({ position: start, title: '起点' }),
      new AMap.Marker({ position: end, title: '终点' }),
      new AMap.Polyline({
        path: [start, end],
        strokeColor: '#6BB8FF',
        strokeWeight: 5,
        strokeOpacity: 0.9,
        strokeStyle: 'dashed',
        strokeDasharray: [10, 7],
        lineJoin: 'round'
      })
    ];
    map.add(fallback);
    fitPoints(start, end);
  }

  /* 首条路线由调用方在容器尺寸就绪后触发（隐藏容器初始为 0×0） */
  function setDestination(dest) {
    if (!dest || typeof dest.lat !== 'number' || typeof dest.lng !== 'number') return;
    const end = toLngLat(AMap, dest.lat, dest.lng);
    drawFallback(end);
    driving.search(start, end, function (status) {
      if (status !== 'complete') return;
      clearFallback();
      map.setFitView();
    });
  }

  return {
    map: map,
    setDestination: setDestination,
    resize: function () {
      try { map.resize(); } catch (e) { /* 尺寸未就绪时忽略 */ }
    },
    zoomBy: function (delta) {
      const next = Math.min(18, Math.max(4, map.getZoom() + delta));
      map.setZoom(next);
    },
    destroy: function () {
      try { map.destroy(); } catch (e) { /* 容器移除时忽略 */ }
    }
  };
}

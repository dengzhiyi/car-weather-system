/* 高德地图（JS API 1.4.17）加载与路线图挂载
   演示/离线优先：未配置 Key、断网或 5s 内加载不出来时一律返回 null，
   页面保留原有 SVG 示意地图，不阻塞任何交互。
   路线几何来自 mock 里预置的真实驾车路线（routePath），不再依赖 Driving 插件，
   因此无需安全密钥即可画真实道路。 */
import AMapLoader from '@amap/amap-jsapi-loader';
import { wgs84ToGcj02 } from './geo.js';

const KEY = String(import.meta.env.VITE_AMAP_KEY || '').trim();
const LOAD_TIMEOUT = 5000;
const PLUGINS = ['AMap.TileLayer.Traffic'];

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
      mapStyle: 'amap://styles/normal',
      showLabel: true,
      resizeEnable: true
    });
  } catch (e) {
    return null;
  }

  const traffic = new AMap.TileLayer.Traffic({ autoRefresh: true, interval: 180 });
  traffic.setMap(map);

  const start = toLngLat(AMap, origin.lat, origin.lng);

  let drawn = [];
  function clearRoute() {
    for (let i = 0; i < drawn.length; i++) map.remove(drawn[i]);
    drawn = [];
  }
  /* 自己算中心与层级，避免 setFitView 在 canvas 渲染层尚未就绪时不生效。
     按路线包围盒并留 30% 余量，保证起终点不贴边 */
  function fitPath(path) {
    const size = map.getSize ? map.getSize() : null;
    const w = (size && size.getWidth && size.getWidth()) || host.clientWidth || 841;
    const h = (size && size.getHeight && size.getHeight()) || host.clientHeight || 452;
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    for (let i = 0; i < path.length; i++) {
      const p = path[i];
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
    }
    const dLng = Math.max((maxLng - minLng) * 1.3, 0.002);
    const dLat = Math.max((maxLat - minLat) * 1.3, 0.002);
    const zl = Math.log(360 * w / (dLng * 256)) / Math.LN2;
    const zt = Math.log(360 * h / (dLat * 256)) / Math.LN2;
    const zoom = Math.max(5, Math.min(16, Math.floor(Math.min(zl, zt))));
    map.setZoomAndCenter(zoom, [(minLng + maxLng) / 2, (minLat + maxLat) / 2]);
  }

  /* 目的地路线：优先用 mock 预置的真实道路几何，缺失时退回起终点直连 */
  function routeOf(dest) {
    const raw = dest.routePath;
    if (!Array.isArray(raw) || raw.length < 2) return [start, toLngLat(AMap, dest.lat, dest.lng)];
    const path = [];
    for (let i = 0; i < raw.length; i++) {
      const p = wgs84ToGcj02(raw[i][1], raw[i][0]);
      path.push(new AMap.LngLat(p[1], p[0]));
    }
    return path;
  }

  function drawRoute(dest) {
    clearRoute();
    const path = routeOf(dest);
    const real = Array.isArray(dest.routePath) && dest.routePath.length >= 2;
    drawn = [
      new AMap.Polyline({
        path: path,
        strokeColor: '#FFFFFF',
        strokeWeight: 10,
        strokeOpacity: 0.95,
        lineJoin: 'round'
      }),
      new AMap.Polyline({
        path: path,
        strokeColor: '#1677FF',
        strokeWeight: real ? 6 : 4,
        strokeOpacity: 0.95,
        strokeStyle: real ? 'solid' : 'dashed',
        strokeDasharray: [10, 7],
        lineJoin: 'round'
      }),
      new AMap.Marker({ position: path[0], title: '起点' }),
      new AMap.Marker({ position: path[path.length - 1], title: '终点' })
    ];
    map.add(drawn);
    fitPath(path);
  }

  /* 首条路线由调用方在容器尺寸就绪后触发（隐藏容器初始为 0×0） */
  function setDestination(dest) {
    if (!dest || typeof dest.lat !== 'number' || typeof dest.lng !== 'number') return;
    drawRoute(dest);
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

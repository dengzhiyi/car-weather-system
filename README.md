# 气象环境助手 · 车载气象监测系统

车载场景下的气象监测与出行辅助前端原型。5 个页面、Vite 多页构建、零运行时依赖，构建产物可直接离线部署。默认监测点为 **深圳坪山 · 比亚迪总部**。

> 当前为 **UI 原型阶段**：雨量传感器、山洪短临预报、露营与钓点天气仍来自 `src/data/mock.js`；
> **首页实况与逐时预报已接入真实天气接口**（见下文「天气数据接入」）。

## 页面

| 页面 | 入口 | 核心能力 |
|---|---|---|
| 气象看板 | `index.html` | 实时天气、雨量、环境指标，四个功能入口 |
| 高速暴雨辅助 | `rainstorm.html` | 雨量值与等级、辅助开关、按雨量自动调整车速与跟车距离 |
| 露营助手 | `camping.html` | 目的地搜索、到达时段天气、装备与安全建议 |
| 山洪预警 | `flood.html` | 传感器 + 2 小时短临预报双规则、风险评分、预警横幅 |
| 钓鱼窗口 | `fishing.html` | 气压趋势、风速、时段窗口与垂钓建议 |

导航采用「每页内联 App Shell + 纯 CSS 唯一 active 规则」，不依赖 JS 注入，无首屏闪烁。5 份 Shell 由 `vite.config.ts` 中的 `htmlPartials()` 在构建时从同一份片段注入，产物一致性由 `npm run check:dist` 校验。

## 目录结构

```text
.
├─ vite.config.ts          # MPA 5 入口 / @include 片段注入 / 构建期注入 CSP
├─ vitest.config.ts        # 单测配置（node 环境，只收 tests/）
├─ src/
│  ├─ index.html  rainstorm.html  camping.html  flood.html  fishing.html
│  ├─ shell/   rail.html  topbar.html          # App Shell 片段（构建时注入）
│  ├─ core/    dom.js  app.js  icons.js        # 通用工具 / 全局引导 / 内联 SVG 字典
│  ├─ config/  site.js                         # 默认监测点（经纬度）
│  ├─ domain/  rain.js  rainstorm.rules.js  flood.rules.js  fishing.rules.js  weather.view.js
│  ├─ adapters/ sensor.js  weather.js  amap.js  # 外部数据源隔离层
│  ├─ api/     api.js                          # 接口 stub（签名即未来真实接口）
│  ├─ data/    mock.js                         # 单一 mock 数据源（只存原始读数）
│  ├─ pages/   index.js  rainstorm.js  camping.js  flood.js  fishing.js
│  ├─ styles/  tokens.css → base.css → components.css → pages.css / main.css
│  └─ public/  icon.svg  manifest.webmanifest
├─ tests/      rainstorm / flood / fishing / weather.view / weather.series
├─ scripts/    check-dist.mjs                  # 构建产物自检
├─ dist/                                       # 构建产物（git 忽略）
└─ .github/workflows/ci.yml
```

分层约束（单向依赖 `adapters → api → domain → view`）：

- `core/*` 通用工具，不依赖任何业务模块
- `config/*` 运行期配置（默认监测点经纬度）
- `domain/*` 纯业务规则（雨量→车速/跟车、山洪双规则、钓鱼评分、天气要素展示口径），**只做计算，不触碰 DOM / 网络 / localStorage**，阈值由调用方传入
- `adapters/*` 外部数据源隔离层（`Sensor` 雨量传感器 / `Weather` 天气服务 / `Amap` 高德地图），只做字段归一化，**不含业务判断**；接真实数据源时只改这一层
- `data/*` 只存原始读数，不存"结论型"字段；页面所需结论一律由 `domain/*` 现算
- `api/*` 组合 adapters 取数、调用 `domain/*` 计算，签名即未来真实接口
- `pages/*` 只做视图渲染，不写业务阈值、不直接 fetch

## 运行

```bash
npm install
npm run dev       # 开发服务器 http://127.0.0.1:5173
npm run build     # 产物输出到 dist/
npm run preview   # 预览构建产物 http://127.0.0.1:4174
npm test          # 运行 domain 规则单测
```

`dist/` 为纯静态文件，可直接由任意静态服务器托管；后续 Capacitor 打包即以此目录为 `webDir`。

## 屏幕适配

面向比亚迪车机，基准为 **12.8″ / 1920×1080**（默认），同时兼容 **15.6″ / 1920×1080**。

两种规格分辨率相同，浏览器无法区分物理尺寸，因此采用「12.8″ 定基准 + 缩放接口」：

- 根字号由 [tokens.css](file:///workspace/car-weather-system/src/styles/tokens.css) 的 `--ui-scale` 驱动：`html { font-size: calc(16px * var(--ui-scale)) }`
- 所有字号令牌均为 `rem`（`--fs-3xs` ~ `--fs-3xl`），改一个变量即可整屏等比缩放
- 15.6″ 屏建议将 `--ui-scale` 设为 `0.85`，使文字物理大小与 12.8″ 接近

触控元素按车机标准放大：最小可点区域 `--tap-min: 44px`，正文最小字号 `--fs-3xs`（12px）。

## 天气数据接入

首页实况与未来 4 小时逐时预报取自天气服务 `https://api.tjweather.com/v2`，默认监测点为 **深圳坪山 · 比亚迪总部**（`114.355782, 22.680820`），可在 [site.js](file:///workspace/car-weather-system/src/config/site.js) 修改。

| 项 | 说明 |
|---|---|
| 授权要素 | `wd10m` 风向、`ws10m` 风速、`t2m` 温度、`rh2m` 湿度、`psz` 气压、`tp` 降水 |
| 取数粒度 | `t_res=15min`，`fcst_days=10`，`tz=8` |
| 单位换算 | `psz` 由 Pa 换算为 hPa；`ws10m` 保持 m/s，展示时换算 km/h |
| 缓存 | 适配层内存缓存 5 分钟，避免每次进页重复拉取 10 天数据 |
| 跨域 | 接口无 CORS 头，浏览器侧统一走同源代理 `/api/tj/*` → `https://api.tjweather.com/*`（见 `vite.config.ts` 的 `weatherProxy`）；Capacitor Native 环境直连服务端 |
| 降级 | 代理不可用 / 订阅异常时自动退回 `src/data/mock.js`，看板结构不变、不报错 |

要素只有 6 个，云量、体感温度、能见度、降水概率不在订阅范围内，因此由 [weather.view.js](file:///workspace/car-weather-system/src/domain/weather.view.js) 按经验口径换算（风向→八方位、风速→蒲福风级、降水强度→天气现象/概率、湿度与降水→能见度、气压 24h 变化→趋势），仅用于展示，不参与任何预警判定。

> 订阅 key 目前写在适配层内，仅用于原型。正式部署时应由后端代理转发并保管密钥。

## 校验

```bash
npm test             # domain 纯规则单测（54 例）
npm run check:dist   # 需先 npm run build
```

`npm test` 覆盖雨量等级边界、暴雨辅助开关两态与四级策略、山洪双规则判定与风险分、钓鱼评分单调性与评级分界、天气要素展示口径换算，以及天气适配层的字段单位归一化与接口失败降级。

`npm run check:dist` 检查项：产物页面齐全、5 页 App Shell 逐字节一致（含片段注入残留检测）、`data-page` 标识、资源引用有效性、CSP 已注入且无内联脚本/外链、样式与脚本产物引用。

## 数据契约

- `src/data/mock.js` → `export { DB }`：所有 mock 原始读数的唯一来源
- `src/domain/*`：纯函数规则，`rainLevelOf` / `rainAssistPlan` / `evaluateFlood` / `fishingScore` / `pressureStateOf`，以及天气展示口径 `windTextOf` / `skyOf` / `rainChanceOf` / `feelsOf` / `visibilityOf` / `pressureTrendOf`
- `src/adapters/*`：`Sensor.readVehicleRain / readBasinGauge`、`Weather.readSeries`（真实接口）/ `readBasinForecast / readArrivalBrief / readFishingSpot`（mock）、`Amap.searchDestination / planRoute`
- `src/api/api.js` → `export { Api }`：`getDashboard / setRainAssist / planDestination / getFloodStatus / getFishingWindow`，每个函数标注了预期的 HTTP method 与 path，接后端时只替换 adapters 实现，本层返回结构不变
- `src/core/icons.js`：`data-icon="name"` 挂载内联 SVG，无 CDN、无字体图标

## 兼容性

面向车载 WebView，构建目标 `es2018`。源码避免 `?.` / `??`，`async/await` 起步即可运行（Chrome 65+）。

已知样式层风险（仅影响老旧 WebView，Android 10+ 无此问题）：

- flex `gap`：Chrome 84+；Android 7/8 车载 WebView 可能丢失间距
- `color-mix()`：Chrome 111+；失效处为装饰性背景与阴影
- `backdrop-filter`：Chrome 76+；不支持时退化为半透明背景

## 后续规划

1. ~~**业务规则下沉**：抽 `domain/`（雨量→车速/跟车、山洪双规则、钓鱼评分）为纯函数并补单测~~ ✅ 已完成
2. ~~**外部依赖隔离**：`adapters/`（雨量传感器、天气、高德）统一接口~~ ✅ 已完成
3. ~~**天气接口接入**：首页实况与逐时预报改走真实天气服务~~ ✅ 已完成
4. **其余数据源接入**：雨量传感器、流域短临预报、高德目的地与路线、钓点气象
5. **Android 打包**：Capacitor（`webDir: dist`），横屏 + 沉浸式 + keep-awake

## 许可

[MIT](LICENSE)

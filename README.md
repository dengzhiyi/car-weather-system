# 气象环境助手 · 车载气象监测系统

车载场景下的气象监测与出行辅助前端原型。5 个页面、Vite 多页构建、零运行时依赖，构建产物可直接离线部署。默认监测点为 **深圳坪山 · 比亚迪总部**。

> 当前为 **UI 原型阶段**：雨量传感器、山洪短临预报与钓点气象仍来自 `src/data/mock.js`；
> **首页实况/逐时预报**与**露营到达天气**已接入真实天气接口（见下文「天气数据接入」），
> 时间类文案（更新时间、预计到达、逐时时刻）一律按系统时钟推算。

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
│  ├─ config/  site.js  model-contract.json    # 默认监测点 / 模型契约镜像
│  ├─ domain/  rain.js  rainstorm.rules.js  flood.rules.js  fishing.rules.js  weather.view.js
│  ├─ adapters/ sensor.js  weather.js  amap.js  # 外部数据源隔离层
│  ├─ maps/    amap.js  geo.js                 # 高德 JS API 挂载 / WGS-84→GCJ-02
│  ├─ api/     api.js                          # 接口 stub（签名即未来真实接口）
│  ├─ data/    mock.js                         # 单一 mock 数据源（只存原始读数）
│  ├─ pages/   index.js  rainstorm.js  camping.js  flood.js  fishing.js
│  ├─ styles/  tokens.css → base.css → components.css → pages.css / main.css
│  └─ public/  icon.svg  manifest.webmanifest  map/*.jpg  # 离线真实地图快照
├─ tests/      rainstorm / flood / fishing / weather.view / weather.series / model.contract
├─ scripts/    check-dist.mjs  check-model-contract.mjs  # 产物自检 / 契约漂移校验
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

首页实况与未来 5 小时逐时预报优先取自 **Open-Meteo**（免费开源，`https://api.open-meteo.com/v1/forecast`），主通道异常时自动回退 tjweather 备用通道；默认监测点为 **深圳坪山 · 比亚迪总部**（`114.355782, 22.680820`），可在 [site.js](file:///workspace/car-weather-system/src/config/site.js) 修改。

| 项 | 说明 |
|---|---|
| 主通道 | Open-Meteo：`minutely_15` 取温度 / 湿度 / 体感温度 / 降水 / 降水概率 / 云量 / 能见度 / 天气码 / 昼夜 / 风速风向（15 分钟粒度）；`hourly` 取契约要求的 16 个决策字段（温度 / 湿度 / 露点 / 降水 / 降水概率 / 气压 / 海平面气压 / 风速 / 阵风 / 风向 / 云量 / 短波辐射 / UV / CAPE / 土壤湿度 / 能见度）；`timezone=Asia/Shanghai`、`wind_speed_unit=ms` |
| 决策序列 | `Weather.readDecisionSeries(site)` 输出模型契约原名、Open-Meteo 原始单位、UTC 时间戳，与展示序列分开：展示用 mm/15min 与 km，模型输入保持 mm、m/s、m |
| 备用通道 | tjweather：`wd10m` 风向、`ws10m` 风速、`t2m` 温度、`rh2m` 湿度、`psz` 气压、`tp` 降水（`t_res=15min`，`tz=8`） |
| 单位换算 | Open-Meteo 的 15 分钟累计降水换算为 mm/h；tjweather 的 `psz` 由 Pa 换算为 hPa；风速统一 m/s，展示时换算 km/h |
| 缓存 | 适配层内存缓存 5 分钟，避免每次进页重复拉取 |
| 跨域 | Open-Meteo 支持 CORS，但仍统一走同源代理 `/api/om/*` → `https://api.open-meteo.com/*`；tjweather 无 CORS 头走 `/api/tj/*`（见 `vite.config.ts` 的 `weatherProxy`）；Capacitor Native 环境直连服务端 |
| 降级 | 主通道异常 → tjweather 备用；两者都不可用时退回 `src/data/mock.js`，看板结构不变、不报错 |
| 实时性 | 序列起点并不等于当前时刻，实况取「距当前最近的时间点」；未来 5 小时各档时刻按系统时钟 +1h ~ +5h 推算并向上对齐到半小时整点（`:00` / `:30`）；首页更新时间秒级跟随系统时钟，看板每分钟重渲染一次，天气数据受 5 分钟缓存保护，不会额外请求接口 |

云量、体感温度、能见度、降水概率、天气现象与昼夜图标一律取 Open-Meteo 接口原值（`weather_code` / `cloud_cover` / `apparent_temperature` / `visibility` / `precipitation_probability` / `is_day`），仅在备用通道 tjweather 缺字段时，才由 [weather.view.js](file:///workspace/car-weather-system/src/domain/weather.view.js) 按经验口径兜底（风向→八方位、风速→蒲福风级、降水强度→天气现象/概率、湿度与降水→能见度、气压 24h 变化→趋势）；这些换算仅用于展示，不参与任何预警判定。

> 订阅 key 目前写在适配层内，仅用于原型。正式部署时应由后端代理转发并保管密钥。

## 高德地图（可选）

露营页「路线预览」与山洪预警页「目的地 · 山洪影响区」共用同一套地图，分三层按可用性自动接管：

1. **在线高德**（配置 Key 且联网）：浅色标准底图（`amap://styles/normal`）+ 实时路况图层 + 真实道路驾车路线
2. **离线真实地图**（无网 / CDN 不可达）：`src/public/map/<目的地>.jpg` 真实地图快照，随目的地切换（山洪页固定马峦山）
3. **SVG 示意地图 / 地形示意**（快照缺失）：纯内嵌矢量兜底

```bash
cp .env.example src/.env.local   # 本工程 vite root 为 src，env 文件必须放在 src/ 下
# 填入 VITE_AMAP_KEY
npm run dev
```

- 无 Key、断网或 5 秒内加载失败时自动回退，不报错、不影响一屏排版
- 使用 JS API **1.4.17**（2.0 会创建 `javascript:` iframe 触发 CSP 拦截）；两版内部都用 `new Function`，因此构建产物 CSP 放行 `'unsafe-eval'`（源码本身仍无 `eval`）
- 驾车路线几何预置在 `src/data/mock.js` 各目的地的 `routePath`（OSRM 真实道路规划导出，WGS-84），上图前逐点转 GCJ-02 画实线；**不依赖 `AMap.Driving`，因此无需安全密钥**
- 切换目的地时按路线包围盒重新居中缩放，起终点标记随路线首尾绘制
- mock 坐标为 WGS-84，上图前由 [geo.js](file:///workspace/car-weather-system/src/maps/geo.js) 转 GCJ-02
- 离线快照由在线地图截取（`src/public/map/`），已包含真实路线；改主题或换目的地后重新截图即可

CSP 已放行 `webapi.amap.com`、`*.amap.com`、`*.autonavi.com`。

## 校验

```bash
npm test               # domain 规则 + 适配层 + 模型契约单测（65 例）
npm run check:dist     # 需先 npm run build
npm run check:contract # 与模型仓 contract.json 比对，模型仓缺失时跳过
```

`npm test` 覆盖雨量等级边界、暴雨辅助开关两态与四级策略、山洪双规则判定与风险分、钓鱼评分单调性与评级分界、天气要素展示口径换算，以及天气适配层的字段单位归一化与接口失败降级；`model.contract.test.js` 额外锁定模型契约的 16 个逐时字段、单位、时区、`null` 处理与传感器行映射。

`npm run check:contract` 见「模型契约」一节。

`npm run check:dist` 检查项：产物页面齐全、5 页 App Shell 逐字节一致（含片段注入残留检测）、`data-page` 标识、资源引用有效性、CSP 已注入且无内联脚本/外链、样式与脚本产物引用。

## 数据契约

- `src/data/mock.js` → `export { DB }`：所有 mock 原始读数的唯一来源
- `src/domain/*`：纯函数规则，`rainLevelOf` / `rainAssistPlan` / `evaluateFlood` / `fishingScore` / `pressureStateOf`，以及天气展示口径 `windTextOf` / `skyOf` / `rainChanceOf` / `feelsOf` / `visibilityOf` / `pressureTrendOf`
- `src/adapters/*`：`Sensor.readVehicleRain / readBasinGauge`、`Weather.readSeries`（真实接口，首页与露营到达天气共用）/ `readBasinForecast / readArrivalBrief / readFishingSpot`（mock；`readArrivalBrief` 只提供舒适度/装备/安全文案与兜底要素，到达时刻的天气由 api 层按目的地经纬度取真实序列计算）、`Amap.searchDestination`（含 `routePath` 真实路线几何）/ `planRoute`
- `src/api/api.js` → `export { Api }`：`getDashboard / setRainAssist / planDestination / getFloodStatus / getFishingWindow`，每个函数标注了预期的 HTTP method 与 path，接后端时只替换 adapters 实现，本层返回结构不变
- `src/core/icons.js`：`data-icon="name"` 挂载内联 SVG，无 CDN、无字体图标
- `src/config/model-contract.json`：模型输入契约镜像，字段 / 单位 / 参数以模型仓 `contract.json` 为准，由 `npm run check:contract` 校验漂移
- `Weather.readDecisionSeries` / `Sensor.toModelRow`：模型输入边界；当前无页面调用，接入前不影响现有 UI

## 模型契约（car_weather_model）

`car_weather_model` 是待接入的决策模型仓库。当前只完成**输入契约与数据准备**，页面尚未消费模型结果；系统仓不依赖模型仓即可 `dev / build / test`。

- 契约镜像：[model-contract.json](file:///workspace/car-weather-system/src/config/model-contract.json) 逐字同步模型仓的 `contract.json`（`schemaVersion` 1.0.0），包含：
  - 16 个逐时字段的名称、单位、合理区间与请求窗口（过去 1 天 / 未来 3 天）
  - 传感器 8 列（`time / mode / t_c / rh_pct / p_sta_hpa / rain_mm / lux / speed_kmh`）及 QC 量程
  - 时间口径：内部 UTC、展示与传感器日志 `+08:00`
  - 决策参数与临界雨量（默认停留时长、48h 视界、OI 权重、默认阈值等）
- 决策序列：[weather.js](file:///workspace/car-weather-system/src/adapters/weather.js#L272-L274) 的 `Weather.readDecisionSeries(site)` 输出**模型字段原名 + Open-Meteo 原始单位 + UTC 时间戳**；展示序列仍走 `minutely_15`，两套口径不混用。
- 传感器行：[sensor.js](file:///workspace/car-weather-system/src/adapters/sensor.js#L42-L53) 的 `Sensor.toModelRow(reading)` 把内部读数映射为契约行，缺失值保持 `null`，时间固定 `+08:00`，交由模型侧 QC。真实 5 传感器数据仍需 Capacitor 原生插件（CAN / OBD / 车机 SDK）。
- 跨仓校验：[check-model-contract.mjs](file:///workspace/car-weather-system/scripts/check-model-contract.mjs) 对比本地镜像与 `../car_weather_model/contract.json`，可用 `MODEL_CONTRACT=/path/to/contract.json` 指定路径。一致输出 `[contract] ok`；漂移时列出差异键并以退出码 1 失败；模型仓未检出时输出 skip 并以退出码 0 跳过，不阻塞独立构建。

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

# 车象 WeatherOS · 车载气象监测系统

车载场景下的气象监测与出行辅助前端原型。5 个页面、Vite 多页构建、零运行时依赖，构建产物可直接离线部署。

> 当前为 **UI 原型阶段**：数据来自 `src/data/mock.js`，接口为 `src/api/api.js` 中的 stub，未接真实后端。

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
│  ├─ domain/  rain.js  rainstorm.rules.js  flood.rules.js  fishing.rules.js
│  ├─ api/     api.js                          # 接口 stub（签名即未来真实接口）
│  ├─ data/    mock.js                         # 单一 mock 数据源（只存原始读数）
│  ├─ pages/   index.js  rainstorm.js  camping.js  flood.js  fishing.js
│  ├─ styles/  tokens.css → base.css → components.css → pages.css / main.css
│  └─ public/  icon.svg  manifest.webmanifest
├─ tests/      rainstorm.rules.test.js  flood.rules.test.js  fishing.rules.test.js
├─ scripts/    check-dist.mjs                  # 构建产物自检
├─ dist/                                       # 构建产物（git 忽略）
└─ .github/workflows/ci.yml
```

分层约束（单向依赖 `adapters → api → domain → view`）：

- `core/*` 通用工具，不依赖任何业务模块
- `domain/*` 纯业务规则（雨量→车速/跟车、山洪双规则、钓鱼评分），**只做计算，不触碰 DOM / 网络 / localStorage**，阈值由调用方传入
- `data/*` 只存原始读数，不存"结论型"字段；页面所需结论一律由 `domain/*` 现算
- `api/*` 组织数据并调用 `domain/*`，签名即未来真实接口
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

## 校验

```bash
npm test             # domain 纯规则单测（32 例）
npm run check:dist   # 需先 npm run build
```

`npm test` 覆盖雨量等级边界、暴雨辅助开关两态与四级策略、山洪双规则判定与风险分、钓鱼评分单调性与评级分界。

`npm run check:dist` 检查项：产物页面齐全、5 页 App Shell 逐字节一致（含片段注入残留检测）、`data-page` 标识、资源引用有效性、CSP 已注入且无内联脚本/外链、样式与脚本产物引用。

## 数据契约

- `src/data/mock.js` → `export { DB }`：所有 mock 原始读数的唯一来源
- `src/domain/*`：纯函数规则，`rainLevelOf` / `rainAssistPlan` / `evaluateFlood` / `fishingScore` / `pressureStateOf`
- `src/api/api.js` → `export { Api }`：`getDashboard / setRainAssist / planDestination / getFloodStatus / getFishingWindow`，每个函数标注了预期的 HTTP method 与 path，内部调用 `domain/*` 计算，接后端时只替换函数体
- `src/core/icons.js`：`data-icon="name"` 挂载内联 SVG，无 CDN、无字体图标

## 兼容性

面向车载 WebView，构建目标 `es2018`。源码避免 `?.` / `??`，`async/await` 起步即可运行（Chrome 65+）。

已知样式层风险（仅影响老旧 WebView，Android 10+ 无此问题）：

- flex `gap`：Chrome 84+；Android 7/8 车载 WebView 可能丢失间距
- `color-mix()`：Chrome 111+；失效处为装饰性背景与阴影
- `backdrop-filter`：Chrome 76+；不支持时退化为半透明背景

## 后续规划

1. ~~**业务规则下沉**：抽 `domain/`（雨量→车速/跟车、山洪双规则、钓鱼评分）为纯函数并补单测~~ ✅ 已完成
2. **外部依赖隔离**：`adapters/`（雨量传感器、天气、高德）统一接口
3. **后端接入**：替换 `src/api/api.js` 的 stub 实现
4. **Android 打包**：Capacitor（`webDir: dist`），横屏 + 沉浸式 + keep-awake

## 许可

[MIT](LICENSE)

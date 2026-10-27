import { defineConfig, type Plugin } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const SRC = resolve(ROOT, 'src');

const PAGES = ['index', 'rainstorm', 'camping', 'flood', 'fishing'];

/* 把 <!-- @include shell/xxx.html --> 替换为片段内容 */
function htmlPartials(): Plugin {
  return {
    name: 'cw-html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html: string) {
        return html.replace(/<!--\s*@include\s+([\w./-]+)\s*-->/g, (_m, file: string) => {
          return readFileSync(resolve(SRC, file), 'utf8').replace(/\s+$/, '');
        });
      },
    },
  };
}

/* 仅在构建产物中注入 CSP，避免开发期 HMR 的 ws 连接被拦截 */
function productionCsp(): Plugin {
  return {
    name: 'cw-production-csp',
    apply: 'build',
    transformIndexHtml(html: string) {
      const meta =
        `  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; ` +
        `style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'">`;
      return html.replace('</head>', `${meta}\n</head>`);
    },
  };
}

export default defineConfig({
  root: SRC,
  base: './',
  publicDir: resolve(SRC, 'public'),
  plugins: [htmlPartials(), productionCsp()],
  build: {
    outDir: resolve(ROOT, 'dist'),
    emptyOutDir: true,
    target: 'es2018',
    rollupOptions: {
      input: Object.fromEntries(PAGES.map((p) => [p, resolve(SRC, `${p}.html`)])),
    },
  },
  server: { port: 5173 },
  preview: { port: 4174 },
});

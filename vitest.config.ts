import { defineConfig } from 'vitest/config';

/* 单测只覆盖 domain/ 纯规则，不依赖浏览器环境；与 vite.config.ts 的 MPA 配置解耦 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});

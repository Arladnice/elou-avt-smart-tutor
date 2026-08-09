import { fileURLToPath, URL } from 'node:url'
// defineConfig берём из vitest/config: он расширяет конфиг vite секцией test
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Абсолютные импорты между слоями FSD: @/shared, @/entities, @/widgets, ...
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  test: {
    // jsdom, а не node: провайдер работает с WebSocket, sessionStorage и DOM
    environment: 'jsdom',
    globals: true,
    // Тесты лежат рядом с проверяемым кодом, как и остальные файлы слайса
    include: ['src/**/*.test.{ts,tsx}'],
  }
})

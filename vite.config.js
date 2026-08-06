import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    open: true,
  },
  optimizeDeps: {
    exclude: ['@mediapipe/hands', '@mediapipe/camera_utils', '@mediapipe/drawing_utils'],
  },
})

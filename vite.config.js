import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/qwen-chat': {
        target: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/qwen-chat/, '/chat/completions'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            proxyReq.setHeader('Authorization', `Bearer ${process.env.VITE_QWEN_API_KEY || ''}`);
            proxyReq.setHeader('Content-Type', 'application/json');
          });
        }
      }
    }
  }
})

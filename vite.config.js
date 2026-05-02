import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://oracleapex.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/ords/yash_tt/ai-builder'),
      },
    },
  },
});

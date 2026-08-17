import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        vel: fileURLToPath(new URL('./vel/index.html', import.meta.url)),
      },
    },
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
  },
});

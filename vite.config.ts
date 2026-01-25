import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backend = env.VITE_BACKEND_URL || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Keep Host as Vite origin so Google OAuth callback stays on the FE origin in dev.
        '/api': { target: backend, changeOrigin: false },
        '/auth': { target: backend, changeOrigin: false },
        '/socket.io': { target: backend, changeOrigin: false, ws: true },
      },
    },
  };
});

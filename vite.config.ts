import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  const backend = env.VITE_BACKEND_URL || "http://3.37.103.167";

  return {
    plugins: [react()],
    server: {
      proxy: {
        // Keep Host as Vite origin so Google OAuth callback stays on the FE origin in dev.
        '/api': { target: backend, changeOrigin: false },
        '/auth': { target: backend, changeOrigin: false },
        '/socket.io': {
          target: backend,
          changeOrigin: false,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              // 백엔드 미실행 시 발생하는 프록시 오류 무시
              if (err.message.includes('ECONNRESET') || err.message.includes('EPIPE') || err.message.includes('ECONNREFUSED')) {
                return;
              }
              console.error('[proxy error]', err.message);
            });
          },
        },
      },
    },
  };
});

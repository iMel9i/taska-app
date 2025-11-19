import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: '../bot/static', // важно! собираем статику прямо в папку бота (чтобы Railway отдал через один домен)
    emptyOutDir: true,
  },
}); 

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from GitHub Pages at /construction-job-manager/
export default defineConfig({
  base: '/construction-job-manager/',
  plugins: [react()],
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            const normalizedId = id.replaceAll('\\', '/');
            if (normalizedId.includes('/node_modules/')) {
              if (normalizedId.includes('/node_modules/recharts/')) return 'vendor-charts';
              if (normalizedId.includes('/node_modules/lucide-react/')) return 'vendor-icons';
              if (normalizedId.includes('/node_modules/react-router')) return 'vendor-router';
              if (
                normalizedId.includes('/node_modules/react/') ||
                normalizedId.includes('/node_modules/react-dom/') ||
                normalizedId.includes('/node_modules/scheduler/')
              ) return 'vendor-react';
            }

            if (normalizedId.includes('/src/views/ApiDocsView')) return 'view-api-docs';
            if (normalizedId.includes('/src/views/AIConfigurationView')) return 'view-ai-config';
            if (normalizedId.includes('/src/views/SuperAdminView')) return 'view-super-admin';
            return undefined;
          },
        },
      },
    },
  };
});

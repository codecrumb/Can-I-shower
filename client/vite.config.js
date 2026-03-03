import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
    root: path.resolve(__dirname),
    plugins: [vue()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    build: {
        outDir: path.resolve(__dirname, '../public'),
        emptyOutDir: true,
    },
    server: {
        proxy: {
            '/api': 'http://localhost:3000',
        },
    },
});

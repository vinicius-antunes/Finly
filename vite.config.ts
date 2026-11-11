import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  plugins: [react(), tailwindcss(), {
    name: 'finly-build-identity',
    generateBundle() {
      const commit = process.env.CF_PAGES_COMMIT_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
      const branch = process.env.CF_PAGES_BRANCH || execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim();
      this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify({ commit, branch }) });
    },
  }],
  build: { outDir: 'dist', emptyOutDir: true },
});

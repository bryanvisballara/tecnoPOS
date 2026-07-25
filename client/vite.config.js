import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function buildIdPlugin() {
  const id = `v-${Date.now()}`;
  return {
    name: 'tecno-build-id',
    transformIndexHtml(html) {
      return html
        .replace(
          '</head>',
          `  <meta name="tp-build" content="${id}" />\n    <meta http-equiv="Cache-Control" content="no-store" />\n  </head>`
        )
        .replace('<title>TecnoPOS</title>', `<title>TecnoPOS ${id}</title>`);
    },
    closeBundle() {
      const out = path.resolve(__dirname, 'dist/build-id.json');
      fs.writeFileSync(out, JSON.stringify({ id, at: new Date().toISOString() }, null, 2));
    },
  };
}

export default defineConfig({
  plugins: [react(), buildIdPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:10000',
      '/socket.io': {
        target: 'http://localhost:10000',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});

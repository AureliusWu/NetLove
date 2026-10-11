import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Test-only host for two installations of the same game and a parent worker.
// Cookies control each isolated browser context's worker update/failure fixture.
const root = path.resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1:4184');
    response.setHeader('Cache-Control', 'no-store');
    if (url.pathname === '/parent-sw.js') {
      response.setHeader('Content-Type', types['.js']);
      response.end("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));"); return;
    }
    if (url.pathname === '/') { response.setHeader('Content-Type', types['.html']); response.end('<!doctype html><title>Parent worker fixture</title>'); return; }
    const parts = url.pathname.match(/^\/(NetLove|Copy)\/(.*)$/);
    if (!parts) { response.writeHead(404).end(); return; }
    const relative = decodeURIComponent(parts[2] || 'index.html');
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    const cookies = request.headers.cookie || '';
    // A failing background affects only worker precache; tests do not start reading.
    if (cookies.includes('pwa-fail=1') && relative === 'art/bedroom.webp') { response.writeHead(503).end('fixture unavailable'); return; }
    let bytes = await readFile(file);
    if (relative === 'sw.js' && cookies.includes('pwa-update=1')) {
      const source = bytes.toString();
      if (!/const CACHE = PREFIX \+ "[a-f0-9]+";/.test(source)) throw new Error('Worker update fixture did not match cache identity');
      bytes = Buffer.from(source.replace(/(const CACHE = PREFIX \+ ")[a-f0-9]+(";)/, '$1fixture-update$2'));
    }
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    response.end(bytes);
  } catch (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Test host request failed'); }
}).listen(4184, '127.0.0.1', () => console.log('PWA fixture host: http://127.0.0.1:4184'));

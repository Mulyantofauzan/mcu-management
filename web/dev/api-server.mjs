/* Server API lokal untuk pengembangan: menjalankan handler api/* apa adanya, tanpa Vercel CLI.
   Pakai: npm run api:dev (membaca .env.local di folder utama). Hanya untuk mesin lokal. */
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const port = Number(process.env.API_PORT || 3000);

function handlerFile(name) {
  if (!/^[a-z0-9-]+$/.test(name)) return null;
  const candidates = [path.join(root, 'api', name, 'index.js'), path.join(root, 'api', `${name}.js`)];
  return candidates.find(file => fs.existsSync(file)) || null;
}

function decorate(res) {
  res.status = code => { res.statusCode = code; return res; };
  res.json = body => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(body));
    return res;
  };
  return res;
}

const server = http.createServer(async (req, res) => {
  decorate(res);
  const url = new URL(req.url, `http://localhost:${port}`);
  const match = url.pathname.match(/^\/api\/([^/]+)\/?$/);
  const file = match && handlerFile(match[1]);
  if (!file) return res.status(404).json({ error: 'Endpoint tidak ditemukan' });
  req.query = Object.fromEntries(url.searchParams);
  try {
    await require(file)(req, res);
  } catch (error) {
    console.error(`[api/${match[1]}]`, error);
    if (!res.headersSent) res.status(500).json({ error: 'Kesalahan server lokal' });
  }
});

server.listen(port, () => console.log(`API lokal siap di http://localhost:${port}/api/...`));

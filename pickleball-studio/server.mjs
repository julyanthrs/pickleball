import http from 'node:http';
import fs from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { initializeLocalPortal, localPortal } from './portal/local.mjs';
import {reclubResponse} from './reclub-service.mjs';
await import('./scripts/build-client.mjs');
await initializeLocalPortal();
const root = fileURLToPath(new URL('./dist/', import.meta.url));
const dev = process.argv.includes('--dev');
const openBrowser = process.argv.includes('--open') && !process.argv.includes('--no-open');
let port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a whole number between 1 and 65535.');
let portAttempts = 0;
let watcher, heartbeat, timer;
function cleanup() { watcher?.close(); clearInterval(heartbeat); clearTimeout(timer); }
const clients = new Set();
const reloadScript = `<script>const liveReload = new EventSource('/__dev/events'); liveReload.addEventListener('reload', () => { if (!document.querySelector('dialog[open]')) location.reload(); else { const dialog = document.querySelector('dialog[open]'); dialog.addEventListener('close', () => location.reload(), { once: true }); } });</script>`;
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if(pathname==='/api/reclub'){
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>4096){res.writeHead(413).end();return;}chunks.push(chunk);}
      const response=await reclubResponse(new Request('http://localhost/api/reclub',{method:req.method,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)}));
      res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    if(pathname.startsWith('/api/portal/')||pathname.startsWith('/public-api/')){
      if(!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host||'')){res.writeHead(403).end();return;}
      const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>2100000){res.writeHead(413).end();return;}chunks.push(chunk);}
      const request=new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});
      const response=await localPortal(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
    }
    if(pathname.startsWith('/player/')||['/player.js','/player.css','/player-updates.js'].includes(pathname)){
      const asset=pathname==='/player-updates.js'?'player-updates.js':pathname==='/player.js'?'player.js':pathname==='/player.css'?'player.css':pathname==='/player/icon.svg'?'../dist/icon.svg':'player.html';
      const content=await fs.readFile(new URL('./portal/'+asset,import.meta.url));res.writeHead(200,{'Content-Type':mime[path.extname(asset)],'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}).end(content);return;
    }
    if (dev && pathname === '/__dev/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
      res.write(': live reload connected\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    const relative = decodeURIComponent(pathname).replace(/^\/+/, '') || 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(path.resolve(root) + path.sep)) { res.writeHead(403).end(); return; }
    let content = await fs.readFile(file);
    if (dev && path.extname(file) === '.html') content = content.toString().replace('</body>', reloadScript + '</body>');
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(content);
  } catch { res.writeHead(404).end('Not found'); }
});
server.on('error', error => {
  if (dev && error.code === 'EADDRINUSE' && portAttempts < 20 && port < 65535) {
    console.log(`Port ${port} is in use; trying ${port + 1}…`);
    port++;
    portAttempts++;
    server.listen(port, '127.0.0.1');
    return;
  }
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Stop the existing preview or choose another PORT.` : error.message);
  cleanup();
  process.exitCode = 1;
});
server.on('listening', () => {
  const url = `http://localhost:${port}`;
  console.log(`\n  READY · Pickleball Studio${dev ? ' · Development' : ''}\n  Open: ${url}\n${dev ? '  Live reload enabled. Edit files in dist/ to refresh the browser.\n' : ''}  The server is running. Keep this terminal open.\n  Press Ctrl+C to stop.\n`);
  if (openBrowser) {
    const command = process.platform === 'win32' ? ['rundll32.exe', 'url.dll,FileProtocolHandler', url] : process.platform === 'darwin' ? ['open', url] : ['xdg-open', url];
    const browser = spawn(command[0], command.slice(1), { stdio: 'ignore', windowsHide: true });
    browser.on('error', () => console.log(`  Open your browser manually: ${url}`));
    browser.unref();
  }
});
server.listen(port, '127.0.0.1');
if (dev) {
  watcher = watch(root, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => { for (const client of clients) client.write('event: reload\ndata: changed\n\n'); }, 150);
  });
  heartbeat = setInterval(() => { for (const client of clients) client.write(': heartbeat\n\n'); }, 15000);
  server.on('close', cleanup);
}

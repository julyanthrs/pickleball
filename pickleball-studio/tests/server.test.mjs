import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

test('development starts on another port when its requested port is occupied', { timeout: 10000 }, async t => {
  const occupied = http.createServer((req, res) => res.end('Existing server'));
  occupied.listen(0, '127.0.0.1');
  await once(occupied, 'listening');
  t.after(() => occupied.close());
  const requestedPort = occupied.address().port;
  const child = spawn(process.execPath, [fileURLToPath(new URL('../server.mjs', import.meta.url)), '--dev'], {
    // Deliberately run outside the app folder to verify path-independent serving.
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    env: { ...process.env, PORT: String(requestedPort) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  t.after(() => child.kill());
  let output = '';
  const actualPort = await new Promise((resolve, reject) => {
    child.stdout.on('data', chunk => {
      output += chunk;
      const match = output.match(/Open: http:\/\/localhost:(\d+)/);
      if (match) resolve(Number(match[1]));
    });
    child.once('error', reject);
    child.once('exit', code => reject(new Error('Dev server exited before starting: ' + code)));
  });
  assert.notEqual(actualPort, requestedPort);
  assert.match(output, /is in use; trying/);
  assert.match(output, /READY/);
  assert.match(output, /Keep this terminal open/);
  const response = await fetch(`http://127.0.0.1:${actualPort}`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Pickleball Studio/);
  const qr = await fetch(`http://127.0.0.1:${actualPort}/qr.js`);
  assert.equal(qr.status, 200);
  assert.match(await qr.text(), /toDataURL/);
  const updates = await fetch(`http://127.0.0.1:${actualPort}/player-updates.js`);
  assert.equal(updates.status, 200);
  assert.match(await updates.text(), /playerNotifications/);
  const events = await fetch(`http://127.0.0.1:${actualPort}/__dev/events`);
  assert.equal(events.headers.get('content-type'), 'text/event-stream');
  await events.body.cancel();
  assert.equal(await (await fetch(`http://127.0.0.1:${requestedPort}`)).text(), 'Existing server');
});

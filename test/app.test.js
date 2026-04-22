const { test } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../src/app');

function request(server, path) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${server.address().port}${path}`, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
    }).on('error', reject);
  });
}

test('GET /health retorna status ok', async () => {
  const server = app.listen(0);
  try {
    const res = await request(server, '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
  } finally {
    server.close();
  }
});

test('GET /version retorna nome e versão do app', async () => {
  const server = app.listen(0);
  try {
    const res = await request(server, '/version');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'gitlab-flow-demo');
    assert.ok(res.body.version);
  } finally {
    server.close();
  }
});

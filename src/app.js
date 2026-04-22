const express = require('express');
const pkg = require('../package.json');

const app = express();
const port = process.env.PORT || 3000;
const environment = process.env.APP_ENV || 'local';

app.get('/', (req, res) => {
  res.json({
    app: pkg.name,
    message: 'Olá! Este é o app de demonstração do GitLab Flow.',
    environment,
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/version', (req, res) => {
  res.json({
    name: pkg.name,
    version: pkg.version,
    environment,
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`[${environment}] app rodando em http://localhost:${port}`);
  });
}

module.exports = app;

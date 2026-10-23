const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { initDatabase } = require('./backend/config/database');
const { handleApiRoutes } = require('./backend/routes/api.router');
const companyService = require('./backend/services/company.service');

const PORT = process.env.PORT || 8080;
const DIST = path.join(__dirname, 'dist', 'emitta-frontend-angular', 'browser');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json'
};

async function startServer() {
  // Inicializar Base de Datos (MongoDB Atlas o Fallback JSON)
  await initDatabase();

  const server = http.createServer((req, res) => {
    // 1. Manejo de Preflight CORS (OPTIONS)
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*'
      });
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    // 2. Rutas del Backend Propio (/api/pos/...)
    if (parsedUrl.pathname.startsWith('/api/pos')) {
      let bodyData = '';
      req.on('data', chunk => bodyData += chunk);
      req.on('end', () => {
        let body = null;
        if (bodyData) {
          try { body = JSON.parse(bodyData); } catch {}
        }
        const handled = handleApiRoutes(req, res, parsedUrl, body);
        if (!handled) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Ruta API POS no encontrada' }));
        }
      });
      return;
    }

    // 3. Proxy Transparente hacia la API de Emitta (/api/v1/...)
    if (req.url.startsWith('/api/v1') || req.url.startsWith('/api/')) {
      // Si es el endpoint de token y se solicita usar la empresa activa:
      companyService.getActiveCompany().then(activeCompany => {
        const targetHost = 'api-emitta.nexorf.dev';
        const headers = { ...req.headers };
        headers['host'] = targetHost;
        delete headers['origin'];
        delete headers['referer'];

        let bodyBuffer = null;

        // Si la petición es /auth/token y tenemos una empresa activa con credenciales dinámicas
        if (parsedUrl.pathname === '/api/v1/auth/token' && req.method === 'POST') {
          let rawAuth = '';
          req.on('data', chunk => rawAuth += chunk);
          req.on('end', () => {
            let creds = null;
            try { creds = JSON.parse(rawAuth); } catch {}

            // Si el cliente no mandó credenciales específicas o pide las de la empresa activa
            if (activeCompany && (!creds || !creds.clientId || creds.clientId === 'AUTO')) {
              creds = {
                clientId: activeCompany.clientId,
                clientSecret: activeCompany.clientSecret
              };
            }

            const bodyStr = JSON.stringify(creds || {});
            headers['content-type'] = 'application/json';
            headers['content-length'] = Buffer.byteLength(bodyStr);

            const proxyReq = https.request({
              hostname: targetHost,
              port: 443,
              path: req.url,
              method: req.method,
              headers: headers
            }, (proxyRes) => {
              const resHeaders = { ...proxyRes.headers };
              resHeaders['access-control-allow-origin'] = '*';
              resHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
              resHeaders['access-control-allow-headers'] = '*';
              res.writeHead(proxyRes.statusCode, resHeaders);
              proxyRes.pipe(res);
            });

            proxyReq.on('error', err => {
              console.error('Proxy auth error:', err.message);
              if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Error comunicando con API Emitta', details: err.message }));
              }
            });

            proxyReq.write(bodyStr);
            proxyReq.end();
          });
          return;
        }

        // Cualquier otra petición hacia Emitta se reenvía directamente
        const proxyReq = https.request({
          hostname: targetHost,
          port: 443,
          path: req.url,
          method: req.method,
          headers: headers
        }, (proxyRes) => {
          const resHeaders = { ...proxyRes.headers };
          resHeaders['access-control-allow-origin'] = '*';
          resHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
          resHeaders['access-control-allow-headers'] = '*';
          res.writeHead(proxyRes.statusCode, resHeaders);
          proxyRes.pipe(res);
        });

        proxyReq.on('error', err => {
          console.error('Proxy error:', err.message);
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Error comunicando con API Emitta', details: err.message }));
          }
        });

        req.pipe(proxyReq);
      }).catch(err => {
        console.error('Error al resolver empresa activa:', err);
      });
      return;
    }

    // 4. Servir archivos estáticos del frontend Angular
    let filePath = path.join(DIST, decodeURIComponent(parsedUrl.pathname));

    fs.stat(filePath, (err, stats) => {
      if (!err && stats.isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType });
        fs.createReadStream(filePath).pipe(res);
      } else {
        // 5. Fallback SPA: responder index.html para rutas Angular (/pos, /documentos, etc.)
        const indexPath = path.join(DIST, 'index.html');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        fs.createReadStream(indexPath).pipe(res);
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`🚀 Emitta POS v2 Server corriendo en puerto ${PORT}`);
  });
}

startServer();

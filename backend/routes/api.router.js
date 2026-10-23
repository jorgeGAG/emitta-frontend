const companyService = require('../services/company.service');
const authService = require('../services/auth.service');
const invoiceService = require('../services/invoice.service');
const { isMongoConnected } = require('../config/database');

function handleApiRoutes(req, res, parsedUrl, body) {
  const pathname = parsedUrl.pathname;
  const method = req.method;

  res.setHeader('Content-Type', 'application/json; charset=UTF-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  // --- ESTADO DEL SISTEMA Y BASE DE DATOS ---
  if (pathname === '/api/pos/system/status' && method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ONLINE',
      database: isMongoConnected() ? 'MongoDB Atlas (Nube)' : 'Repositorio Local JSON (Fallback)',
      isMongoAtlas: isMongoConnected(),
      serverTime: new Date().toISOString()
    }));
    return true;
  }

  // --- EMPRESAS (MULTI-EMPRESA) ---
  if (pathname === '/api/pos/companies' && method === 'GET') {
    companyService.getCompanies()
      .then(companies => {
        res.writeHead(200);
        res.end(JSON.stringify(companies));
      })
      .catch(err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      });
    return true;
  }

  if (pathname === '/api/pos/companies/active' && method === 'GET') {
    companyService.getActiveCompany()
      .then(active => {
        res.writeHead(200);
        res.end(JSON.stringify(active || {}));
      })
      .catch(err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      });
    return true;
  }

  if (pathname === '/api/pos/companies/test-and-save' && method === 'POST') {
    companyService.testAndConnectCompany(body || {})
      .then(newCompany => {
        res.writeHead(201);
        res.end(JSON.stringify({ success: true, company: newCompany }));
      })
      .catch(err => {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: err.message }));
      });
    return true;
  }

  if (pathname === '/api/pos/companies/switch' && method === 'POST') {
    companyService.setActiveCompany(body?.companyId)
      .then(active => {
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, company: active }));
      })
      .catch(err => {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: err.message }));
      });
    return true;
  }

  // --- AUTENTICACIÓN Y USUARIOS ---
  if (pathname === '/api/pos/auth/login' && method === 'POST') {
    console.log(`🔐 [AUTH] Solicitud de login para usuario: "${body?.username}"`);
    authService.login(body?.username, body?.password)
      .then(result => {
        console.log(`🔑 [AUTH] Resultado para "${body?.username}": ${result.success ? 'AUTORIZADO (200)' : 'DENEGADO (401) - ' + result.error}`);
        res.writeHead(result.success ? 200 : 401, {
          'Content-Type': 'application/json; charset=UTF-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(result));
      })
      .catch(err => {
        console.error(`❌ [AUTH] Error servidor: ${err.message}`);
        res.writeHead(500, {
          'Content-Type': 'application/json; charset=UTF-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: false, error: err.message }));
      });
    return true;
  }

  if (pathname === '/api/pos/auth/users' && method === 'GET') {
    const companyId = parsedUrl.searchParams.get('companyId');
    authService.getUsers(companyId)
      .then(users => {
        res.writeHead(200);
        res.end(JSON.stringify(users));
      })
      .catch(err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      });
    return true;
  }

  if (pathname === '/api/pos/auth/users' && method === 'POST') {
    authService.createUser(body || {})
      .then(newUser => {
        res.writeHead(201);
        res.end(JSON.stringify({ success: true, user: newUser }));
      })
      .catch(err => {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: err.message }));
      });
    return true;
  }

  // --- FACTURAS EN BASE DE DATOS ---
  if (pathname === '/api/pos/invoices' && method === 'GET') {
    const companyId = parsedUrl.searchParams.get('companyId');
    invoiceService.getInvoices(companyId)
      .then(invoices => {
        res.writeHead(200);
        res.end(JSON.stringify(invoices));
      })
      .catch(err => {
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      });
    return true;
  }

  if (pathname === '/api/pos/invoices' && method === 'POST') {
    invoiceService.saveInvoice(body || {})
      .then(saved => {
        res.writeHead(201);
        res.end(JSON.stringify({ success: true, invoice: saved }));
      })
      .catch(err => {
        res.writeHead(400);
        res.end(JSON.stringify({ success: false, error: err.message }));
      });
    return true;
  }

  return false;
}

module.exports = {
  handleApiRoutes
};

const https = require('https');
const repoFactory = require('../repositories/RepositoryFactory');

function httpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, raw: data, headers: res.headers });
        }
      });
    });

    req.on('error', err => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

class CompanyService {
  async getCompanies() {
    return await repoFactory.repository.getCompanies();
  }

  async getActiveCompany() {
    return await repoFactory.repository.getActiveCompany();
  }

  async setActiveCompany(companyId) {
    return await repoFactory.repository.setActiveCompany(companyId);
  }

  /**
   * Conectar y Probar con la API de Emitta en tiempo real
   */
  async testAndConnectCompany({ name, clientId, clientSecret }) {
    if (!clientId || !clientSecret) {
      throw new Error('El Client ID y Client Secret son requeridos.');
    }

    const cleanClientId = clientId.trim();
    const cleanClientSecret = clientSecret.trim();

    // Paso 1: Autenticar en la API de Emitta
    const authRes = await httpsRequest({
      hostname: 'api-emitta.nexorf.dev',
      port: 443,
      path: '/api/v1/auth/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, { clientId: cleanClientId, clientSecret: cleanClientSecret });

    if (authRes.status !== 200 || !authRes.data?.accessToken) {
      throw new Error('Credenciales inválidas. La API de Emitta rechazó el Client ID o Client Secret.');
    }

    const token = authRes.data.accessToken;

    // Paso 2: Descargar configuración fiscal del SRI
    const fiscalRes = await httpsRequest({
      hostname: 'api-emitta.nexorf.dev',
      port: 443,
      path: '/api/v1/fiscal-configuration?limit=50&offset=0',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    let taxpayer = null;
    let establishments = [];

    if (fiscalRes.status === 200 && Array.isArray(fiscalRes.data)) {
      const entry = fiscalRes.data[0];
      if (entry) {
        taxpayer = entry.taxpayer || null;
        establishments = entry.establishments || [];
      }
    }

    // Paso 3: Consultar vigencia de firma electrónica si hay contribuyente
    let certificateInfo = null;
    if (taxpayer?.id) {
      try {
        const certRes = await httpsRequest({
          hostname: 'api-emitta.nexorf.dev',
          port: 443,
          path: `/api/v1/taxpayers/${taxpayer.id}/certificates`,
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (certRes.status === 200 && Array.isArray(certRes.data) && certRes.data.length > 0) {
          const cert = certRes.data[0];
          certificateInfo = {
            subject: cert.subjectName || 'Certificado Digital SRI',
            validTo: cert.validTo || 'Vigente',
            active: cert.active !== false
          };
        }
      } catch (err) {
        console.warn('Advertencia consultando certificados:', err.message);
      }
    }

    // Paso 4: Construir modelo de la empresa
    const newCompany = {
      id: `comp_${Date.now()}`,
      name: name?.trim() || taxpayer?.tradeName || taxpayer?.legalName || 'Nueva Empresa',
      ruc: taxpayer?.identificationNumber || '0000000000001',
      legalName: taxpayer?.legalName || name || 'Razón Social no registrada',
      tradeName: taxpayer?.tradeName || name || 'Nombre Comercial no registrado',
      mainAddress: taxpayer?.mainAddress || 'Dirección Matriz',
      accountingObligation: taxpayer?.accountingObligation || false,
      clientId: cleanClientId,
      clientSecret: cleanClientSecret,
      isActive: true, // Se activa de inmediato
      establishments: establishments.map(est => ({
        code: est.code,
        name: est.name || `Establecimiento ${est.code}`,
        address: est.address || 'Dirección Sucursal'
      })),
      certificate: certificateInfo,
      createdAt: new Date().toISOString()
    };

    // Guardar en la base de datos
    await repoFactory.repository.saveCompany(newCompany);
    await repoFactory.repository.setActiveCompany(newCompany.id);

    return newCompany;
  }
}

module.exports = new CompanyService();

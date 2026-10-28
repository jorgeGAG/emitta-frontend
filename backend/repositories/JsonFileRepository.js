const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

const INITIAL_DATA = {
  companies: [
    {
      id: 'comp_jorge_01',
      name: 'Comercio Ecuador (Jorge Gabriel Ante)',
      ruc: '0550249817001',
      legalName: 'ANTE GUANOQUIZA JORGE GABRIEL',
      tradeName: 'Comercio Ecuador',
      mainAddress: 'COTOPAXI, SAQUISILI, SAQUISILI',
      clientId: 'emitta_0f0b2e0c-b6e3-4212-835b-0f7086d32aaa',
      clientSecret: '4JfhIbySCySjQN0hxcaIBY36d29GtaBCQWSOzVRxYKo',
      isActive: true,
      establishments: [
        { code: '001', name: 'Sucursal Saquisili', address: 'COTOPAXI, SAQUISILI, SAQUISILI' },
        { code: '002', name: 'Sucursal Latacunga', address: 'Latacunga' }
      ],
      createdAt: new Date().toISOString()
    }
  ],
  users: [
    {
      id: 'usr_super_01',
      username: 'superadmin',
      password: 'admin123',
      fullName: 'Super Administrador Global',
      email: 'superadmin@emitta.cloud',
      role: 'SUPERADMIN',
      branchCode: '001',
      boxCode: '001',
      branchName: 'Sede Global Multi-Empresa',
      companyId: null,
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_001',
      username: 'cajero1',
      password: '1234',
      fullName: 'Carlos Zambrano Loor',
      email: 'czambrano@mitienda.com',
      role: 'CAJERO',
      branchCode: '001',
      boxCode: '001',
      branchName: 'Sucursal Saquisili · Cotopaxi',
      companyId: 'comp_jorge_01',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_002',
      username: 'admin',
      password: '1234',
      fullName: 'Jorge Gabriel Ante',
      email: 'jorgeante@correo.com',
      role: 'ADMIN_EMPRESA',
      branchCode: '001',
      boxCode: '001',
      branchName: 'Sucursal Saquisili · Administración',
      companyId: 'comp_jorge_01',
      createdAt: new Date().toISOString()
    }
  ],
  products: [
    {
      id: 'prod_001',
      sku: 'PROD-01',
      name: 'Servicio de Consultoría y Desarrollo TI',
      description: 'Servicio técnico especializado mensual',
      unitPrice: 120.00,
      vatRate: 15,
      companyId: 'comp_default_01',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod_002',
      sku: 'PROD-02',
      name: 'Licencia de Software SaaS Mensual',
      description: 'Acceso a plataforma en la nube',
      unitPrice: 45.00,
      vatRate: 15,
      companyId: 'comp_default_01',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod_003',
      sku: 'PROD-03',
      name: 'Mantenimiento Preventivo de Equipos',
      description: 'Soporte técnico y revisión semestral',
      unitPrice: 35.00,
      vatRate: 15,
      companyId: 'comp_default_01',
      createdAt: new Date().toISOString()
    },
    {
      id: 'prod_004',
      sku: 'PROD-04',
      name: 'Capacitación en Facturación Electrónica',
      description: 'Taller de entrenamiento para cajeros (Exento 0% IVA)',
      unitPrice: 60.00,
      vatRate: 0,
      companyId: 'comp_default_01',
      createdAt: new Date().toISOString()
    }
  ],
  invoices: []
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DATA, null, 2), 'utf-8');
      return JSON.parse(JSON.stringify(INITIAL_DATA));
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error leyendo base de datos JSON:', err.message);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error escribiendo base de datos JSON:', err.message);
  }
}

class JsonFileRepository {
  // --- EMPRESAS ---
  async getCompanies() {
    const db = readDb();
    return db.companies || [];
  }

  async getActiveCompany() {
    const db = readDb();
    const active = (db.companies || []).find(c => c.isActive);
    return active || (db.companies || [])[0] || null;
  }

  async saveCompany(company) {
    const db = readDb();
    if (!db.companies) db.companies = [];

    const existingIndex = db.companies.findIndex(c => c.id === company.id || (c.clientId && c.clientId === company.clientId));
    if (existingIndex >= 0) {
      db.companies[existingIndex] = { ...db.companies[existingIndex], ...company };
    } else {
      db.companies.push(company);
    }
    writeDb(db);
    return company;
  }

  async setActiveCompany(companyId) {
    const db = readDb();
    if (!db.companies) return null;

    db.companies = db.companies.map(c => ({
      ...c,
      isActive: c.id === companyId
    }));
    writeDb(db);
    return db.companies.find(c => c.isActive);
  }

  // --- USUARIOS / CAJEROS ---
  async getUsers(companyId = null) {
    const db = readDb();
    if (!companyId) return db.users || [];
    return (db.users || []).filter(u => !u.companyId || u.companyId === companyId);
  }

  async findUser(username) {
    const db = readDb();
    const clean = (username || '').trim().toLowerCase();
    return (db.users || []).find(u => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean);
  }

  async saveUser(user) {
    const db = readDb();
    if (!db.users) db.users = [];

    const existingIndex = db.users.findIndex(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
    if (existingIndex >= 0) {
      db.users[existingIndex] = { ...db.users[existingIndex], ...user };
    } else {
      db.users.push(user);
    }
    writeDb(db);
    return user;
  }

  // --- FACTURAS ---
  async getInvoices(companyId = null) {
    const db = readDb();
    if (!companyId) return db.invoices || [];
    return (db.invoices || []).filter(inv => !inv.companyId || inv.companyId === companyId);
  }

  async saveInvoice(invoice) {
    const db = readDb();
    if (!db.invoices) db.invoices = [];

    const existingIndex = db.invoices.findIndex(inv =>
      (invoice.documentId && inv.documentId === invoice.documentId) ||
      inv.id === invoice.id ||
      (invoice.accessKey && inv.accessKey === invoice.accessKey)
    );
    if (existingIndex >= 0) {
      db.invoices[existingIndex] = { ...db.invoices[existingIndex], ...invoice };
    } else {
      db.invoices.unshift(invoice); // Las más recientes primero
    }
    writeDb(db);
    return invoice;
  }

  // --- PRODUCTOS / CATÁLOGO ---
  async getProducts(companyId = null) {
    const db = readDb();
    if (!db.products) db.products = [];
    if (!companyId) return db.products;
    return db.products.filter(p => !p.companyId || p.companyId === companyId || p.isGlobal);
  }

  async saveProduct(product) {
    const db = readDb();
    if (!db.products) db.products = [];
    const id = product.id || `prod_${Date.now()}`;
    const toSave = { ...product, id, updatedAt: new Date().toISOString() };
    const existingIndex = db.products.findIndex(p => p.id === id);
    if (existingIndex >= 0) {
      db.products[existingIndex] = { ...db.products[existingIndex], ...toSave };
    } else {
      db.products.push(toSave);
    }
    writeDb(db);
    return toSave;
  }

  async deleteProduct(productId) {
    const db = readDb();
    if (!db.products) return { success: true };
    db.products = db.products.filter(p => p.id !== productId);
    writeDb(db);
    return { success: true };
  }
}

module.exports = new JsonFileRepository();

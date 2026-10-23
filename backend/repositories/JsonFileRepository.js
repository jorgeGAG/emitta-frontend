const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'data', 'db.json');

const INITIAL_DATA = {
  companies: [
    {
      id: 'comp_default_01',
      name: 'Comercializadora Principal (Emitta Cloud)',
      ruc: '1792345678001',
      legalName: 'NEXORF TECNOLOGIAS Y FACTURACION S.A.S.',
      tradeName: 'EMITTA FACTURACION CLOUD',
      mainAddress: 'Av. República de El Salvador N36-84 y Naciones Unidas, Quito - Ecuador',
      clientId: 'emitta_0f0b2e0c-b6e3-4212-835b-0f7086d32aaa',
      clientSecret: '4JfhIbySCySjQN0hxcaIBY36d29GtaBCQWSOzVRxYKo',
      isActive: true,
      establishments: [
        { code: '001', name: 'Sucursal Matriz', address: 'Establecimiento 001, Matriz' }
      ],
      createdAt: new Date().toISOString()
    }
  ],
  users: [
    {
      id: 'usr_001',
      username: 'cajero1',
      password: '1234',
      fullName: 'Carlos Zambrano Loor',
      email: 'czambrano@mitienda.com',
      role: 'CAJERO',
      branchCode: '001',
      boxCode: '001',
      branchName: 'Sucursal Matriz · Guayaquil',
      companyId: 'comp_default_01',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_002',
      username: 'admin',
      password: '1234',
      fullName: 'Ing. María Elena Solís',
      email: 'msolis@mitienda.com',
      role: 'SUPERVISOR',
      branchCode: '001',
      boxCode: '002',
      branchName: 'Sucursal Matriz · Administración',
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

    const existingIndex = db.invoices.findIndex(inv => inv.id === invoice.id || inv.accessKey === invoice.accessKey);
    if (existingIndex >= 0) {
      db.invoices[existingIndex] = { ...db.invoices[existingIndex], ...invoice };
    } else {
      db.invoices.unshift(invoice); // Las más recientes primero
    }
    writeDb(db);
    return invoice;
  }
}

module.exports = new JsonFileRepository();

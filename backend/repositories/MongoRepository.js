const { getDatabase } = require('../config/database');

class MongoRepository {
  get db() {
    return getDatabase();
  }

  // --- EMPRESAS ---
  async getCompanies() {
    return await this.db.collection('companies').find({}).toArray();
  }

  async getActiveCompany() {
    const active = await this.db.collection('companies').findOne({ isActive: true });
    if (active) return active;
    return await this.db.collection('companies').findOne({});
  }

  async saveCompany(company) {
    const filter = company.id ? { id: company.id } : { clientId: company.clientId };
    await this.db.collection('companies').updateOne(
      filter,
      { $set: company },
      { upsert: true }
    );
    return company;
  }

  async setActiveCompany(companyId) {
    await this.db.collection('companies').updateMany({}, { $set: { isActive: false } });
    await this.db.collection('companies').updateOne({ id: companyId }, { $set: { isActive: true } });
    return await this.db.collection('companies').findOne({ id: companyId });
  }

  // --- USUARIOS ---
  async getUsers(companyId = null) {
    const filter = companyId ? { $or: [{ companyId }, { companyId: { $exists: false } }] } : {};
    return await this.db.collection('users').find(filter).toArray();
  }

  async findUser(username) {
    const clean = (username || '').trim().toLowerCase();
    return await this.db.collection('users').findOne({
      $or: [
        { username: { $regex: new RegExp(`^${clean}$`, 'i') } },
        { email: { $regex: new RegExp(`^${clean}$`, 'i') } }
      ]
    });
  }

  async saveUser(user) {
    await this.db.collection('users').updateOne(
      { username: user.username },
      { $set: user },
      { upsert: true }
    );
    return user;
  }

  // --- FACTURAS ---
  async getInvoices(companyId = null) {
    const filter = companyId ? { companyId } : {};
    return await this.db.collection('invoices').find(filter).sort({ createdAt: -1 }).toArray();
  }

  async saveInvoice(invoice) {
    await this.db.collection('invoices').updateOne(
      { $or: [{ id: invoice.id }, { accessKey: invoice.accessKey }] },
      { $set: invoice },
      { upsert: true }
    );
    return invoice;
  }

  // --- SEED INICIAL ---
  async seedIfEmpty() {
    try {
      const compCount = await this.db.collection('companies').countDocuments();
      if (compCount === 0) {
        console.log('🌱 [DB] Inicializando colecciones con datos de prueba en MongoDB Atlas...');
        await this.db.collection('companies').insertOne({
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
        });
      }

      const userCount = await this.db.collection('users').countDocuments();
      if (userCount === 0) {
        await this.db.collection('users').insertMany([
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
        ]);
        console.log('🌱 [DB] Usuarios y Empresa inicial sembrados con éxito.');
      }
    } catch (err) {
      console.warn('⚠️  [DB] Error en seed inicial:', err.message);
    }
  }
}

module.exports = new MongoRepository();

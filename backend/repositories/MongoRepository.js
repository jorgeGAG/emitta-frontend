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
    const filter = invoice.documentId
      ? { $or: [{ documentId: invoice.documentId }, { id: invoice.id }] }
      : { id: invoice.id };

    await this.db.collection('invoices').updateOne(
      filter,
      { $set: invoice },
      { upsert: true }
    );
    return invoice;
  }

  // --- PRODUCTOS / CATÁLOGO ---
  async getProducts(companyId = null) {
    const filter = companyId ? { $or: [{ companyId }, { isGlobal: true }] } : {};
    return await this.db.collection('products').find(filter).sort({ name: 1 }).toArray();
  }

  async saveProduct(product) {
    const id = product.id || `prod_${Date.now()}`;
    const toSave = { ...product, id, updatedAt: new Date().toISOString() };
    await this.db.collection('products').updateOne(
      { id: toSave.id },
      { $set: toSave },
      { upsert: true }
    );
    return toSave;
  }

  async deleteProduct(productId) {
    await this.db.collection('products').deleteOne({ id: productId });
    return { success: true };
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

      // Asegurar superadmin y usuarios
      const existingSuperadmin = await this.db.collection('users').findOne({ username: 'superadmin' });
      if (!existingSuperadmin) {
        await this.db.collection('users').insertOne({
          id: 'usr_super_01',
          username: 'superadmin',
          password: 'admin123',
          fullName: 'Super Administrador Global',
          email: 'superadmin@emitta.cloud',
          role: 'SUPERADMIN',
          branchCode: '001',
          boxCode: '001',
          branchName: 'Sede Global Multi-Empresa',
          companyId: null, // No ligado a una sola empresa
          createdAt: new Date().toISOString()
        });
        console.log('🌱 [DB] Superadministrador creado (superadmin / admin123)');
      }

      // Asegurar admin de empresa
      const existingAdmin = await this.db.collection('users').findOne({ username: 'admin' });
      if (existingAdmin && existingAdmin.role !== 'ADMIN_EMPRESA') {
        await this.db.collection('users').updateOne(
          { username: 'admin' },
          { $set: { role: 'ADMIN_EMPRESA' } }
        );
      }

      // Asegurar productos iniciales en la base de datos si está vacía
      const prodCount = await this.db.collection('products').countDocuments();
      if (prodCount === 0) {
        await this.db.collection('products').insertMany([
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
        ]);
        console.log('🌱 [DB] Productos iniciales sembrados en MongoDB Atlas.');
      }
    } catch (err) {
      console.warn('⚠️  [DB] Error en seed inicial:', err.message);
    }
  }
}

module.exports = new MongoRepository();

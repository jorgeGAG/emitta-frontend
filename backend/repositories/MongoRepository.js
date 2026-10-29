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
    let active = await this.db.collection('companies').findOne({ isActive: true });
    if (active && active.ruc === '1792345678001') {
      const real = await this.db.collection('companies').findOne({ ruc: '0550249817001' });
      if (real) {
        await this.db.collection('companies').updateMany({}, { $set: { isActive: false } });
        await this.db.collection('companies').updateOne({ _id: real._id }, { $set: { isActive: true } });
        return real;
      }
    }
    if (active) return active;
    const realFallback = await this.db.collection('companies').findOne({ ruc: '0550249817001' });
    if (realFallback) return realFallback;
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
    const filter = companyId
      ? { $or: [{ companyId }, { companyId: { $exists: false } }, { companyId: null }] }
      : {};
    return await this.db.collection('invoices').find(filter).sort({ createdAt: -1 }).toArray();
  }

  async saveInvoice(invoice) {
    const filter = invoice.documentId
      ? { $or: [{ documentId: invoice.documentId }, { id: invoice.id }] }
      : { id: invoice.id };

    const toSave = {
      ...invoice,
      createdAt: invoice.createdAt || new Date().toISOString()
    };

    await this.db.collection('invoices').updateOne(
      filter,
      { $set: toSave },
      { upsert: true }
    );
    return toSave;
  }

  // --- PRODUCTOS / CATÁLOGO ---
  async getProducts(companyId = null) {
    const filter = companyId ? { $or: [{ companyId }, { isGlobal: true }, { companyId: { $exists: false } }, { companyId: null }] } : {};
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
          id: 'comp_jorge_01',
          name: 'Comercio Ecuador (Jorge Gabriel Ante)',
          ruc: '0550249817001',
          legalName: 'ANTE GUANOQUIZA JORGE GABRIEL',
          tradeName: 'Comercio Ecuador (Jorge Ante)',
          mainAddress: 'COTOPAXI, SAQUISILI, SAQUISILI',
          clientId: 'emitta_0f0b2e0c-b6e3-4212-835b-0f7086d32aaa',
          clientSecret: '4JfhIbySCySjQN0hxcaIBY36d29GtaBCQWSOzVRxYKo',
          isActive: true,
          establishments: [
            { code: '001', name: 'Sucursal Saquisili', address: 'COTOPAXI, SAQUISILI, SAQUISILI' }
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
    } catch (err) {
      console.warn('⚠️  [DB] Error en seed inicial:', err.message);
    }
  }
}

module.exports = new MongoRepository();

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
}

module.exports = new MongoRepository();

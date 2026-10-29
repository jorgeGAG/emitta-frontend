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

      // Asegurar catálogo de productos de Tienda de Barrio en la base de datos
      const tiendaProducts = [
        {
          id: 'prod_tb_001',
          sku: 'ARR-001',
          name: 'Arroz Súper Extra Flor 1 kg',
          description: 'Arroz envejecido de grano largo seleccionado (Canasta Básica - IVA 0%)',
          unitPrice: 1.25,
          vatRate: 0,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_002',
          sku: 'ACE-001',
          name: 'Aceite Vegetal La Favorita 1 Litro',
          description: 'Aceite 100% puro de soya y palma con vitamina A (IVA 15%)',
          unitPrice: 2.50,
          vatRate: 15,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_003',
          sku: 'LEC-001',
          name: 'Leche Entera Pasteurizada Vita 1 Litro',
          description: 'Funda de leche entera ultrapasteurizada (Canasta Básica - IVA 0%)',
          unitPrice: 1.00,
          vatRate: 0,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_004',
          sku: 'HUE-001',
          name: 'Cubeta de Huevos Frescos (30 unidades)',
          description: 'Huevos de granja tamaño mediano clase A (Canasta Básica - IVA 0%)',
          unitPrice: 3.80,
          vatRate: 0,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_005',
          sku: 'PAN-001',
          name: 'Pan de Agua Tradicional (Funda x 10 unidades)',
          description: 'Pan artesanal fresco del día (Canasta Básica - IVA 0%)',
          unitPrice: 1.50,
          vatRate: 0,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_006',
          sku: 'AZU-001',
          name: 'Azúcar Blanca San Carlos 1 kg',
          description: 'Azúcar refinada de caña 1000g (Canasta Básica - IVA 0%)',
          unitPrice: 1.10,
          vatRate: 0,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_007',
          sku: 'ATU-001',
          name: 'Lomitos de Atún Real en Aceite 140g',
          description: 'Conserva de lomo de atún en aceite vegetal (IVA 0%)',
          unitPrice: 1.65,
          vatRate: 0,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_008',
          sku: 'FID-001',
          name: 'Fideos Spaghetti Cayambe 400g',
          description: 'Pasta de sémola de trigo fortificada (Canasta Básica - IVA 0%)',
          unitPrice: 0.85,
          vatRate: 0,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_009',
          sku: 'GAS-001',
          name: 'Gaseosa Coca-Cola Original 3 Litros',
          description: 'Bebida gaseosa sabor cola botella no retornable (IVA 15%)',
          unitPrice: 3.00,
          vatRate: 15,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_010',
          sku: 'AGU-001',
          name: 'Agua Mineral sin Gas Dasani 1.5 Litros',
          description: 'Agua purificada de mesa tratada (IVA 15%)',
          unitPrice: 0.80,
          vatRate: 15,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_011',
          sku: 'DET-001',
          name: 'Detergente en Polvo Deja Multiusos 1 kg',
          description: 'Detergente con partículas blanqueadoras y aroma floral (IVA 15%)',
          unitPrice: 2.60,
          vatRate: 15,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_012',
          sku: 'JAB-001',
          name: 'Jabón de Tocador Protex Antibacterial 110g',
          description: 'Jabón antibacterial con óleo de linaza (IVA 15%)',
          unitPrice: 1.15,
          vatRate: 15,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_013',
          sku: 'PAP-001',
          name: 'Papas Fritas Ruffles Onduladas 120g',
          description: 'Snack de papas naturales con sal marina (IVA 15%)',
          unitPrice: 1.35,
          vatRate: 15,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_014',
          sku: 'GAL-001',
          name: 'Galletas Rellenas Amor Vainilla 150g',
          description: 'Wafer relleno de crema sabor vainilla Nestlé (IVA 15%)',
          unitPrice: 0.75,
          vatRate: 15,
          isGlobal: true,
          companyId: 'comp_default_01'
        },
        {
          id: 'prod_tb_015',
          sku: 'CAF-001',
          name: 'Café Soluble Buen Día Clásico 50g',
          description: 'Café liofilizado 100% colombiano (IVA 15%)',
          unitPrice: 1.90,
          vatRate: 15,
          isGlobal: true,
          companyId: 'comp_default_01'
        }
      ];

      // Eliminar productos antiguos de demostración de software si existen
      await this.db.collection('products').deleteMany({
        $or: [
          { sku: { $regex: '^PROD-0[1-9]' } },
          { name: { $regex: 'Consultoría|Software|Mantenimiento|Hardware|Capacitación', $options: 'i' } }
        ]
      });

      // Sembrar o actualizar productos reales de Tienda de Barrio
      for (const prod of tiendaProducts) {
        await this.db.collection('products').updateOne(
          { id: prod.id },
          { $set: { ...prod, updatedAt: new Date().toISOString() } },
          { upsert: true }
        );
      }
      console.log('🛒 [DB] Catálogo de Tienda de Barrio sincronizado en MongoDB Atlas (15 productos).');
    } catch (err) {
      console.warn('⚠️  [DB] Error en seed inicial:', err.message);
    }
  }
}

module.exports = new MongoRepository();

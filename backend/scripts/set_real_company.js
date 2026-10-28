const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://jorgeante08_db_user:uf3LPyg9mg9wVBJs@cluster0.hhfosdd.mongodb.net/emitta_pos?retryWrites=true&w=majority';

async function run() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db();

  const realCompany = {
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
    updatedAt: new Date().toISOString()
  };

  // 1. Desactivar empresas demo
  await db.collection('companies').updateMany({}, { $set: { isActive: false } });

  // 2. Guardar o actualizar la empresa real de Jorge Ante
  await db.collection('companies').updateOne(
    { ruc: realCompany.ruc },
    { $set: realCompany },
    { upsert: true }
  );

  // 3. Asociar los usuarios a esta empresa
  await db.collection('users').updateMany(
    { role: { $ne: 'SUPERADMIN' } },
    { $set: { companyId: 'comp_jorge_01', branchName: 'Sucursal Saquisili · Cotopaxi' } }
  );

  // 4. Asociar productos a esta empresa
  await db.collection('products').updateMany(
    {},
    { $set: { companyId: 'comp_jorge_01' } }
  );

  console.log('✅ Empresa real de JORGE GABRIEL ANTE (0550249817001) configurada como ACTIVA en MongoDB Atlas.');
  await client.close();
}

run().catch(console.error);

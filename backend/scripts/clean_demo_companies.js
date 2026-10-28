const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://jorgeante08_db_user:uf3LPyg9mg9wVBJs@cluster0.hhfosdd.mongodb.net/emitta_pos?retryWrites=true&w=majority';

async function cleanup() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db();

  // 1. Eliminar la empresa ficticia que tenía las credenciales repetidas
  const delRes = await db.collection('companies').deleteMany({ id: 'comp_default_01' });
  console.log('Empresas ficticias eliminadas:', delRes.deletedCount);

  // 2. Dejar Comercio Ecuador como la única empresa activa
  await db.collection('companies').updateOne(
    { id: 'comp_jorge_01' },
    { $set: { isActive: true } }
  );

  const list = await db.collection('companies').find({}).toArray();
  console.log('Empresas reales en MongoDB Atlas:');
  console.log(list.map(c => ({ id: c.id, ruc: c.ruc, name: c.tradeName || c.name, isActive: c.isActive })));

  await client.close();
}

cleanup().catch(console.error);

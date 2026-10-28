const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://jorgeante08_db_user:uf3LPyg9mg9wVBJs@cluster0.hhfosdd.mongodb.net/emitta_pos?retryWrites=true&w=majority';

async function fixInvoices() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db();

  const invoices = await db.collection('invoices').find({}).toArray();
  for (const inv of invoices) {
    const ruc = (inv.accessKey && inv.accessKey.length === 49) ? inv.accessKey.substring(10, 23) : '0550249817001';
    await db.collection('invoices').updateOne(
      { _id: inv._id },
      { $set: { companyId: 'comp_jorge_01', issuerRuc: ruc } }
    );
  }

  const updated = await db.collection('invoices').find({}).toArray();
  console.log('Facturas actualizadas en MongoDB Atlas:');
  console.log(updated.map(i => ({
    num: i.invoiceNumber,
    companyId: i.companyId,
    issuerRuc: i.issuerRuc,
    total: i.total,
    status: i.status
  })));

  await client.close();
}

fixInvoices().catch(console.error);

/**
 * Configuración de Base de Datos (MongoDB Atlas + Fallback Local)
 * Permite conectar a MongoDB Atlas mediante la variable MONGODB_URI.
 * Si no está configurada, activa el modo JSON File Storage automático.
 */

const dns = require('dns');
if (process.platform === 'win32' && !process.env.WEBSITE_SITE_NAME) {
  try {
    // Configurar DNS públicos solo en desarrollo Windows si es necesario
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {}
}

let mongoClient = null;
let mongoDb = null;
let isConnectedToMongo = false;
let lastMongoError = null;

async function connectToMongo() {
  if (isConnectedToMongo) return true;

  const uri = process.env.MONGODB_URI || 'mongodb+srv://jorgeante08_db_user:uf3LPyg9mg9wVBJs@cluster0.hhfosdd.mongodb.net/emitta_pos?retryWrites=true&w=majority';

  if (!uri) {
    lastMongoError = 'Variable MONGODB_URI no configurada';
    return false;
  }

  try {
    const { MongoClient } = require('mongodb');
    console.log('🔄 [DB] Conectando a MongoDB Atlas...');
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000
    });
    await client.connect();
    mongoClient = client;
    mongoDb = client.db();
    isConnectedToMongo = true;
    lastMongoError = null;
    console.log('✅ [DB] ¡Conexión exitosa a MongoDB Atlas!');

    try {
      const mongoRepo = require('../repositories/MongoRepository');
      await mongoRepo.seedIfEmpty();
    } catch {}

    return true;
  } catch (error) {
    lastMongoError = error.message;
    console.warn('⚠️  [DB] Error conectando a MongoDB Atlas:', error.message);
    isConnectedToMongo = false;
    return false;
  }
}

async function initDatabase() {
  await connectToMongo();

  // Si falló en el arranque en frío (cold start), reintentar en segundo plano periódicamente
  if (!isConnectedToMongo) {
    const timer = setInterval(async () => {
      if (isConnectedToMongo) {
        clearInterval(timer);
      } else {
        await connectToMongo();
      }
    }, 8000);
    if (timer.unref) timer.unref();
  }

  return { isConnected: isConnectedToMongo, db: mongoDb };
}

function getDatabase() {
  return mongoDb;
}

function isMongoConnected() {
  return isConnectedToMongo;
}

function getLastMongoError() {
  return lastMongoError;
}

module.exports = {
  initDatabase,
  getDatabase,
  isMongoConnected,
  getLastMongoError
};

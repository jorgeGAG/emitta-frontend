/**
 * Configuración de Base de Datos (MongoDB Atlas + Fallback Local)
 * Permite conectar a MongoDB Atlas mediante la variable MONGODB_URI.
 * Si no está configurada, activa el modo JSON File Storage automático.
 */

let mongoClient = null;
let mongoDb = null;
let isConnectedToMongo = false;

async function initDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.log('ℹ️  [DB] Variable MONGODB_URI no detectada. Operando con Repositorio Local JSON.');
    return { isConnected: false, db: null };
  }

  try {
    const { MongoClient } = require('mongodb');
    console.log('🔄 [DB] Conectando a MongoDB Atlas...');
    mongoClient = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db();
    isConnectedToMongo = true;
    console.log('✅ [DB] ¡Conexión exitosa a MongoDB Atlas!');
    return { isConnected: true, db: mongoDb };
  } catch (error) {
    console.warn('⚠️  [DB] Error conectando a MongoDB Atlas:', error.message);
    console.log('ℹ️  [DB] Activando Repositorio Local JSON como contingencia.');
    isConnectedToMongo = false;
    return { isConnected: false, db: null };
  }
}

function getDatabase() {
  return mongoDb;
}

function isMongoConnected() {
  return isConnectedToMongo;
}

module.exports = {
  initDatabase,
  getDatabase,
  isMongoConnected
};

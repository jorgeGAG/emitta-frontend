/**
 * Configuración de Base de Datos (MongoDB Atlas + Fallback Local)
 * Permite conectar a MongoDB Atlas mediante la variable MONGODB_URI.
 * Si no está configurada, activa el modo JSON File Storage automático.
 */

const dns = require('dns');
try {
  // Configurar DNS públicos para resolver registros SRV de MongoDB Atlas en Windows/ISPs
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

let mongoClient = null;
let mongoDb = null;
let isConnectedToMongo = false;

async function initDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://jorgeante08_db_user:uf3LPyg9mg9wVBJs@cluster0.hhfosdd.mongodb.net/emitta_pos?retryWrites=true&w=majority';

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
    
    // Sembrar datos iniciales si las colecciones están vacías
    try {
      const mongoRepo = require('../repositories/MongoRepository');
      await mongoRepo.seedIfEmpty();
    } catch {}

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

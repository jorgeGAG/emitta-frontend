const crypto = require('crypto');

/**
 * Hashea una contraseña usando scrypt nativo con salt criptográfico de 16 bytes.
 * Formato seguro: scrypt:<salt_hex>:<hash_hex>
 */
function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Contraseña inválida para encriptar.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

/**
 * Verifica una contraseña contra el valor almacenado en la base de datos.
 * Utiliza comparación de tiempo constante (timingSafeEqual) para mitigar ataques de temporización.
 */
function verifyPassword(plainPassword, storedPassword) {
  if (!plainPassword || !storedPassword) return false;

  if (storedPassword.startsWith('scrypt:')) {
    const parts = storedPassword.split(':');
    if (parts.length !== 3) return false;
    const [, salt, hash] = parts;
    try {
      const derivedHash = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
      const hashBuf = Buffer.from(hash, 'hex');
      const derivedBuf = Buffer.from(derivedHash, 'hex');
      if (hashBuf.length !== derivedBuf.length) return false;
      return crypto.timingSafeEqual(hashBuf, derivedBuf);
    } catch {
      return false;
    }
  }

  // Fallback seguro temporal para contraseñas antiguas aún no migradas
  return plainPassword === storedPassword;
}

/**
 * Indica si la contraseña almacenada está en texto plano y necesita migración automática a hash
 */
function needsRehash(storedPassword) {
  return !storedPassword || !storedPassword.startsWith('scrypt:');
}

module.exports = {
  hashPassword,
  verifyPassword,
  needsRehash
};

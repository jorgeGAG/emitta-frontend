const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'emitta_pos_secret_key_2026_jwt_token_secure_hs256';
const JWT_EXPIRES_IN_SECONDS = 24 * 60 * 60; // 24 horas

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

/**
 * Genera un token JWT (HS256) estándar compatible con RFC 7519
 */
function signJwt(payload, expiresIn = JWT_EXPIRES_IN_SECONDS) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresIn
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Valida y decodifica un token JWT (HS256)
 */
function verifyJwt(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token no proporcionado' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Formato de token JWT inválido' };
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Firma criptográfica de token inválida' };
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token JWT expirado', expired: true };
    }
    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: 'Error decodificando payload de token' };
  }
}

module.exports = {
  signJwt,
  verifyJwt,
  JWT_EXPIRES_IN_SECONDS
};

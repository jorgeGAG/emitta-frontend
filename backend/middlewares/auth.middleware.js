/**
 * Middleware de Validación de Autenticación
 * Se ejecuta antes de procesar el inicio de sesión para asegurar que los datos
 * cumplan con las reglas de negocio (correo válido y contraseña >= 6 caracteres).
 */
function validateLoginPayload(body) {
  const email = (body?.email || body?.username || '').trim();
  const password = body?.password || '';

  if (!email) {
    return { valid: false, error: 'El correo electrónico es obligatorio.' };
  }

  // Validación estricta de formato RFC 5322 simplificado
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Debes ingresar un correo electrónico válido (ej: usuario@mitienda.com).' };
  }

  if (!password) {
    return { valid: false, error: 'La contraseña es obligatoria.' };
  }

  if (password.length < 6) {
    return { valid: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  return { valid: true, cleanEmail: email.toLowerCase(), password };
}

module.exports = {
  validateLoginPayload
};

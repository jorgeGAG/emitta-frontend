const repoFactory = require('../repositories/RepositoryFactory');
const { signJwt, verifyJwt } = require('../config/jwt');
const { hashPassword, verifyPassword, needsRehash } = require('../config/password');

class AuthService {
  async login(identifier, password) {
    if (!identifier || !password) {
      return { success: false, error: 'Correo electrónico y contraseña requeridos.' };
    }

    const cleanIdentifier = identifier.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanIdentifier)) {
      return { success: false, error: 'Por favor ingresa un correo electrónico válido (ej: usuario@mitienda.com).' };
    }

    if (password.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
    }

    const user = await repoFactory.repository.findUser(cleanIdentifier);
    if (!user) {
      return { success: false, error: 'No existe ningún usuario registrado con este correo.' };
    }

    // Validación de contraseña encriptada (scrypt) o migración
    const isPasswordValid = verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: 'Contraseña incorrecta.' };
    }

    // Si la contraseña almacenada estaba en texto plano, encriptarla automáticamente en la base de datos
    if (needsRehash(user.password)) {
      try {
        user.password = hashPassword(password);
        await repoFactory.repository.saveUser(user);
        console.log(`🔒 [AUTH] Contraseña de ${user.email || user.username} migrada a hash scrypt en la base de datos.`);
      } catch (err) {
        console.warn('⚠️ No se pudo migrar el hash de contraseña:', err.message);
      }
    }

    // Usuario sanitizado para la sesión
    const safeUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email || cleanIdentifier,
      role: user.role,
      branchCode: user.branchCode || '001',
      boxCode: user.boxCode || '001',
      branchName: user.branchName || 'Sucursal Matriz',
      companyId: user.companyId
    };

    // Generar Token JWT Oficial para el Cajero / Usuario
    const tokenPayload = {
      sub: safeUser.id,
      username: safeUser.username,
      fullName: safeUser.fullName,
      email: safeUser.email,
      role: safeUser.role,
      branchCode: safeUser.branchCode,
      boxCode: safeUser.boxCode,
      companyId: safeUser.companyId
    };

    const token = signJwt(tokenPayload);

    // Si el usuario es de una empresa específica (no superadmin), activar automáticamente su empresa
    let userCompany = null;
    if (user.companyId) {
      try {
        const companyService = require('./company.service');
        userCompany = await companyService.setActiveCompany(user.companyId);
      } catch (err) {
        console.warn('⚠️ No se pudo conmutar la empresa del usuario:', err.message);
      }
    }

    return {
      success: true,
      token,
      tokenType: 'Bearer',
      expiresIn: 86400,
      user: safeUser,
      activeCompany: userCompany
    };
  }

  verifyToken(token) {
    return verifyJwt(token);
  }

  async getUsers(companyId = null) {
    const users = await repoFactory.repository.getUsers(companyId);
    return users.map(u => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      branchCode: u.branchCode,
      boxCode: u.boxCode,
      branchName: u.branchName,
      companyId: u.companyId
    }));
  }

  async createUser(userData) {
    if (!userData.email || !userData.password) {
      throw new Error('Correo electrónico y contraseña son obligatorios.');
    }

    const cleanEmail = userData.email.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(cleanEmail)) {
      throw new Error('Por favor ingresa un correo electrónico válido.');
    }

    if (userData.password.length < 6) {
      throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const username = userData.username ? userData.username.trim().toLowerCase() : cleanEmail.split('@')[0];
    const existing = await repoFactory.repository.findUser(cleanEmail);
    if (existing) {
      throw new Error(`El usuario con correo ${cleanEmail} ya existe.`);
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      username: username,
      password: hashPassword(userData.password), // Encriptación scrypt nativa
      fullName: userData.fullName || username,
      email: cleanEmail,
      role: userData.role || 'CAJERO',
      branchCode: userData.branchCode || '001',
      boxCode: userData.boxCode || '001',
      branchName: userData.branchName || 'Sucursal Matriz',
      companyId: userData.companyId || null,
      createdAt: new Date().toISOString()
    };

    await repoFactory.repository.saveUser(newUser);
    return newUser;
  }
}

module.exports = new AuthService();

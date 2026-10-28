const repoFactory = require('../repositories/RepositoryFactory');
const { signJwt, verifyJwt } = require('../config/jwt');

class AuthService {
  async login(username, password) {
    if (!username || !password) {
      return { success: false, error: 'Usuario y contraseña requeridos.' };
    }

    const user = await repoFactory.repository.findUser(username);
    if (!user) {
      return { success: false, error: 'Usuario no registrado en el sistema.' };
    }

    // Validación de contraseña
    if (user.password !== password) {
      return { success: false, error: 'Contraseña incorrecta.' };
    }

    // Usuario sanitizado para la sesión
    const safeUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
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
    if (!userData.username || !userData.password) {
      throw new Error('Nombre de usuario y contraseña son obligatorios.');
    }

    const existing = await repoFactory.repository.findUser(userData.username);
    if (existing) {
      throw new Error(`El usuario ${userData.username} ya existe.`);
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      username: userData.username.trim().toLowerCase(),
      password: userData.password,
      fullName: userData.fullName || userData.username,
      email: userData.email || '',
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

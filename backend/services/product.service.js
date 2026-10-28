const repoFactory = require('../repositories/RepositoryFactory');

class ProductService {
  async getProducts(companyId = null) {
    return await repoFactory.repository.getProducts(companyId);
  }

  async saveProduct(productData) {
    if (!productData.name || productData.unitPrice === undefined) {
      throw new Error('Nombre y precio del producto requeridos.');
    }

    const record = {
      id: productData.id || `prod_${Date.now()}`,
      sku: productData.sku || `SKU-${Date.now().toString().slice(-4)}`,
      name: productData.name.trim(),
      description: productData.description || '',
      unitPrice: Number(productData.unitPrice) || 0,
      vatRate: Number(productData.vatRate) !== undefined ? Number(productData.vatRate) : 15,
      companyId: productData.companyId || null,
      isGlobal: !!productData.isGlobal,
      createdAt: productData.createdAt || new Date().toISOString()
    };

    return await repoFactory.repository.saveProduct(record);
  }

  async deleteProduct(productId) {
    if (!productId) {
      throw new Error('ID de producto requerido.');
    }
    return await repoFactory.repository.deleteProduct(productId);
  }
}

module.exports = new ProductService();

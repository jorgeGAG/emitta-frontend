const repoFactory = require('../repositories/RepositoryFactory');
const companyService = require('./company.service');

class InvoiceService {
  async getInvoices(companyId = null) {
    return await repoFactory.repository.getInvoices(companyId);
  }

  async saveInvoice(invoiceData) {
    if (!invoiceData.invoiceNumber && !invoiceData.documentId) {
      throw new Error('Datos de factura incompletos.');
    }

    // Si no viene companyId, asociar automáticamente la empresa activa actual
    let companyId = invoiceData.companyId || null;
    let issuerRuc = invoiceData.issuerRuc || null;
    if (!companyId) {
      try {
        const activeComp = await companyService.getActiveCompany();
        if (activeComp) {
          companyId = activeComp.id || activeComp.companyId;
          issuerRuc = activeComp.ruc;
        }
      } catch {}
    }

    // Extraer RUC emisor de la Clave de Acceso SRI si está disponible (dígitos 11 al 23)
    if (!issuerRuc && invoiceData.accessKey && invoiceData.accessKey.length === 49) {
      issuerRuc = invoiceData.accessKey.substring(10, 23);
    }

    const record = {
      id: invoiceData.id || (invoiceData.documentId ? `inv_${invoiceData.documentId}` : `inv_${Date.now()}`),
      companyId: companyId,
      issuerRuc: issuerRuc,
      documentId: invoiceData.documentId,
      invoiceNumber: invoiceData.invoiceNumber, // ej: 001-001-000000123
      buyerRuc: invoiceData.buyerRuc || '9999999999999',
      buyerName: invoiceData.buyerName || 'CONSUMIDOR FINAL',
      total: Number(invoiceData.total) || 0,
      taxAmount: Number(invoiceData.taxAmount) || 0,
      status: invoiceData.status || 'AUTHORIZED',
      accessKey: invoiceData.accessKey || '',
      authorizationDate: invoiceData.authorizationDate || new Date().toISOString(),
      itemsCount: Array.isArray(invoiceData.items) ? invoiceData.items.length : (invoiceData.itemsCount || 1),
      issuedBy: invoiceData.issuedBy || 'Cajero',
      createdAt: invoiceData.createdAt || new Date().toISOString()
    };

    return await repoFactory.repository.saveInvoice(record);
  }
}

module.exports = new InvoiceService();

const repoFactory = require('../repositories/RepositoryFactory');

class InvoiceService {
  async getInvoices(companyId = null) {
    return await repoFactory.repository.getInvoices(companyId);
  }

  async saveInvoice(invoiceData) {
    if (!invoiceData.invoiceNumber && !invoiceData.documentId) {
      throw new Error('Datos de factura incompletos.');
    }

    const record = {
      id: invoiceData.id || (invoiceData.documentId ? `inv_${invoiceData.documentId}` : `inv_${Date.now()}`),
      companyId: invoiceData.companyId || null,
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

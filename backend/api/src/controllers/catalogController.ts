import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { CatalogService } from '../services/catalogService';
import { broadcastStockUpdated } from '../services/socket';

export class CatalogController {
  // Search Products / Variants
  static async getProducts(req: Request, res: Response) {
    try {
      const { query, warehouseId } = req.query;
      const products = await CatalogService.searchVariants(
        query as string,
        (warehouseId as string) || 'WH-ACC-01'
      );
      res.json({ success: true, data: products });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Get Tax Rates
  static async getTaxes(req: Request, res: Response) {
    try {
      const taxes = await CatalogService.getTaxRates();
      res.json({ success: true, data: taxes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Get Currencies
  static async getCurrencies(req: Request, res: Response) {
    try {
      const currencies = await CatalogService.getCurrencies();
      res.json({ success: true, data: currencies });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  // Create Product / Stock Intake
  static async createProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const { productName, variantName, sku, barcode, costPrice, sellingPrice, initialStock, categoryName, warehouseId } = req.body;
      if (!productName || !sku || sellingPrice === undefined) {
        return res.status(400).json({ success: false, error: 'Product name, SKU, and selling price are required.' });
      }

      const result = await CatalogService.createProduct({
        productName,
        variantName,
        sku,
        barcode,
        costPrice: Number(costPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        initialStock: Number(initialStock) || 0,
        categoryName,
        warehouseId: warehouseId || 'WH-ACC-01',
        organizationId: req.user?.organizationId
      });

      broadcastStockUpdated(result);

      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Adjust Inventory Stock
  static async adjustStock(req: AuthenticatedRequest, res: Response) {
    try {
      const { variantId, warehouseId, quantityChange, type, notes } = req.body;
      const result = await CatalogService.adjustStock(variantId, warehouseId, quantityChange, type, notes);
      
      broadcastStockUpdated(result);

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  // Update Product Details & Promotional Discount Rules
  static async updateProduct(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const result = await CatalogService.updateProduct(id, req.body);
      
      broadcastStockUpdated(result);

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}
